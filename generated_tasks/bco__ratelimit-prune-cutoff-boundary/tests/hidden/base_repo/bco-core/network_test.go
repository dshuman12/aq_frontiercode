package main

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	libp2pcrypto "github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	mocknet "github.com/libp2p/go-libp2p/p2p/net/mock"
	"github.com/libp2p/go-msgio"
	ma "github.com/multiformats/go-multiaddr"
)

type stubConnMultiaddrs struct {
	local, remote ma.Multiaddr
}

func (s stubConnMultiaddrs) LocalMultiaddr() ma.Multiaddr  { return s.local }
func (s stubConnMultiaddrs) RemoteMultiaddr() ma.Multiaddr { return s.remote }

func mustMultiaddr(t *testing.T, s string) ma.Multiaddr {
	t.Helper()
	m, err := ma.NewMultiaddr(s)
	if err != nil {
		t.Fatalf("NewMultiaddr(%q): %v", s, err)
	}
	return m
}

func TestRemoteIPString(t *testing.T) {
	tests := []struct {
		name string
		m    ma.Multiaddr
		want string
	}{
		{"nil", nil, ""},
		{"non_ip_tcp", mustMultiaddr(t, "/tcp/4001"), ""},
		{"non_ip_dns", mustMultiaddr(t, "/dns4/example.com/tcp/443"), ""},
		{"ipv4", mustMultiaddr(t, "/ip4/192.0.2.1/tcp/4001"), "192.0.2.1"},
		{"ipv6", mustMultiaddr(t, "/ip6/2001:db8::1/tcp/4001"), "2001:db8::1"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := remoteIPString(tt.m); got != tt.want {
				t.Fatalf("remoteIPString() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestNetwork_WithLocalStatePiggybacksMissingState(t *testing.T) {
	eng := NewBCOEngine(DeviceState{
		DeviceID:      "QmLocal",
		DeviceName:    "Phone",
		AudioPriority: AudioPriorityMedia,
		Seq:           7,
	}, "inst", nil, nil, "", DefaultNetworkSettings())
	n := &BCONetwork{engine: eng}
	msg := &BCOMessage{
		Type:       MsgSettingsSync,
		SenderID:   "QmLocal",
		InstanceID: "inst",
		Seq:        8,
	}

	got := n.withLocalState(msg)
	if got == msg {
		t.Fatal("withLocalState should clone the message")
	}
	if got.State == nil {
		t.Fatal("expected piggybacked state")
	}
	if got.State.DeviceID != "QmLocal" || got.State.DeviceName != "Phone" || got.State.AudioPriority != AudioPriorityMedia {
		t.Fatalf("unexpected piggybacked state: %+v", got.State)
	}
	if msg.State != nil {
		t.Fatal("original message should remain unmodified")
	}
}

func TestBcoConnGater_InterceptDialAlwaysAllows(t *testing.T) {
	g := &bcoConnGater{ip: newInboundIPRateLimiter()}
	pid := peer.ID("test-peer")
	if !g.InterceptPeerDial(pid) {
		t.Fatal("InterceptPeerDial should allow")
	}
	if !g.InterceptAddrDial(pid, mustMultiaddr(t, "/ip4/127.0.0.1/tcp/1")) {
		t.Fatal("InterceptAddrDial should allow")
	}
}

func TestBcoConnGater_InterceptAccept_nilLimiterAllows(t *testing.T) {
	g := &bcoConnGater{ip: nil}
	c := stubConnMultiaddrs{remote: mustMultiaddr(t, "/ip4/198.51.100.2/tcp/9")}
	if !g.InterceptAccept(c) {
		t.Fatal("nil limiter should allow any remote")
	}
}

func TestBcoConnGater_InterceptAccept_emptyRemoteIPAlwaysAllowsWithLimiter(t *testing.T) {
	ipRL := newInboundIPRateLimiter()
	g := &bcoConnGater{ip: ipRL}
	// remoteIPString(nil) and non-IP multiaddrs yield ""; allow("") is always true.
	for i := 0; i < 10; i++ {
		if !g.InterceptAccept(stubConnMultiaddrs{remote: nil}) {
			t.Fatalf("nil RemoteMultiaddr: want allow at %d", i)
		}
	}
	for i := 0; i < 10; i++ {
		if !g.InterceptAccept(stubConnMultiaddrs{remote: mustMultiaddr(t, "/tcp/5555")}) {
			t.Fatalf("non-IP multiaddr: want allow at %d", i)
		}
	}
}

func TestBcoConnGater_InterceptAccept_rateLimitPerIP(t *testing.T) {
	ipRL := newInboundIPRateLimiter()
	g := &bcoConnGater{ip: ipRL}
	m1 := mustMultiaddr(t, "/ip4/203.0.113.7/tcp/4001")
	m2 := mustMultiaddr(t, "/ip4/203.0.113.8/tcp/4001")
	c1 := stubConnMultiaddrs{remote: m1}
	c2 := stubConnMultiaddrs{remote: m2}

	for i := 0; i < 5; i++ {
		if !g.InterceptAccept(c1) {
			t.Fatalf("want allow accepts 1–5, got deny at %d", i+1)
		}
	}
	if g.InterceptAccept(c1) {
		t.Fatal("6th inbound from same IP in same minute should deny")
	}
	if !g.InterceptAccept(c2) {
		t.Fatal("different source IP should still be allowed")
	}
}

func TestBcoConnGater_InterceptSecuredAndUpgraded(t *testing.T) {
	g := &bcoConnGater{}
	if !g.InterceptSecured(network.DirInbound, peer.ID("x"), stubConnMultiaddrs{}) {
		t.Fatal("InterceptSecured should allow")
	}
	var c network.Conn
	ok, reason := g.InterceptUpgraded(c)
	if !ok || reason != 0 {
		t.Fatalf("InterceptUpgraded = (%v, %v), want (true, 0)", ok, reason)
	}
}

func TestWriteBCOFrame(t *testing.T) {
	t.Run("nil_message", func(t *testing.T) {
		var buf bytes.Buffer
		w := msgio.NewWriter(&buf)
		if err := writeBCOFrame(w, nil); err == nil {
			t.Fatal("expected error for nil message")
		}
	})
	t.Run("exceeds_max_bytes", func(t *testing.T) {
		pad := strings.Repeat("z", maxBCOMsgBytes)
		msg := &BCOMessage{
			Type:       MsgStateUpdate,
			SenderID:   "a",
			InstanceID: "b",
			Seq:        1,
			State: &DeviceState{
				DeviceID:      "d",
				DeviceName:    pad,
				AudioPriority: AudioPriorityIdle,
				Seq:           1,
				Platform:      "t",
			},
		}
		var buf bytes.Buffer
		w := msgio.NewWriter(&buf)
		if err := writeBCOFrame(w, msg); err == nil {
			t.Fatal("expected error when JSON exceeds maxBCOMsgBytes")
		}
	})
	t.Run("round_trip", func(t *testing.T) {
		msg := &BCOMessage{Type: MsgBCOHello, SenderID: "s", InstanceID: "i", Seq: 3}
		var buf bytes.Buffer
		w := msgio.NewWriter(&buf)
		if err := writeBCOFrame(w, msg); err != nil {
			t.Fatal(err)
		}
		r := msgio.NewReaderSize(&buf, maxBCOMsgBytes)
		got, err := readBCOFrame(r)
		if err != nil {
			t.Fatal(err)
		}
		if got.Type != msg.Type || got.SenderID != msg.SenderID || got.InstanceID != msg.InstanceID || got.Seq != msg.Seq {
			t.Fatalf("readBCOFrame = %+v, want %+v", got, msg)
		}
	})
}

func TestReadBCOFrame_errors(t *testing.T) {
	t.Run("eof", func(t *testing.T) {
		r := msgio.NewReaderSize(bytes.NewReader(nil), maxBCOMsgBytes)
		if _, err := readBCOFrame(r); err == nil {
			t.Fatal("expected error on empty reader")
		}
	})
	t.Run("msg_too_large", func(t *testing.T) {
		var buf bytes.Buffer
		w := msgio.NewWriter(&buf)
		big := make([]byte, maxBCOMsgBytes+1)
		if err := w.WriteMsg(big); err != nil {
			t.Fatal(err)
		}
		r := msgio.NewReaderSize(&buf, maxBCOMsgBytes)
		_, err := readBCOFrame(r)
		if err != msgio.ErrMsgTooLarge {
			t.Fatalf("readBCOFrame: %v, want %v", err, msgio.ErrMsgTooLarge)
		}
	})
	t.Run("invalid_json", func(t *testing.T) {
		var buf bytes.Buffer
		w := msgio.NewWriter(&buf)
		if err := w.WriteMsg([]byte(`{not json`)); err != nil {
			t.Fatal(err)
		}
		r := msgio.NewReaderSize(&buf, maxBCOMsgBytes)
		if _, err := readBCOFrame(r); err == nil {
			t.Fatal("expected unmarshal error")
		}
	})
}

func TestNetwork_MocknetHelloThenStateExchange(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	mn := mocknet.New()
	h1, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	h2, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	if err := mn.LinkAll(); err != nil {
		t.Fatal(err)
	}

	d1 := t.TempDir()
	d2 := t.TempDir()
	eng1, net1, err := startEngineWithHost(ctx, h1, "alpha", d1, true, false)
	if err != nil {
		t.Fatal(err)
	}
	eng2, net2, err := startEngineWithHost(ctx, h2, "beta", d2, true, false)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = net1.Close(); _ = net2.Close() }()

	eng1.allowlist.Add(h2.ID(), "beta")
	eng2.allowlist.Add(h1.ID(), "alpha")

	if err := h1.Connect(ctx, peer.AddrInfo{ID: h2.ID(), Addrs: h2.Addrs()}); err != nil {
		t.Fatal(err)
	}

	if err := net1.openOutboundStream(ctx, h2.ID()); err != nil {
		t.Fatal(err)
	}

	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		eng2.mu.Lock()
		n := len(eng2.peers)
		eng2.mu.Unlock()
		if n >= 1 {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}

	eng2.mu.Lock()
	_, ok := eng2.peers[h1.ID().String()]
	eng2.mu.Unlock()
	if !ok {
		t.Fatal("expected peer state on eng2 after outbound hello + join/state")
	}

	p := AudioPriorityActiveCall
	eng1.mu.Lock()
	eng1.local.AudioPriority = p
	eng1.local.Seq++
	st := eng1.local
	inst := eng1.instanceID
	seq := eng1.local.Seq
	eng1.mu.Unlock()
	msg := &BCOMessage{
		Type:       MsgStateUpdate,
		SenderID:   st.DeviceID,
		InstanceID: inst,
		Seq:        seq,
		State:      cloneDeviceState(&st.DeviceState),
	}
	net1.Broadcast(msg)

	deadline = time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		eng2.mu.Lock()
		ps, has := eng2.peers[h1.ID().String()]
		eng2.mu.Unlock()
		if has && ps.AudioPriority == AudioPriorityActiveCall {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("expected STATE_UPDATE to reach eng2 with updated priority")
}

// US3: no mDNS — only explicit multiaddr dial (BCOConnectPeer / ConnectPeer) establishes the session.
func TestNetwork_ManualConnectWithoutDiscovery(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	mn := mocknet.New()
	h1, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	h2, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	if err := mn.LinkAll(); err != nil {
		t.Fatal(err)
	}

	d1 := t.TempDir()
	d2 := t.TempDir()
	eng1, net1, err := startEngineWithHost(ctx, h1, "alpha", d1, true, false)
	if err != nil {
		t.Fatal(err)
	}
	eng2, net2, err := startEngineWithHost(ctx, h2, "beta", d2, true, false)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = net1.Close(); _ = net2.Close() }()

	eng1.allowlist.Add(h2.ID(), "beta")
	eng2.allowlist.Add(h1.ID(), "alpha")

	addr2 := dialableP2PMultiaddr(t, h2)
	if err := net1.ConnectPeer(ctx, addr2); err != nil {
		t.Fatalf("ConnectPeer: %v", err)
	}

	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		eng2.mu.Lock()
		n := len(eng2.peers)
		eng2.mu.Unlock()
		if n >= 1 {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}

	eng2.mu.Lock()
	_, ok := eng2.peers[h1.ID().String()]
	eng2.mu.Unlock()
	if !ok {
		t.Fatal("expected peer state on eng2 after manual ConnectPeer (HELLO + join/state)")
	}

	p := AudioPriorityActiveCall
	eng1.mu.Lock()
	eng1.local.AudioPriority = p
	eng1.local.Seq++
	st := eng1.local
	inst := eng1.instanceID
	seq := eng1.local.Seq
	eng1.mu.Unlock()
	msg := &BCOMessage{
		Type:       MsgStateUpdate,
		SenderID:   st.DeviceID,
		InstanceID: inst,
		Seq:        seq,
		State:      cloneDeviceState(&st.DeviceState),
	}
	net1.Broadcast(msg)

	deadline = time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		eng2.mu.Lock()
		ps, has := eng2.peers[h1.ID().String()]
		eng2.mu.Unlock()
		if has && ps.AudioPriority == AudioPriorityActiveCall {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("expected STATE_UPDATE after manual-only dial path")
}

func TestNetwork_VersionMismatchClosesWithoutPeerState(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	mn := mocknet.New()
	h1, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	h2, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	if err := mn.LinkAll(); err != nil {
		t.Fatal(err)
	}

	d2 := t.TempDir()
	_, net2, err := startEngineWithHost(ctx, h2, "beta", d2, true, false)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = net2.Close() }()

	if err := h1.Connect(ctx, peer.AddrInfo{ID: h2.ID(), Addrs: h2.Addrs()}); err != nil {
		t.Fatal(err)
	}

	s, err := h1.NewStream(ctx, h2.ID(), bcoProtocolID)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()

	w := msgio.NewWriter(s)
	r := msgio.NewReaderSize(s, maxBCOMsgBytes)
	futureVer := ProtocolWireVersion + 10
	futureMin := ProtocolWireVersion + 10
	hello := BCOMessage{
		Type:               MsgBCOHello,
		SenderID:           h1.ID().String(),
		InstanceID:         "bad-ver-inst",
		Seq:                1,
		ProtocolVersion:    &futureVer,
		MinProtocolVersion: &futureMin,
	}
	b, _ := json.Marshal(hello)
	if err := w.WriteMsg(b); err != nil {
		t.Fatal(err)
	}
	rb, err := r.ReadMsg()
	if err != nil {
		t.Fatal(err)
	}
	var ack BCOMessage
	if err := json.Unmarshal(rb, &ack); err != nil {
		t.Fatal(err)
	}
	if ack.Type != MsgBCOHelloAck || ack.Agreed == nil || *ack.Agreed {
		t.Fatalf("expected HELLO_ACK with agreed=false, got %+v", ack)
	}

	time.Sleep(200 * time.Millisecond)
	net2.engine.mu.Lock()
	n := len(net2.engine.peers)
	net2.engine.mu.Unlock()
	if n != 0 {
		t.Fatalf("expected no orchestration peer state, got %d peers", n)
	}
}

func TestNetwork_PreHelloStateUpdateDropped(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	mn := mocknet.New()
	h1, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	h2, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	if err := mn.LinkAll(); err != nil {
		t.Fatal(err)
	}

	d2 := t.TempDir()
	eng2, net2, err := startEngineWithHost(ctx, h2, "beta", d2, true, false)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = net2.Close() }()

	eng2.allowlist.Add(h1.ID(), "alpha")

	if err := h1.Connect(ctx, peer.AddrInfo{ID: h2.ID(), Addrs: h2.Addrs()}); err != nil {
		t.Fatal(err)
	}

	s, err := h1.NewStream(ctx, h2.ID(), bcoProtocolID)
	if err != nil {
		t.Fatal(err)
	}

	w := msgio.NewWriter(s)
	st := DeviceState{
		DeviceID:      h1.ID().String(),
		DeviceName:    "evil",
		AudioPriority: AudioPriorityActiveCall,
		Seq:           1,
		Platform:      "test",
	}
	su := BCOMessage{
		Type:       MsgStateUpdate,
		SenderID:   h1.ID().String(),
		InstanceID: "inst",
		Seq:        5,
		State:      &st,
	}
	b, _ := json.Marshal(su)
	_ = w.WriteMsg(b)
	_ = s.Close()

	time.Sleep(300 * time.Millisecond)

	eng2.mu.Lock()
	_, has := eng2.peers[h1.ID().String()]
	eng2.mu.Unlock()
	if has {
		t.Fatal("STATE_UPDATE before HELLO must not populate engine peer map")
	}
}

func TestNetwork_AllowlistPersistenceReload(t *testing.T) {
	dir := t.TempDir()
	al := NewPeerAllowlist()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	defer h.Close()
	pid := h.ID()
	al.Add(pid, "phone")
	if err := SaveAllowlistToStorage(al, dir); err != nil {
		t.Fatal(err)
	}
	al2 := NewPeerAllowlist()
	if err := LoadAllowlistFromStorage(al2, dir); err != nil {
		t.Fatal(err)
	}
	if !al2.IsAllowed(pid) {
		t.Fatal("expected allowlist round-trip from disk")
	}
}

func TestNetwork_PriorityChangeEmitsConnectBT(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	mn := mocknet.New()
	h1, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	h2, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	if err := mn.LinkAll(); err != nil {
		t.Fatal(err)
	}

	d1 := t.TempDir()
	d2 := t.TempDir()
	eng1, net1, err := startEngineWithHost(ctx, h1, "a", d1, true, false)
	if err != nil {
		t.Fatal(err)
	}
	eng2, net2, err := startEngineWithHost(ctx, h2, "b", d2, true, false)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = net1.Close(); _ = net2.Close() }()

	eng1.allowlist.Add(h2.ID(), "b")
	eng2.allowlist.Add(h1.ID(), "a")

	eng1.mu.Lock()
	eng1.local.AudioPriority = AudioPriorityMedia
	eng1.local.HasBluetoothConnection = false
	eng1.mu.Unlock()
	eng2.mu.Lock()
	eng2.local.AudioPriority = AudioPriorityMedia
	eng2.local.HasBluetoothConnection = true
	eng2.mu.Unlock()

	if err := h1.Connect(ctx, peer.AddrInfo{ID: h2.ID(), Addrs: h2.Addrs()}); err != nil {
		t.Fatal(err)
	}
	if err := net1.openOutboundStream(ctx, h2.ID()); err != nil {
		t.Fatal(err)
	}
	if err := net2.openOutboundStream(ctx, h1.ID()); err != nil {
		t.Fatal(err)
	}

	waitForPeers(t, eng1, h2.ID().String(), 5*time.Second)
	waitForPeers(t, eng2, h1.ID().String(), 5*time.Second)

	eng1.mu.Lock()
	eng1.lastWinner = h2.ID().String()
	eng1.mu.Unlock()

	eng1.mu.Lock()
	eng1.local.AudioPriority = AudioPriorityActiveCall
	eng1.local.HasBluetoothConnection = false
	eng1.mu.Unlock()
	eng1.EvaluateSync()

	evs := drainEvents(eng1.Events(), 16)
	var sawConnect bool
	for _, e := range evs {
		if e.Type == "CONNECT_BT" {
			sawConnect = true
		}
	}
	if !sawConnect {
		t.Fatalf("expected CONNECT_BT after priority change, events=%v", evs)
	}
}

// US4: refresh closes connections and manual redial restores transport + STATE_UPDATE flow.
func TestNetwork_TriggerNetworkRefresh_RedialsManualPeer(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	mn := mocknet.New()
	h1, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	h2, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	if err := mn.LinkAll(); err != nil {
		t.Fatal(err)
	}

	d1 := t.TempDir()
	d2 := t.TempDir()
	eng1, net1, err := startEngineWithHost(ctx, h1, "alpha", d1, true, false)
	if err != nil {
		t.Fatal(err)
	}
	eng2, net2, err := startEngineWithHost(ctx, h2, "beta", d2, true, false)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = net1.Close(); _ = net2.Close() }()

	eng1.allowlist.Add(h2.ID(), "beta")
	eng2.allowlist.Add(h1.ID(), "alpha")

	addr2 := dialableP2PMultiaddr(t, h2)
	if err := net1.ConnectPeer(ctx, addr2); err != nil {
		t.Fatalf("ConnectPeer: %v", err)
	}

	waitForPeers(t, eng2, h1.ID().String(), 5*time.Second)

	net1.TriggerNetworkRefresh(ctx)

	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		if h1.Network().Connectedness(h2.ID()) == network.Connected {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	if h1.Network().Connectedness(h2.ID()) != network.Connected {
		t.Fatal("expected manual redial after refresh to reconnect to peer")
	}

	waitForPeers(t, eng2, h1.ID().String(), 8*time.Second)

	p := AudioPriorityActiveCall
	eng1.mu.Lock()
	eng1.local.AudioPriority = p
	eng1.local.Seq++
	st := eng1.local
	inst := eng1.instanceID
	seq := eng1.local.Seq
	eng1.mu.Unlock()
	msg := &BCOMessage{
		Type:       MsgStateUpdate,
		SenderID:   st.DeviceID,
		InstanceID: inst,
		Seq:        seq,
		State:      cloneDeviceState(&st.DeviceState),
	}
	net1.Broadcast(msg)

	deadline = time.Now().Add(8 * time.Second)
	for time.Now().Before(deadline) {
		eng2.mu.Lock()
		ps, has := eng2.peers[h1.ID().String()]
		eng2.mu.Unlock()
		if has && ps.AudioPriority == AudioPriorityActiveCall {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("expected STATE_UPDATE after refresh + redial")
}

// US5: mocknet link loss + ping liveness eventually removes peer from engine registry.
func TestNetwork_PartitionPingRemovesPeerState(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	mn := mocknet.New()
	h1, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	h2, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	if err := mn.LinkAll(); err != nil {
		t.Fatal(err)
	}

	d1 := t.TempDir()
	d2 := t.TempDir()
	eng1, net1, err := startEngineWithHost(ctx, h1, "alpha", d1, true, false)
	if err != nil {
		t.Fatal(err)
	}
	eng2, net2, err := startEngineWithHost(ctx, h2, "beta", d2, true, false)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = net1.Close(); _ = net2.Close() }()

	eng1.allowlist.Add(h2.ID(), "beta")
	eng2.allowlist.Add(h1.ID(), "alpha")

	if err := h1.Connect(ctx, peer.AddrInfo{ID: h2.ID(), Addrs: h2.Addrs()}); err != nil {
		t.Fatal(err)
	}
	if err := net1.openOutboundStream(ctx, h2.ID()); err != nil {
		t.Fatalf("open stream: %v", err)
	}
	if err := h2.Connect(ctx, peer.AddrInfo{ID: h1.ID(), Addrs: h1.Addrs()}); err != nil {
		t.Fatal(err)
	}
	if err := net2.openOutboundStream(ctx, h1.ID()); err != nil {
		t.Fatalf("open stream h2->h1: %v", err)
	}

	waitForPeers(t, eng1, h2.ID().String(), 5*time.Second)
	waitForPeers(t, eng2, h1.ID().String(), 5*time.Second)

	// Close both directions so each host sees full disconnect (mocknet links stay up for reconnect tests).
	_ = mn.DisconnectPeers(h1.ID(), h2.ID())
	_ = mn.DisconnectPeers(h2.ID(), h1.ID())
	time.Sleep(200 * time.Millisecond)

	waitForPeerGone(t, eng1, h2.ID().String(), 5*time.Second)
	waitForPeerGone(t, eng2, h1.ID().String(), 5*time.Second)
}

// US5: after transport drops and mocknet reconnect, STATE_UPDATE flows again (post-heal winner sync).
func TestNetwork_PartitionHealSingleReconnectRestoresState(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	mn := mocknet.New()
	h1, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	h2, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	if err := mn.LinkAll(); err != nil {
		t.Fatal(err)
	}

	d1 := t.TempDir()
	d2 := t.TempDir()
	eng1, net1, err := startEngineWithHost(ctx, h1, "alpha", d1, true, true)
	if err != nil {
		t.Fatal(err)
	}
	eng2, net2, err := startEngineWithHost(ctx, h2, "beta", d2, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = net1.Close(); _ = net2.Close() }()

	eng1.allowlist.Add(h2.ID(), "beta")
	eng2.allowlist.Add(h1.ID(), "alpha")

	if err := h1.Connect(ctx, peer.AddrInfo{ID: h2.ID(), Addrs: h2.Addrs()}); err != nil {
		t.Fatal(err)
	}
	if err := net1.openOutboundStream(ctx, h2.ID()); err != nil {
		t.Fatalf("open stream: %v", err)
	}
	if err := h2.Connect(ctx, peer.AddrInfo{ID: h1.ID(), Addrs: h1.Addrs()}); err != nil {
		t.Fatal(err)
	}
	if err := net2.openOutboundStream(ctx, h1.ID()); err != nil {
		t.Fatalf("open stream h2->h1: %v", err)
	}
	waitForPeers(t, eng1, h2.ID().String(), 5*time.Second)
	waitForPeers(t, eng2, h1.ID().String(), 5*time.Second)

	_ = mn.DisconnectPeers(h1.ID(), h2.ID())
	_ = mn.DisconnectPeers(h2.ID(), h1.ID())
	time.Sleep(200 * time.Millisecond)
	waitForPeerGone(t, eng1, h2.ID().String(), 5*time.Second)

	if err := h1.Connect(ctx, peer.AddrInfo{ID: h2.ID(), Addrs: h2.Addrs()}); err != nil {
		t.Fatalf("reconnect: %v", err)
	}
	if err := net1.openOutboundStream(ctx, h2.ID()); err != nil {
		t.Fatalf("stream after heal: %v", err)
	}
	if err := h2.Connect(ctx, peer.AddrInfo{ID: h1.ID(), Addrs: h1.Addrs()}); err != nil {
		t.Fatalf("reconnect h2->h1: %v", err)
	}
	if err := net2.openOutboundStream(ctx, h1.ID()); err != nil {
		t.Fatalf("stream after heal h2->h1: %v", err)
	}

	waitForPeers(t, eng1, h2.ID().String(), 8*time.Second)
	waitForPeers(t, eng2, h1.ID().String(), 8*time.Second)
	// Broadcast only reaches libp2p-connected peers; registry can update slightly earlier.
	waitForLibp2pConnected(t, h1, h2.ID(), 10*time.Second)
	waitForLibp2pConnected(t, h2, h1.ID(), 10*time.Second)

	var lastPs DeviceState
	var lastHas bool
	outer := time.Now().Add(25 * time.Second)
	for time.Now().Before(outer) {
		seq := eng1.AllocateOutboundSeq()
		eng1.mu.Lock()
		eng1.local.AudioPriority = AudioPriorityActiveCall
		eng1.local.Seq = seq
		st := eng1.local
		inst := eng1.instanceID
		eng1.mu.Unlock()
		msg := &BCOMessage{
			Type:       MsgStateUpdate,
			SenderID:   st.DeviceID,
			InstanceID: inst,
			Seq:        seq,
			State:      cloneDeviceState(&st.DeviceState),
		}
		if err := net1.Send(h2.ID().String(), msg); err != nil {
			t.Fatalf("post-heal Send: %v", err)
		}
		inner := time.Now().Add(3 * time.Second)
		for time.Now().Before(inner) {
			eng2.mu.Lock()
			lastPs, lastHas = eng2.peers[h1.ID().String()]
			eng2.mu.Unlock()
			if lastHas && lastPs.AudioPriority == AudioPriorityActiveCall {
				return
			}
			time.Sleep(20 * time.Millisecond)
		}
		time.Sleep(150 * time.Millisecond)
	}
	t.Fatalf("expected post-heal STATE_UPDATE to restore ActiveCall on peer: has=%v priority=%d state=%+v",
		lastHas, lastPs.AudioPriority, lastPs)
}

func TestBCONetwork_runPingLivenessTick_whenStopped(t *testing.T) {
	n := &BCONetwork{stopped: true}
	n.runPingLivenessTick()
}

// Directly exercises runPingLivenessTick against a live mocknet session (FR-012 loop body).
func TestBCONetwork_runPingLivenessTick_withAllowlistedConnectedPeer(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	mn := mocknet.New()
	h1, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	h2, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	if err := mn.LinkAll(); err != nil {
		t.Fatal(err)
	}
	d1 := t.TempDir()
	d2 := t.TempDir()
	_, net1, err := startEngineWithHost(ctx, h1, "ping-a", d1, true, false)
	if err != nil {
		t.Fatal(err)
	}
	_, net2, err := startEngineWithHost(ctx, h2, "ping-b", d2, true, false)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = net1.Close(); _ = net2.Close() }()

	net1.engine.allowlist.Add(h2.ID(), "b")
	net2.engine.allowlist.Add(h1.ID(), "a")

	if err := h1.Connect(ctx, peer.AddrInfo{ID: h2.ID(), Addrs: h2.Addrs()}); err != nil {
		t.Fatal(err)
	}
	if err := net1.openOutboundStream(ctx, h2.ID()); err != nil {
		t.Fatal(err)
	}
	waitForLibp2pConnected(t, h1, h2.ID(), 5*time.Second)

	net1.runPingLivenessTick()
}

func TestBCONetwork_onLibp2pDisconnected_earlyReturns(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "disc-early", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()

	netw.onLibp2pDisconnected(h.ID())

	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	unknown, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	netw.onLibp2pDisconnected(unknown)

	netw.allowlist.Add(unknown, "x")
	netw.mu.Lock()
	netw.stopped = true
	netw.mu.Unlock()
	netw.onLibp2pDisconnected(unknown)
}

func TestBCONetwork_dropAllowlistedPeerAfterTransportLoss_branches(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "drop-br", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()

	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	pid, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	netw.dropAllowlistedPeerAfterTransportLoss(pid)
	time.Sleep(80 * time.Millisecond)

	netw.allowlist.Add(pid, "friend")
	netw.mu.Lock()
	netw.joinedEmitted[pid] = struct{}{}
	netw.mu.Unlock()
	netw.dropAllowlistedPeerAfterTransportLoss(pid)
	time.Sleep(200 * time.Millisecond)
}

func TestBCONetwork_PreferredDialMultiaddr_loopbackFallback(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "pref-loop", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	addrs := netw.ListenMultiaddrs()
	if len(addrs) == 0 {
		t.Fatal("no listen addrs")
	}
	// When every address is loopback, PreferredDialMultiaddr falls back to addrs[0].
	if got := netw.PreferredDialMultiaddr(); got == "" {
		t.Fatal("expected fallback multiaddr")
	}
	_ = addrs
}

func TestMdnsNotifee_HandlePeerFound_dialsRemotePeer(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	mn := mocknet.New()
	h1, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	h2, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	if err := mn.LinkAll(); err != nil {
		t.Fatal(err)
	}
	d1 := t.TempDir()
	_, net1, err := startEngineWithHost(ctx, h1, "mdns-dial-a", d1, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer net1.Close()
	m := mdnsNotifee{n: net1}
	m.HandlePeerFound(peer.AddrInfo{ID: h2.ID(), Addrs: h2.Addrs()})
	deadline := time.Now().Add(8 * time.Second)
	for time.Now().Before(deadline) {
		if h1.Network().Connectedness(h2.ID()) == network.Connected {
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatal("timeout waiting for mdns notifee dial to connect peers")
}

func TestBCONetwork_Host_accessor(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "host-acc", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	if netw.Host() != h {
		t.Fatal("Host() should return the underlying libp2p host")
	}
}

func TestBCONetwork_RedialPersistedManualPeers_badPeerIDSkipped(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "redial-bad", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	netw.manualPeersMu.Lock()
	netw.manualPeers["not-a-valid-multibase-peer-id"] = "/ip4/127.0.0.1/tcp/9"
	netw.manualPeersMu.Unlock()
	netw.RedialPersistedManualPeers(ctx)
}

func TestBCONetwork_RedialPersistedManualPeers_ctxCanceled(t *testing.T) {
	ctxBg, cancelBg := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancelBg()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctxBg, h, "redial-ctx", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	pid, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	netw.manualPeersMu.Lock()
	netw.manualPeers[pid.String()] = "/ip4/127.0.0.1/tcp/9"
	netw.manualPeersMu.Unlock()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	netw.RedialPersistedManualPeers(ctx)
}

func TestBCONetwork_declarePeerDeadFromPing_unallowlistedPeer(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	otherID, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "dead-ping", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	netw.declarePeerDeadFromPing(otherID)
	time.Sleep(150 * time.Millisecond)
}

func TestBCONetwork_maybePairingEvent_stagesPending(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	remoteID, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "pair-ev", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	netw.maybePairingEvent(remoteID, nil)
	if _, ok := netw.pending.Get(remoteID); !ok {
		t.Fatal("expected pending pairing after maybePairingEvent")
	}
	netw.maybePairingEvent(remoteID, nil)
}

func TestMdnsNotifee_HandlePeerFound_selfPeerNoop(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "mdns-self", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	m := mdnsNotifee{n: netw}
	m.HandlePeerFound(peer.AddrInfo{ID: h.ID(), Addrs: h.Addrs()})
	time.Sleep(50 * time.Millisecond)
}

func TestBCONetwork_TriggerNetworkRefresh_whenStopped(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "refresh-stop", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	_ = netw.Close()
	netw.TriggerNetworkRefresh(ctx)
}

func TestBCONetwork_Close_idempotent(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "close-twice", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	if err := netw.Close(); err != nil {
		t.Fatalf("first Close: %v", err)
	}
	if err := netw.Close(); err != nil {
		t.Fatalf("second Close want nil, got %v", err)
	}
}

func TestStartEngineWithHost_startsMdnsWhenNotSkipped(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	eng, netw, err := startEngineWithHost(ctx, h, "mdns-start", d, false, true)
	if err != nil {
		t.Fatal(err)
	}
	if netw.mdnsSvc == nil {
		t.Fatal("expected mDNS service when skipMDNS is false")
	}
	_ = eng
	defer func() { _ = netw.Close() }()
}

func TestAttachBCONetwork_rejectsInvalidManualPeersJSON(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	if err := os.WriteFile(filepath.Join(d, fileManualPeers), []byte(`{`), 0o600); err != nil {
		t.Fatal(err)
	}
	al := NewPeerAllowlist()
	pending := NewPendingPairing()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      h.ID().String(),
		DeviceName:    "attach-mp",
		AudioPriority: AudioPriorityIdle,
		Platform:      "test",
	}, "inst", nil, al, d, DefaultNetworkSettings())
	_, err = AttachBCONetwork(ctx, h, eng, al, pending, d)
	if err == nil {
		t.Fatal("expected error from invalid manual_peers.json")
	}
}

func TestBCONetwork_persistManualPeer_warnsWhenSaveFails(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "pers-warn", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	pid, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	netw.persistManualPeer(pid.String(), "/ip4/1.1.1.1/tcp/9")
	if err := os.Chmod(d, 0o500); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chmod(d, 0o700) })
	netw.persistManualPeer(pid.String(), "/ip4/1.1.1.1/tcp/10")
}

func TestBCONetwork_Broadcast_nilMessage(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "bc-nil", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	netw.Broadcast(nil)
}

func TestBCONetwork_ConnectPeer_rejectsSelf(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "self-dial", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	self := dialableP2PMultiaddr(t, h)
	err = netw.ConnectPeer(ctx, self)
	if err == nil || !strings.Contains(err.Error(), "self") {
		t.Fatalf("ConnectPeer to self: %v", err)
	}
}

func TestBCONetwork_Send_invalidPeerID(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "send-bad", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	err = netw.Send("%%%not-a-peer-id%%%", &BCOMessage{Type: MsgStateUpdate})
	if err == nil {
		t.Fatal("expected peer.Decode error")
	}
}

func TestBCONetwork_Send_notAllowlistedConnectedPeerNoOp(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "send-no-al", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	pid, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	msg := &BCOMessage{Type: MsgStateUpdate, SenderID: h.ID().String(), InstanceID: "i", Seq: 1}
	if err := netw.Send(pid.String(), msg); err != nil {
		t.Fatalf("Send should return nil when peer not allowlisted: %v", err)
	}
}

func TestBCONetwork_PreferredDialMultiaddr_nonEmpty(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "pref-dial", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	if s := netw.PreferredDialMultiaddr(); s == "" {
		t.Fatal("expected non-empty preferred dial multiaddr from mock host")
	}
}

func TestBCONetwork_allowlistDisplayName_branches(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "disp-name", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()

	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	pid, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	netw.allowlist.Add(pid, "MyPhone")
	if got := netw.allowlistDisplayName(pid); got != "MyPhone" {
		t.Fatalf("friendly name: got %q", got)
	}

	_, pub2, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	pid2, err := peer.IDFromPublicKey(pub2)
	if err != nil {
		t.Fatal(err)
	}
	longStr := pid2.String()
	if len(longStr) <= 16 {
		t.Fatalf("expected long peer id string, got len=%d", len(longStr))
	}
	want := longStr[:16] + "…"
	if got := netw.allowlistDisplayName(pid2); got != want {
		t.Fatalf("truncated id: got %q want %q", got, want)
	}
}

func TestBCONetwork_postHelloInbound_eofAfterMaybePairing(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	remoteID, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "posthello-eof", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	r := msgio.NewReaderSize(bytes.NewReader(nil), maxBCOMsgBytes)
	var s network.Stream
	netw.postHelloInbound(remoteID, s, r, nil)
}

func TestReadBCOFrame_unmarshalError(t *testing.T) {
	var buf bytes.Buffer
	w := msgio.NewWriter(&buf)
	if err := w.WriteMsg([]byte(`{not json`)); err != nil {
		t.Fatal(err)
	}
	r := msgio.NewReaderSize(&buf, maxBCOMsgBytes)
	_, err := readBCOFrame(r)
	if err == nil {
		t.Fatal("expected unmarshal error")
	}
}

func TestBCONetwork_postHelloInbound_skipsInvalidJSON(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	remoteID, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "posthello", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	netw.allowlist.Add(remoteID, "remote")

	var buf2 bytes.Buffer
	w2 := msgio.NewWriter(&buf2)
	if err := w2.WriteMsg([]byte(`not-json`)); err != nil {
		t.Fatal(err)
	}
	r2 := msgio.NewReaderSize(&buf2, maxBCOMsgBytes)
	var s network.Stream
	netw.postHelloInbound(remoteID, s, r2, nil)
}

func TestBCONetwork_postHelloInbound_oversizedFrame(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	remoteID, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "bigframe", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	netw.allowlist.Add(remoteID, "remote")

	var buf bytes.Buffer
	w := msgio.NewWriter(&buf)
	big := make([]byte, maxBCOMsgBytes+1)
	if err := w.WriteMsg(big); err != nil {
		t.Fatal(err)
	}
	r := msgio.NewReaderSize(&buf, maxBCOMsgBytes)
	var s network.Stream
	netw.postHelloInbound(remoteID, s, r, nil)
}

func TestBCONetwork_postHelloInbound_handshakeReplayEnds(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	remoteID, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "hs-replay", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	netw.allowlist.Add(remoteID, "remote")

	hello := BCOMessage{Type: MsgBCOHello, SenderID: remoteID.String(), InstanceID: "i", Seq: 1}
	payload, err := json.Marshal(hello)
	if err != nil {
		t.Fatal(err)
	}
	var buf bytes.Buffer
	w := msgio.NewWriter(&buf)
	if err := w.WriteMsg(payload); err != nil {
		t.Fatal(err)
	}
	r := msgio.NewReaderSize(&buf, maxBCOMsgBytes)
	var s network.Stream
	netw.postHelloInbound(remoteID, s, r, nil)
}

func dialableP2PMultiaddr(t *testing.T, h host.Host) string {
	t.Helper()
	addrs := h.Addrs()
	if len(addrs) == 0 {
		t.Fatal("host has no listen addresses")
	}
	p2p, err := ma.NewMultiaddr("/p2p/" + h.ID().String())
	if err != nil {
		t.Fatal(err)
	}
	return addrs[0].Encapsulate(p2p).String()
}

func waitForLibp2pConnected(t *testing.T, h host.Host, remote peer.ID, d time.Duration) {
	t.Helper()
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		if h.Network().Connectedness(remote) == network.Connected {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("timeout waiting for libp2p connectedness %s -> %s", h.ID(), remote)
}

func waitForPeers(t *testing.T, eng *BCOEngine, wantID string, d time.Duration) {
	t.Helper()
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		eng.mu.Lock()
		_, ok := eng.peers[wantID]
		eng.mu.Unlock()
		if ok {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("timeout waiting for peer %s", wantID)
}

func waitForPeerGone(t *testing.T, eng *BCOEngine, wantID string, d time.Duration) {
	t.Helper()
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		eng.mu.Lock()
		_, ok := eng.peers[wantID]
		eng.mu.Unlock()
		if !ok {
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatalf("timeout waiting for peer %s to be removed", wantID)
}

func TestHelloMessage_containsIdentityFields(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	eng, netw, err := startEngineWithHost(ctx, h, "MyPhone", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	eng.mu.Lock()
	eng.local.Platform = "android"
	eng.local.HeadsetDisplayName = "Galaxy Buds Pro"
	eng.mu.Unlock()

	msg := netw.helloMessage(1)
	if msg.DeviceName == nil || *msg.DeviceName != "MyPhone" {
		t.Fatalf("DeviceName: got %v", msg.DeviceName)
	}
	if msg.Platform == nil || *msg.Platform != "android" {
		t.Fatalf("Platform: got %v", msg.Platform)
	}
	if msg.TargetBTDevice == nil || *msg.TargetBTDevice != "Galaxy Buds Pro" {
		t.Fatalf("TargetBTDevice: got %v", msg.TargetBTDevice)
	}
}

func TestHelloAckMessage_containsIdentityFields(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	eng, netw, err := startEngineWithHost(ctx, h, "MyMac", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()
	eng.mu.Lock()
	eng.local.Platform = "macos"
	eng.local.HeadsetDisplayName = "AirPods Pro"
	eng.mu.Unlock()

	v := ProtocolWireVersion
	msg := netw.helloAckMessage(1, &v, &v)
	if msg.DeviceName == nil || *msg.DeviceName != "MyMac" {
		t.Fatalf("DeviceName: got %v", msg.DeviceName)
	}
	if msg.Platform == nil || *msg.Platform != "macos" {
		t.Fatalf("Platform: got %v", msg.Platform)
	}
	if msg.TargetBTDevice == nil || *msg.TargetBTDevice != "AirPods Pro" {
		t.Fatalf("TargetBTDevice: got %v", msg.TargetBTDevice)
	}
}

func TestHelloMessage_omitsTargetBTWhenEmpty(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "NoBT", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()

	msg := netw.helloMessage(1)
	if msg.TargetBTDevice != nil {
		t.Fatalf("TargetBTDevice should be nil when HeadsetDisplayName is empty, got %q", *msg.TargetBTDevice)
	}
}

func TestExtractHelloMetadata(t *testing.T) {
	dn := "Pixel 9"
	pl := "android"
	bt := "Buds4 Pro"
	msg := &BCOMessage{
		DeviceName:     &dn,
		Platform:       &pl,
		TargetBTDevice: &bt,
	}
	meta := extractHelloMetadata(msg)
	if meta.DeviceName != "Pixel 9" {
		t.Fatalf("DeviceName: %q", meta.DeviceName)
	}
	if meta.Platform != "android" {
		t.Fatalf("Platform: %q", meta.Platform)
	}
	if meta.TargetBTDevice != "Buds4 Pro" {
		t.Fatalf("TargetBTDevice: %q", meta.TargetBTDevice)
	}

	empty := extractHelloMetadata(&BCOMessage{})
	if empty.DeviceName != "" || empty.Platform != "" || empty.TargetBTDevice != "" {
		t.Fatalf("expected empty metadata for bare message, got %+v", empty)
	}
}

func TestMaybePairingEvent_withHelloMetadata(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	remoteID, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	eng, netw, err := startEngineWithHost(ctx, h, "local", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()

	meta := &helloMetadata{
		DeviceName:     "Harsh's MacBook",
		Platform:       "macos",
		TargetBTDevice: "AirPods Pro",
	}
	netw.maybePairingEvent(remoteID, meta)

	pi, ok := netw.pending.Get(remoteID)
	if !ok {
		t.Fatal("expected pending pairing")
	}
	if pi.PeerName != "Harsh's MacBook" {
		t.Fatalf("PeerName: got %q want %q", pi.PeerName, "Harsh's MacBook")
	}
	if pi.Platform != "macos" {
		t.Fatalf("Platform: got %q", pi.Platform)
	}
	if pi.TargetBTDevice != "AirPods Pro" {
		t.Fatalf("TargetBTDevice: got %q", pi.TargetBTDevice)
	}

	var evt EngineEvent
	select {
	case evt = <-eng.Events():
	case <-time.After(time.Second):
		t.Fatal("no event")
	}
	if evt.Type != "PAIRING_REQUEST" {
		t.Fatalf("event type: %s", evt.Type)
	}
	if evt.PeerName == nil || *evt.PeerName != "Harsh's MacBook" {
		t.Fatalf("event PeerName: %v", evt.PeerName)
	}
	if evt.Platform == nil || *evt.Platform != "macos" {
		t.Fatalf("event Platform: %v", evt.Platform)
	}
	if evt.TargetBTDevice == nil || *evt.TargetBTDevice != "AirPods Pro" {
		t.Fatalf("event TargetBTDevice: %v", evt.TargetBTDevice)
	}
}

func TestMaybePairingEvent_nilMetaFallsBackToTruncatedID(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	mn := mocknet.New()
	h, err := mn.GenPeer()
	if err != nil {
		t.Fatal(err)
	}
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	remoteID, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	d := t.TempDir()
	_, netw, err := startEngineWithHost(ctx, h, "local", d, true, true)
	if err != nil {
		t.Fatal(err)
	}
	defer netw.Close()

	netw.maybePairingEvent(remoteID, nil)
	pi, ok := netw.pending.Get(remoteID)
	if !ok {
		t.Fatal("expected pending pairing")
	}
	if pi.Platform != "" {
		t.Fatalf("Platform should be empty with nil meta, got %q", pi.Platform)
	}
	if pi.TargetBTDevice != "" {
		t.Fatalf("TargetBTDevice should be empty with nil meta, got %q", pi.TargetBTDevice)
	}
	idStr := remoteID.String()
	wantName := idStr[:12] + "…"
	if pi.PeerName != wantName {
		t.Fatalf("PeerName: got %q want truncated ID %q", pi.PeerName, wantName)
	}
}
