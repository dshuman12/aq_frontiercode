package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	libp2pcrypto "github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/peer"
)

var _ Network = (*recordingNetwork)(nil)

// aggressiveSettings returns NetworkSettings with BtSafetyPolicy=aggressive,
// used in tests that need CONNECT_BT to fire regardless of peer BT state.
func aggressiveSettings() NetworkSettings {
	s := DefaultNetworkSettings()
	s.BtSafetyPolicy.Value = string(BtSafetyAggressive)
	return s
}

func forceConnectSettings() NetworkSettings {
	s := aggressiveSettings()
	s.ForceConnectDisconnectTimeoutMs.Value = 400
	s.ForceConnectConnectTimeoutMs.Value = 400
	return s
}

func shortForceConnectSettings() NetworkSettings {
	s := aggressiveSettings()
	s.ForceConnectDisconnectTimeoutMs.Value = 100
	s.ForceConnectConnectTimeoutMs.Value = 100
	return s
}

// recordingNetworkOption configures newRecordingNetwork (tests only).
type recordingNetworkOption func(*recordingNetwork)

func withRecordingListenAddrs(addrs ...string) recordingNetworkOption {
	return func(r *recordingNetwork) {
		r.listenAddrs = append([]string(nil), addrs...)
	}
}

// withRecordingFirstCloseErr makes the first Close() return err; later Close() calls return nil (matches BCONetwork idempotency).
func withRecordingFirstCloseErr(err error) recordingNetworkOption {
	return func(r *recordingNetwork) {
		r.firstCloseErr = err
	}
}

type recordingNetwork struct {
	mu sync.Mutex

	broadcasts []*BCOMessage
	sends      map[string][]*BCOMessage

	listenAddrs   []string
	closed        bool
	closeCalls    int
	firstCloseErr error

	// When transportPeersExplicit, TransportConnectedPeerIDs returns a copy of transportPeers
	// (may be empty). Otherwise returns nil so PeerStatesJSON uses legacy connected=true for registry peers.
	transportPeersExplicit bool
	transportPeers         []string
}

func newRecordingNetwork(opts ...recordingNetworkOption) *recordingNetwork {
	r := &recordingNetwork{sends: make(map[string][]*BCOMessage)}
	for _, o := range opts {
		o(r)
	}
	return r
}

func cloneBCOMessageForRecord(msg *BCOMessage) *BCOMessage {
	if msg == nil {
		return nil
	}
	cp := *msg
	if msg.State != nil {
		st := *msg.State
		cp.State = &st
	}
	if msg.Approved != nil {
		a := *msg.Approved
		cp.Approved = &a
	}
	return &cp
}

func (r *recordingNetwork) Broadcast(msg *BCOMessage) {
	if msg == nil {
		return
	}
	cp := cloneBCOMessageForRecord(msg)
	r.mu.Lock()
	defer r.mu.Unlock()
	r.broadcasts = append(r.broadcasts, cp)
}

func (r *recordingNetwork) Send(peerID string, msg *BCOMessage) error {
	if msg == nil {
		return nil
	}
	cp := cloneBCOMessageForRecord(msg)
	r.mu.Lock()
	defer r.mu.Unlock()
	r.sends[peerID] = append(r.sends[peerID], cp)
	return nil
}

var _ Network = (*reentrantSendNetwork)(nil)

type reentrantSendNetwork struct {
	*recordingNetwork
	onSend func()
}

func newReentrantSendNetwork() *reentrantSendNetwork {
	return &reentrantSendNetwork{recordingNetwork: newRecordingNetwork()}
}

func (r *reentrantSendNetwork) Send(peerID string, msg *BCOMessage) error {
	err := r.recordingNetwork.Send(peerID, msg)
	if r.onSend != nil {
		r.onSend()
	}
	return err
}

func (r *recordingNetwork) ListenMultiaddrs() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]string(nil), r.listenAddrs...)
}

// SetRecordingTransportPeers configures simulated libp2p-connected peer IDs for PeerStatesJSON tests.
func (r *recordingNetwork) SetRecordingTransportPeers(ids []string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.transportPeersExplicit = true
	// Use make+copy so len==0 yields a non-nil empty slice (append(nil, empty...) is nil and would look like "legacy" transport).
	r.transportPeers = make([]string, len(ids))
	copy(r.transportPeers, ids)
}

func (r *recordingNetwork) TransportConnectedPeerIDs() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !r.transportPeersExplicit {
		return nil
	}
	out := make([]string, len(r.transportPeers))
	copy(out, r.transportPeers)
	return out
}

func (r *recordingNetwork) ConnectTransitivePeer(string) {}

// SetListenMultiaddrs replaces advertised listen addresses (copy stored).
func (r *recordingNetwork) SetListenMultiaddrs(addrs []string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.listenAddrs = append([]string(nil), addrs...)
}

// Close is idempotent like BCONetwork.Close: first call runs shutdown bookkeeping and returns firstCloseErr (if any); later calls return nil.
func (r *recordingNetwork) Close() error {
	r.mu.Lock()
	r.closeCalls++
	if r.closed {
		r.mu.Unlock()
		return nil
	}
	r.closed = true
	err := r.firstCloseErr
	r.mu.Unlock()
	return err
}

func (r *recordingNetwork) CloseCallCount() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.closeCalls
}

func (r *recordingNetwork) IsClosed() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.closed
}

// Broadcasts returns a snapshot of recorded broadcasts (safe for tests vs concurrent engine calls).
func (r *recordingNetwork) Broadcasts() []*BCOMessage {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]*BCOMessage(nil), r.broadcasts...)
}

// SendsTo returns a snapshot of messages sent to peerID.
func (r *recordingNetwork) SendsTo(peerID string) []*BCOMessage {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]*BCOMessage(nil), r.sends[peerID]...)
}

func drainEvents(ch <-chan EngineEvent, n int) []EngineEvent {
	var out []EngineEvent
	for i := 0; i < n; i++ {
		select {
		case ev := <-ch:
			out = append(out, ev)
		case <-time.After(200 * time.Millisecond):
			return out
		}
	}
	return out
}

func drainQueuedEvents(ch <-chan EngineEvent, n int) []EngineEvent {
	var out []EngineEvent
	for i := 0; i < n; i++ {
		select {
		case ev := <-ch:
			out = append(out, ev)
		default:
			return out
		}
	}
	return out
}

func waitForEventType(ch <-chan EngineEvent, typ string, timeout time.Duration) (EngineEvent, bool) {
	deadline := time.After(timeout)
	for {
		select {
		case ev := <-ch:
			if ev.Type == typ {
				return ev, true
			}
		case <-deadline:
			return EngineEvent{}, false
		}
	}
}

func TestRecordingNetwork_ListenCloseSendDeepCopy(t *testing.T) {
	want := []string{"/ip4/127.0.0.1/tcp/4001/p2p/QmTest"}
	net := newRecordingNetwork(withRecordingListenAddrs(want...))

	got := net.ListenMultiaddrs()
	if len(got) != 1 || got[0] != want[0] {
		t.Fatalf("ListenMultiaddrs: got %v want %v", got, want)
	}
	got[0] = "mutated"
	if g := net.ListenMultiaddrs(); len(g) != 1 || g[0] != want[0] {
		t.Fatalf("ListenMultiaddrs should return a copy each call, got %v", g)
	}

	net.SetListenMultiaddrs([]string{"/dns4/example/tcp/9/p2p/QmY"})
	if s := net.ListenMultiaddrs(); len(s) != 1 || s[0] != "/dns4/example/tcp/9/p2p/QmY" {
		t.Fatalf("SetListenMultiaddrs: %v", s)
	}

	firstErr := errors.New("first close fails")
	rn := newRecordingNetwork(withRecordingFirstCloseErr(firstErr))
	if err := rn.Close(); !errors.Is(err, firstErr) {
		t.Fatalf("first Close: got %v want %v", err, firstErr)
	}
	if err := rn.Close(); err != nil {
		t.Fatalf("second Close want nil, got %v", err)
	}
	if err := rn.Close(); err != nil {
		t.Fatalf("third Close want nil, got %v", err)
	}
	if n := rn.CloseCallCount(); n != 3 {
		t.Fatalf("CloseCallCount: got %d want 3", n)
	}
	if !rn.IsClosed() {
		t.Fatal("IsClosed should be true after first Close")
	}

	rnOk := newRecordingNetwork()
	if err := rnOk.Close(); err != nil {
		t.Fatalf("Close with no configured err: %v", err)
	}
	if err := rnOk.Close(); err != nil {
		t.Fatalf("idempotent Close: %v", err)
	}

	st := DeviceState{DeviceID: "orig", AudioPriority: AudioPriorityMedia}
	msg := &BCOMessage{Type: MsgStateUpdate, SenderID: "x", InstanceID: "i", Seq: 1, State: &st}
	snd := newRecordingNetwork()
	if err := snd.Send("peer-a", msg); err != nil {
		t.Fatal(err)
	}
	st.DeviceID = "mutated-after-send"
	msg.State.AudioPriority = AudioPriorityActiveCall
	rec := snd.SendsTo("peer-a")
	if len(rec) != 1 {
		t.Fatalf("SendsTo len: %d", len(rec))
	}
	if rec[0].State == nil {
		t.Fatal("nil State in recording")
	}
	if rec[0].State.DeviceID != "orig" || rec[0].State.AudioPriority != AudioPriorityMedia {
		t.Fatalf("recorded State should be deep copy of pre-mutation values, got %+v", rec[0].State)
	}
}

func TestEngine_StickinessNoOscillationEvents(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:               localID,
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: true,
	}, "inst-local", net, nil, "", DefaultNetworkSettings())
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "i1", Seq: 1,
		State: &DeviceState{
			DeviceID: peerID, AudioPriority: AudioPriorityMedia, Seq: 1,
		},
	})
	evs := drainEvents(eng.Events(), 8)
	var sawConnect, sawDisconnect bool
	for _, e := range evs {
		switch e.Type {
		case "CONNECT_BT":
			sawConnect = true
		case "DISCONNECT_BT":
			sawDisconnect = true
		}
	}
	if sawConnect || sawDisconnect {
		t.Fatalf("equal Media with local stickiness should not flip BT events, got connect=%v disconnect=%v events=%v", sawConnect, sawDisconnect, evs)
	}
}

func TestEngine_OpposingBTEventCooldownSuppressesConnectAfterDisconnect(t *testing.T) {
	old := bluetoothOpposingEventCooldown
	bluetoothOpposingEventCooldown = time.Hour
	t.Cleanup(func() { bluetoothOpposingEventCooldown = old })

	localID := "QmL"
	peerID := "QmP"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:               localID,
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: true,
	}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "i", Seq: 1,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityActiveCall, Seq: 1},
	})
	evs1 := drainEvents(eng.Events(), 16)
	var discCount int
	for _, e := range evs1 {
		if e.Type == "DISCONNECT_BT" {
			discCount++
		}
	}
	if discCount != 1 {
		t.Fatalf("want one DISCONNECT_BT, got %d events=%v", discCount, evs1)
	}
	eng.SetLocalState(DeviceState{
		DeviceID:               localID,
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: false,
	})
	_ = drainEvents(eng.Events(), 16)
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "i", Seq: 2,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityIdle, Seq: 2},
	})
	evs2 := drainEvents(eng.Events(), 16)
	for _, e := range evs2 {
		if e.Type == "CONNECT_BT" {
			t.Fatalf("CONNECT_BT should be suppressed within opposing cooldown after DISCONNECT_BT, events=%v", evs2)
		}
	}
}

func TestEngine_BTDebounceSuppressionLogsOnceWithEngineSubsystem(t *testing.T) {
	old := bluetoothOpposingEventCooldown
	bluetoothOpposingEventCooldown = time.Hour
	t.Cleanup(func() { bluetoothOpposingEventCooldown = old })

	oldOut := defaultLogger.out
	t.Cleanup(func() { defaultLogger.out = oldOut })
	var buf bytes.Buffer
	defaultLogger.out = &buf
	SetGlobalMinLogLevel(LogLevelInfo)
	t.Cleanup(func() { SetGlobalMinLogLevel(LogLevelInfo) })

	localID := "QmL"
	peerID := "QmP"
	net := newRecordingNetwork()
	settings := aggressiveSettings()
	settings.SwitchCooldownMs.Value = 3600000
	eng := NewBCOEngine(DeviceState{
		DeviceID:               localID,
		DeviceName:             "LocalPhone",
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: true,
	}, "inst", net, nil, "", settings)
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "i", Seq: 1,
		State: &DeviceState{DeviceID: peerID, DeviceName: "PeerTab", AudioPriority: AudioPriorityActiveCall, Seq: 1},
	})
	_ = drainEvents(eng.Events(), 16)
	eng.SetLocalState(DeviceState{
		DeviceID:               localID,
		DeviceName:             "LocalPhone",
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: false,
	})
	_ = drainEvents(eng.Events(), 16)
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "i", Seq: 2,
		State: &DeviceState{DeviceID: peerID, DeviceName: "PeerTab", AudioPriority: AudioPriorityIdle, Seq: 2},
	})
	_ = drainEvents(eng.Events(), 16)
	// Second evaluate pass: suppression log is deduped (still within opposing cooldown).
	eng.EvaluateSync()

	out := buf.String()
	if !strings.Contains(out, "[INFO]") || !strings.Contains(out, "[Engine]") {
		t.Fatalf("expected INFO Engine log line, got %q", out)
	}
	if !strings.Contains(out, "suppressed Bluetooth shell event CONNECT_BT") {
		t.Fatalf("expected CONNECT_BT suppression message, got %q", out)
	}
	if !strings.Contains(out, "PeerTab") || !strings.Contains(out, "cooldown remaining") {
		t.Fatalf("expected peer name and cooldown remaining in log, got %q", out)
	}
	suppressCount := strings.Count(out, "suppressed Bluetooth shell event CONNECT_BT")
	if suppressCount != 1 {
		t.Fatalf("want exactly one suppression log for this episode, got %d in %q", suppressCount, out)
	}
}

func TestEngine_BTStableFalseDelaysConnectAfterBriefHasBTFlicker(t *testing.T) {
	localID := "QmL"
	peerID := "QmP"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:               localID,
		DeviceName:             "Me",
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: true,
	}, "inst", net, nil, "", aggressiveSettings())
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "i", Seq: 1,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityIdle, Seq: 1},
	})
	_ = drainEvents(eng.Events(), 32)
	eng.SetLocalState(DeviceState{
		DeviceID:               localID,
		DeviceName:             "Me",
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: false,
	})
	_ = drainEvents(eng.Events(), 32)
	for _, e := range drainEvents(eng.Events(), 16) {
		if e.Type == "CONNECT_BT" {
			t.Fatalf("CONNECT_BT should not fire within stable-false window after last BT=true, events=%v", e)
		}
	}
	time.Sleep(bluetoothStableFalseBeforeConnect + 50*time.Millisecond)
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "i", Seq: 2,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityActiveCall, Seq: 2},
	})
	_ = drainEvents(eng.Events(), 32)
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "i", Seq: 3,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityIdle, Seq: 3},
	})
	evs2 := drainEvents(eng.Events(), 16)
	var sawConnect bool
	for _, e := range evs2 {
		if e.Type == "CONNECT_BT" {
			sawConnect = true
		}
	}
	if !sawConnect {
		t.Fatalf("expected CONNECT_BT after stable false and winner hand back, events=%v", evs2)
	}
}

func TestEngine_StateDrivenConnectReEmitsWhileLocalStillWinner(t *testing.T) {
	old := bluetoothOpposingEventCooldown
	bluetoothOpposingEventCooldown = 0
	t.Cleanup(func() { bluetoothOpposingEventCooldown = old })

	settings := aggressiveSettings()
	settings.SwitchCooldownMs.Value = 0
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      "QmL",
		DeviceName:    "Phone",
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", settings)

	eng.EvaluateSync()
	evs1 := drainEvents(eng.Events(), 16)
	var connectCount1 int
	for _, ev := range evs1 {
		if ev.Type == "CONNECT_BT" {
			connectCount1++
		}
	}
	if connectCount1 != 1 {
		t.Fatalf("expected initial CONNECT_BT, got %d events=%v", connectCount1, evs1)
	}

	eng.SetLocalState(DeviceState{
		DeviceID:      "QmL",
		DeviceName:    "Phone",
		AudioPriority: AudioPriorityActiveCall,
	})
	evs2 := drainEvents(eng.Events(), 16)
	var connectCount2 int
	for _, ev := range evs2 {
		if ev.Type == "CONNECT_BT" {
			connectCount2++
		}
	}
	if connectCount2 != 1 {
		t.Fatalf("expected CONNECT_BT to re-emit while local is still winner without BT, got %d events=%v", connectCount2, evs2)
	}
}

func TestEngine_ActiveCallBeatsMediaDisconnect(t *testing.T) {
	localID := "QmA"
	peerID := "QmB"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:               localID,
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: true,
	}, "inst-a", net, nil, "", DefaultNetworkSettings())
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "ib", Seq: 1,
		State: &DeviceState{
			DeviceID: peerID, AudioPriority: AudioPriorityActiveCall, Seq: 1,
		},
	})
	evs := drainEvents(eng.Events(), 16)
	var sawDisconnect bool
	for _, e := range evs {
		if e.Type == "DISCONNECT_BT" {
			sawDisconnect = true
		}
	}
	if !sawDisconnect {
		t.Fatalf("expected DISCONNECT_BT when peer ActiveCall wins over local Media+BT, events=%v", evs)
	}
}

func TestEngine_TieBreakDeterministicSimultaneousClaims(t *testing.T) {
	idLo := "QmAAA"
	idHi := "QmZZZ"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      idLo,
		AudioPriority: AudioPriorityMedia,
	}, "inst-lo", net, nil, "", DefaultNetworkSettings())
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: idHi, InstanceID: "ih", Seq: 1,
		State: &DeviceState{DeviceID: idHi, AudioPriority: AudioPriorityMedia, Seq: 1},
	})
	w, ok := ResolveWinner(idLo, eng.LocalState().DeviceState, map[string]DeviceState{idHi: {DeviceID: idHi, AudioPriority: AudioPriorityMedia}}, DefaultNetworkSettings())
	if !ok || w != idLo {
		t.Fatalf("resolver tie-break: want %s got %q ok=%v", idLo, w, ok)
	}
}

func TestEngine_updateClaimLease_partitionClearsLocalPendingClaim(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "L", AudioPriority: AudioPriorityActiveCall}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.SetPendingClaim(&PendingClaim{WinnerID: "L", ExpiresAt: time.Now().Add(time.Hour)})
	eng.mu.Lock()
	eng.partitionLivenessLost = true
	eng.mu.Unlock()
	eng.EvaluateSync()
	if eng.PendingClaimSnapshot() != nil {
		t.Fatal("partition + local winner should clear pending claim")
	}
}

func TestEngine_updateClaimLease_suppressNextArmSkipsBroadcast(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "L", AudioPriority: AudioPriorityActiveCall}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.EvaluateSync()
	if !eng.ProcessInbound(&BCOMessage{Type: MsgClaimAck, SenderID: "QmP", InstanceID: "i", Seq: 1, Approved: ptrBool(false)}) {
		t.Fatal("denied ack")
	}
	// evaluateLocked inside ProcessInbound consumes suppressNextClaimArm without emitting another CLAIM_REQUEST.
	var nClaim int
	for _, m := range net.Broadcasts() {
		if m.Type == MsgClaimRequest {
			nClaim++
		}
	}
	if nClaim != 1 {
		t.Fatalf("want exactly one CLAIM_REQUEST (initial arm only), got %d", nClaim)
	}
}

func TestEngine_SecondEvaluateExtendsClaimLeaseWithoutExtraBroadcast(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmW", AudioPriority: AudioPriorityActiveCall}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.EvaluateSync()
	bc1 := len(net.Broadcasts())
	pc1 := eng.PendingClaimSnapshot()
	if pc1 == nil {
		t.Fatal("expected initial pending claim")
	}
	eng.EvaluateSync()
	if got := len(net.Broadcasts()); got != bc1 {
		t.Fatalf("second EvaluateSync should not broadcast another CLAIM_REQUEST, got %d want %d", got, bc1)
	}
	pc2 := eng.PendingClaimSnapshot()
	if pc2 == nil || !pc2.ExpiresAt.After(pc1.ExpiresAt) {
		t.Fatalf("expected extended lease, was %v now %v", pc1.ExpiresAt, pc2)
	}
}

func TestEngine_ClaimLeaseExpiryReEval(t *testing.T) {
	localID := "QmWin"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.EvaluateSync()
	if eng.PendingClaimSnapshot() == nil {
		t.Fatal("expected pending claim after local wins without BT")
	}
	eng.SetPendingClaim(&PendingClaim{WinnerID: localID, ExpiresAt: time.Now().Add(-time.Second)})
	eng.EvaluateSync()
	var sawRelease bool
	for _, m := range net.Broadcasts() {
		if m.Type == MsgClaimRelease {
			sawRelease = true
		}
	}
	if !sawRelease {
		t.Fatalf("expected CLAIM_RELEASE broadcast on lease expiry, got %+v", net.Broadcasts())
	}
	// Expiry clears the lease and re-evaluation re-arms a claim while local still wins without BT.
	if eng.PendingClaimSnapshot() == nil {
		t.Fatal("expected new pending claim after expiry re-eval")
	}
}

func TestEngine_ClaimAckApprovedExtendsLease(t *testing.T) {
	localID := "QmWin"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.EvaluateSync()
	pc := eng.PendingClaimSnapshot()
	if pc == nil {
		t.Fatal("expected pending claim")
	}
	deadline := pc.ExpiresAt
	eng.ProcessInbound(&BCOMessage{
		Type: MsgClaimAck, SenderID: "QmPeer", InstanceID: "ip", Seq: 1,
		Approved: ptrBool(true),
	})
	pc2 := eng.PendingClaimSnapshot()
	if pc2 == nil {
		t.Fatal("expected pending claim after ACK")
	}
	if !pc2.ExpiresAt.After(deadline) {
		t.Fatalf("expected extended lease after approved ACK, was %v now %v", deadline, pc2.ExpiresAt)
	}
}

func TestEngine_ClaimAckDeniedClearsClaim(t *testing.T) {
	localID := "QmWin"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.EvaluateSync()
	eng.ProcessInbound(&BCOMessage{
		Type: MsgClaimAck, SenderID: "QmPeer", InstanceID: "ip", Seq: 1,
		Approved: ptrBool(false),
	})
	if eng.PendingClaimSnapshot() != nil {
		t.Fatal("expected pending claim cleared on denied ACK")
	}
}

func TestEngine_ClaimRequestAckUsesResolution(t *testing.T) {
	localID := "QmLocal"
	claimer := "QmClaimer"
	net := newRecordingNetwork()
	local := DeviceState{DeviceID: localID, AudioPriority: AudioPriorityMedia}
	eng := NewBCOEngine(local, "inst-l", net, nil, "", DefaultNetworkSettings())
	eng.peers[claimer] = DeviceState{DeviceID: claimer, AudioPriority: AudioPriorityMedia}
	msg := &BCOMessage{
		Type: MsgClaimRequest, SenderID: claimer, InstanceID: "ic", Seq: 1,
		State: &DeviceState{DeviceID: claimer, AudioPriority: AudioPriorityActiveCall, Seq: 1},
	}
	if !eng.ProcessInbound(msg) {
		t.Fatal("expected claim request accepted")
	}
	sent := net.SendsTo(claimer)
	if len(sent) != 1 || sent[0].Type != MsgClaimAck || sent[0].Approved == nil || !*sent[0].Approved {
		t.Fatalf("expected approved CLAIM_ACK to claimer, got %+v", sent)
	}
}

func TestEngine_ClaimRequestAckSendReleasesEngineLock(t *testing.T) {
	localID := "QmLocal"
	claimer := "QmClaimer"
	net := newReentrantSendNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: localID, AudioPriority: AudioPriorityMedia}, "inst-l", net, nil, "", DefaultNetworkSettings())

	var once sync.Once
	sendEntered := make(chan struct{})
	net.onSend = func() {
		_ = eng.LocalState()
		once.Do(func() { close(sendEntered) })
	}

	msg := &BCOMessage{
		Type: MsgClaimRequest, SenderID: claimer, InstanceID: "ic", Seq: 1,
		State: &DeviceState{DeviceID: claimer, AudioPriority: AudioPriorityActiveCall, Seq: 1},
	}
	accepted := make(chan bool, 1)
	go func() {
		accepted <- eng.ProcessInbound(msg)
	}()

	select {
	case <-sendEntered:
	case <-time.After(500 * time.Millisecond):
		t.Fatal("CLAIM_ACK send did not allow reentrant engine access; engine lock may be held during Send")
	}
	select {
	case ok := <-accepted:
		if !ok {
			t.Fatal("expected claim request accepted")
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("ProcessInbound did not return after CLAIM_ACK send")
	}
}

func TestEngine_PeerRemovePersistAllowlist(t *testing.T) {
	tmp := t.TempDir()
	_ = EnsureStorageDir(tmp)
	al := NewPeerAllowlist()
	priv, _, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	id, err := peer.IDFromPublicKey(priv.GetPublic())
	if err != nil {
		t.Fatal(err)
	}
	pidStr := id.String()
	al.Add(id, "friend")
	if err := SaveAllowlistToStorage(al, tmp); err != nil {
		t.Fatal(err)
	}
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmSelf"}, "inst", net, al, tmp, DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{
		Type: MsgPeerRemove, SenderID: pidStr, InstanceID: "i", Seq: 1,
	}) {
		t.Fatal("peer remove")
	}
	state, err := LoadCRDTAllowlistFile(tmp)
	if err != nil {
		t.Fatal(err)
	}
	activeCount := 0
	for _, e := range state.Entries {
		if e.IsActive() {
			activeCount++
		}
	}
	if activeCount != 0 {
		t.Fatalf("allowlist should have no active entries after PEER_REMOVE, got %d", activeCount)
	}
}

func TestEngine_PeerPauseExcludedFromResolution(t *testing.T) {
	localID := "QmSelf"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		AudioPriority: AudioPriorityMedia,
	}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "i", Seq: 1,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityActiveCall, Seq: 1},
	})
	eng.ProcessInbound(&BCOMessage{
		Type: MsgPeerPause, SenderID: peerID, InstanceID: "i", Seq: 2,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityActiveCall, Paused: true, Seq: 2},
	})
	w, ok := ResolveWinner(localID, eng.LocalState().DeviceState, eng.peersCopy(), DefaultNetworkSettings())
	if !ok || w != localID {
		t.Fatalf("expected local to win when peer paused, got %q ok=%v peers=%+v", w, ok, eng.peersCopy())
	}
}

func (e *BCOEngine) peersCopy() map[string]DeviceState {
	e.mu.Lock()
	defer e.mu.Unlock()
	out := make(map[string]DeviceState, len(e.peers))
	for k, v := range e.peers {
		out[k] = v
	}
	return out
}

func ptrBool(b bool) *bool { return &b }

func TestEngine_StaleSeqDiscarded(t *testing.T) {
	localID := "QmSelf"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: localID}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "i", Seq: 2,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityMedia, Seq: 2},
	}) {
		t.Fatal("first update")
	}
	if eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "i", Seq: 1,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityActiveCall, Seq: 1},
	}) {
		t.Fatal("stale seq should be discarded")
	}
	st := eng.peersCopy()[peerID]
	if st.AudioPriority != AudioPriorityMedia {
		t.Fatalf("stale message must not apply, priority=%d", st.AudioPriority)
	}
}

func TestEngine_InstanceRestartResetsSeq(t *testing.T) {
	localID := "QmSelf"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: localID}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "old", Seq: 10,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityMedia, Seq: 10},
	}) {
		t.Fatal("first")
	}
	if !eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "new", Seq: 1,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityActiveCall, Seq: 1},
	}) {
		t.Fatal("restart with seq 1 should apply")
	}
	st := eng.peersCopy()[peerID]
	if st.AudioPriority != AudioPriorityActiveCall {
		t.Fatalf("expected ActiveCall after restart, got %d", st.AudioPriority)
	}
}

func TestEngine_JSONStateChangedPayload(t *testing.T) {
	ev := EngineEvent{Type: "STATE_CHANGED"}
	b, err := json.Marshal(ev)
	if err != nil {
		t.Fatal(err)
	}
	if string(b) != `{"type":"STATE_CHANGED"}` {
		t.Fatalf("unexpected JSON: %s", b)
	}
}

// US5 / FR-014: non-holders do not spam CLAIM_REQUEST while partitionLivenessLost is set.
func TestEngine_PartitionSuppressesNewClaimsForNonHolder(t *testing.T) {
	net := newRecordingNetwork()
	localID := "QmLocal"
	eng := NewBCOEngine(DeviceState{DeviceID: localID, AudioPriority: AudioPriorityActiveCall}, "inst", net, nil, "", DefaultNetworkSettings())
	ts := time.Now()
	eng.mu.Lock()
	eng.peers["QmB"] = DeviceState{DeviceID: "QmB", AudioPriority: AudioPriorityMedia, HasBluetoothConnection: true}
	eng.lastPeerStateAt["QmB"] = ts
	eng.peers["QmC"] = DeviceState{DeviceID: "QmC", AudioPriority: AudioPriorityIdle}
	eng.lastPeerStateAt["QmC"] = ts
	eng.mu.Unlock()

	eng.RemovePeerDueToLiveness("QmB")

	feed := eng.GetActivityFeed(4)
	var sawLeft bool
	for _, row := range feed {
		if row.Type == ActivityPeerLeft && strings.Contains(row.Message, "left") {
			sawLeft = true
			break
		}
	}
	if !sawLeft {
		t.Fatalf("expected peer_left activity after liveness removal, feed=%+v", feed)
	}

	before := len(net.Broadcasts())
	for i := 0; i < 3; i++ {
		eng.EvaluateSync()
	}
	var newClaims int
	bcasts := net.Broadcasts()
	for _, m := range bcasts[before:] {
		if m.Type == MsgClaimRequest {
			newClaims++
		}
	}
	if newClaims != 0 {
		t.Fatalf("expected no CLAIM_REQUEST while partitioned, got %d (broadcasts=%+v)", newClaims, bcasts[before:])
	}
}

// US5: fresh STATE_UPDATE clears partition hold so claims can resume.
func TestEngine_StateUpdateClearsPartitionHold(t *testing.T) {
	net := newRecordingNetwork()
	localID := "QmLocal"
	eng := NewBCOEngine(DeviceState{DeviceID: localID, AudioPriority: AudioPriorityActiveCall}, "inst", net, nil, "", DefaultNetworkSettings())
	ts := time.Now()
	eng.mu.Lock()
	eng.peers["QmB"] = DeviceState{DeviceID: "QmB", AudioPriority: AudioPriorityIdle}
	eng.lastPeerStateAt["QmB"] = ts
	eng.peers["QmC"] = DeviceState{DeviceID: "QmC", AudioPriority: AudioPriorityIdle}
	eng.lastPeerStateAt["QmC"] = ts
	eng.mu.Unlock()
	eng.RemovePeerDueToLiveness("QmB")

	before := len(net.Broadcasts())
	if !eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: "QmC", InstanceID: "ic", Seq: 2,
		State: &DeviceState{DeviceID: "QmC", AudioPriority: AudioPriorityIdle, Seq: 2},
	}) {
		t.Fatal("expected state update accepted")
	}

	var newClaims int
	bcasts2 := net.Broadcasts()
	for _, m := range bcasts2[before:] {
		if m.Type == MsgClaimRequest {
			newClaims++
		}
	}
	if newClaims == 0 {
		t.Fatalf("expected CLAIM_REQUEST after partition heal, broadcasts=%+v", bcasts2[before:])
	}
}

// US5 / FR-014 (1): BT holder ignores phantom remote winner during partition.
func TestEngine_PartitionHolderSkipsDisconnectBT(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:               localID,
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: true,
	}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "ip", Seq: 1,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityActiveCall, Seq: 1},
	}) {
		t.Fatal("expected peer state")
	}
	_ = drainEvents(eng.Events(), 32)

	eng.mu.Lock()
	eng.partitionLivenessLost = true
	eng.mu.Unlock()

	eng.EvaluateSync()
	for _, e := range drainEvents(eng.Events(), 16) {
		if e.Type == "DISCONNECT_BT" {
			t.Fatalf("unexpected DISCONNECT_BT for BT holder during partition")
		}
	}
}

// US5 / spec freshness: stale registry entries behave as Idle in resolution.
func TestEngine_StalePeerDowngradesForResolution(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:               localID,
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: true,
	}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.mu.Lock()
	eng.peers[peerID] = DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityActiveCall}
	eng.lastPeerStateAt[peerID] = time.Now().Add(-PeerStateFreshnessLimit - time.Second)
	eng.mu.Unlock()

	eng.EvaluateSync()
	for _, e := range drainEvents(eng.Events(), 16) {
		if e.Type == "DISCONNECT_BT" {
			t.Fatalf("stale remote ActiveCall must not win resolution; got DISCONNECT_BT")
		}
	}
}

func TestEngine_Stop_ClosesEventsIdempotent(t *testing.T) {
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", newRecordingNetwork(), nil, "", DefaultNetworkSettings())
	ch := eng.Events()
	eng.Stop()
	if _, ok := <-ch; ok {
		t.Fatal("Events channel should be closed after Stop")
	}
	eng.Stop()
}

func TestEngine_TryEmitAfterStop_DoesNotPanic(t *testing.T) {
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", newRecordingNetwork(), nil, "", DefaultNetworkSettings())
	eng.Stop()
	eng.TryEmitEvent(EngineEvent{Type: "STATE_CHANGED"})
}

func TestEngine_PeerStatesJSON_LocalStateJSON(t *testing.T) {
	net := newRecordingNetwork()
	net.SetRecordingTransportPeers([]string{"QmP"})
	eng := NewBCOEngine(DeviceState{
		DeviceID:      "QmLocal",
		DeviceName:    "Me",
		AudioPriority: AudioPriorityMedia,
		Seq:           5,
	}, "inst", net, nil, "", DefaultNetworkSettings())
	// Inject registry entry without inbound/evaluate side effects on local.Seq.
	eng.mu.Lock()
	eng.peers["QmP"] = DeviceState{DeviceID: "QmP", DeviceName: "Peer", AudioPriority: AudioPriorityIdle, Seq: 1}
	eng.lastPeerStateAt["QmP"] = time.Now()
	eng.mu.Unlock()
	pj, err := eng.PeerStatesJSON()
	if err != nil {
		t.Fatal(err)
	}
	var peers []DeviceState
	if err := json.Unmarshal(pj, &peers); err != nil {
		t.Fatal(err)
	}
	if len(peers) != 1 {
		t.Fatalf("PeerStatesJSON: want 1 peer, got %d", len(peers))
	}
	if peers[0].DeviceID != "QmP" || peers[0].DeviceName != "Peer" || !peers[0].Connected {
		t.Fatalf("PeerStatesJSON should set connected=true for C API snapshot, got %+v", peers[0])
	}
	lj, err := eng.LocalStateJSON()
	if err != nil {
		t.Fatal(err)
	}
	var local LocalState
	if err := json.Unmarshal(lj, &local); err != nil {
		t.Fatal(err)
	}
	if local.DeviceID != "QmLocal" || local.DeviceName != "Me" || local.Seq != 5 {
		t.Fatalf("LocalStateJSON mismatch: %+v", local)
	}
}

func TestEngine_PeerStatesJSON_MergeTransportOnly(t *testing.T) {
	priv, _, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	remoteID, err := peer.IDFromPublicKey(priv.GetPublic())
	if err != nil {
		t.Fatal(err)
	}
	remoteStr := remoteID.String()
	net := newRecordingNetwork()
	net.SetRecordingTransportPeers([]string{remoteStr})
	al := NewPeerAllowlist()
	al.Add(remoteID, "LAN Buddy")
	eng := NewBCOEngine(DeviceState{DeviceID: "QmLocal"}, "inst", net, al, "", DefaultNetworkSettings())
	pj, err := eng.PeerStatesJSON()
	if err != nil {
		t.Fatal(err)
	}
	var peers []DeviceState
	if err := json.Unmarshal(pj, &peers); err != nil {
		t.Fatal(err)
	}
	if len(peers) != 1 {
		t.Fatalf("want 1 merged transport-only peer, got %d: %+v", len(peers), peers)
	}
	p := peers[0]
	if p.DeviceID != remoteStr || p.DeviceName != "LAN Buddy" || !p.Connected || p.AudioPriority != AudioPriorityIdle {
		t.Fatalf("unexpected transport-only row: %+v", p)
	}
}

func TestEngine_PeerStatesJSON_RegistryDisconnectedWhenExplicitTransportEmpty(t *testing.T) {
	net := newRecordingNetwork()
	net.SetRecordingTransportPeers([]string{})
	eng := NewBCOEngine(DeviceState{DeviceID: "QmLocal"}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.mu.Lock()
	eng.peers["QmP"] = DeviceState{DeviceID: "QmP", DeviceName: "Peer", AudioPriority: AudioPriorityMedia, Seq: 1}
	eng.lastPeerStateAt["QmP"] = time.Now()
	eng.mu.Unlock()
	pj, err := eng.PeerStatesJSON()
	if err != nil {
		t.Fatal(err)
	}
	var peers []DeviceState
	if err := json.Unmarshal(pj, &peers); err != nil {
		t.Fatal(err)
	}
	if len(peers) != 1 || peers[0].Connected {
		t.Fatalf("want registry peer with connected=false, got %+v", peers)
	}
}

func TestEngine_SetPausedSelf_RecordsOutboundPauseResume(t *testing.T) {
	net := newRecordingNetwork()
	localID := "QmLocal"
	eng := NewBCOEngine(DeviceState{DeviceID: localID, AudioPriority: AudioPriorityMedia}, "inst-l", net, nil, "", DefaultNetworkSettings())
	eng.SetPausedSelf(true)
	var lastPause *BCOMessage
	for _, m := range net.Broadcasts() {
		if m.Type == MsgPeerPause {
			lastPause = m
		}
	}
	if lastPause == nil {
		t.Fatalf("want PEER_PAUSE in broadcasts, got %+v", net.Broadcasts())
	}
	if lastPause.SenderID != localID || lastPause.State == nil || !lastPause.State.Paused {
		t.Fatalf("pause broadcast fields: %+v", lastPause)
	}
	eng.SetPausedSelf(false)
	var lastResume *BCOMessage
	for _, m := range net.Broadcasts() {
		if m.Type == MsgPeerResume {
			lastResume = m
		}
	}
	if lastResume == nil {
		t.Fatalf("want PEER_RESUME in broadcasts, got %+v", net.Broadcasts())
	}
	if lastResume.State == nil || lastResume.State.Paused {
		t.Fatalf("resume broadcast state: %+v", lastResume.State)
	}
}

func TestEngine_SetLocalState_UpdatesAndEmits(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL", AudioPriority: AudioPriorityIdle}, "inst", net, nil, "", DefaultNetworkSettings())
	_ = drainEvents(eng.Events(), 32)
	eng.SetLocalState(DeviceState{DeviceID: "QmL", AudioPriority: AudioPriorityMedia, Seq: 9})
	if st := eng.LocalState(); st.AudioPriority != AudioPriorityMedia {
		t.Fatalf("LocalState after SetLocalState: %+v", st)
	}
	var saw bool
	for _, e := range drainEvents(eng.Events(), 8) {
		if e.Type == "STATE_CHANGED" {
			saw = true
		}
	}
	if !saw {
		t.Fatal("expected STATE_CHANGED after SetLocalState")
	}
}

func TestEngine_RemovePeerLocal_ClearsPeerFromSnapshot(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: "QmP", InstanceID: "ip", Seq: 1,
		State: &DeviceState{DeviceID: "QmP", Seq: 1},
	}) {
		t.Fatal("inbound")
	}
	_ = drainEvents(eng.Events(), 16)
	eng.RemovePeerLocal("QmP")
	pj, err := eng.PeerStatesJSON()
	if err != nil {
		t.Fatal(err)
	}
	var peers []DeviceState
	if err := json.Unmarshal(pj, &peers); err != nil {
		t.Fatal(err)
	}
	if len(peers) != 0 {
		t.Fatalf("expected empty peer list, got %+v", peers)
	}
}

func TestEngine_RemovePeersLocal_SingleEmitClearsPartition(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: "a", InstanceID: "ia", Seq: 1,
		State: &DeviceState{DeviceID: "a", Seq: 1},
	}) {
		t.Fatal("peer a")
	}
	if !eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: "b", InstanceID: "ib", Seq: 1,
		State: &DeviceState{DeviceID: "b", Seq: 1},
	}) {
		t.Fatal("peer b")
	}
	_ = drainEvents(eng.Events(), 32)
	eng.mu.Lock()
	eng.partitionLivenessLost = true
	eng.mu.Unlock()
	eng.RemovePeersLocal([]string{"a", "b"})
	var n int
	for _, e := range drainEvents(eng.Events(), 8) {
		if e.Type == "STATE_CHANGED" {
			n++
		}
	}
	if n != 1 {
		t.Fatalf("RemovePeersLocal should emit at most one STATE_CHANGED, got %d", n)
	}
	eng.mu.Lock()
	pl := eng.partitionLivenessLost
	eng.mu.Unlock()
	if pl {
		t.Fatal("RemovePeersLocal should clear partitionLivenessLost")
	}
}

func TestEngine_RemovePeersLocal_EmptyNoEmit(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.RemovePeersLocal(nil)
	eng.RemovePeersLocal([]string{})
	if n := len(net.Broadcasts()); n != 0 {
		t.Fatalf("empty RemovePeersLocal should not broadcast, got %d", n)
	}
}

func TestEngine_RemoveAllowlistedPeer_PersistsAndDecodesError(t *testing.T) {
	tmp := t.TempDir()
	if err := EnsureStorageDir(tmp); err != nil {
		t.Fatal(err)
	}
	al := NewPeerAllowlist()
	priv, _, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	id, err := peer.IDFromPublicKey(priv.GetPublic())
	if err != nil {
		t.Fatal(err)
	}
	pidStr := id.String()
	al.Add(id, "buddy")
	if err := SaveAllowlistToStorage(al, tmp); err != nil {
		t.Fatal(err)
	}
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmSelf"}, "inst", net, al, tmp, DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: pidStr, InstanceID: "i", Seq: 1,
		State: &DeviceState{DeviceID: pidStr, Seq: 1},
	}) {
		t.Fatal("peer join")
	}
	if err := eng.RemoveAllowlistedPeer("not-a-valid-peer-id"); err == nil {
		t.Fatal("expected decode error for invalid peer id")
	}
	if err := eng.RemoveAllowlistedPeer(pidStr); err != nil {
		t.Fatal(err)
	}
	state, err := LoadCRDTAllowlistFile(tmp)
	if err != nil {
		t.Fatal(err)
	}
	activeCount := 0
	for _, e := range state.Entries {
		if e.IsActive() {
			activeCount++
		}
	}
	if activeCount != 0 {
		t.Fatalf("allowlist should have no active entries after RemoveAllowlistedPeer, got %d", activeCount)
	}
	pj, err := eng.PeerStatesJSON()
	if err != nil {
		t.Fatal(err)
	}
	var peers []DeviceState
	if err := json.Unmarshal(pj, &peers); err != nil {
		t.Fatal(err)
	}
	if len(peers) != 0 {
		t.Fatalf("peer should be removed from registry, got %+v", peers)
	}
}

func TestEngine_ExtendClaimLeaseForBTProgress(t *testing.T) {
	localID := "QmWin"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: localID, AudioPriority: AudioPriorityActiveCall}, "inst", net, nil, "", DefaultNetworkSettings())
	short := time.Now().Add(2 * time.Second)
	eng.SetPendingClaim(&PendingClaim{WinnerID: localID, ExpiresAt: short})
	old := eng.PendingClaimSnapshot().ExpiresAt
	eng.ExtendClaimLeaseForBTProgress()
	pc := eng.PendingClaimSnapshot()
	if pc == nil {
		t.Fatal("expected pending claim still present")
	}
	if !pc.ExpiresAt.After(old) {
		t.Fatalf("expected lease extended toward ClaimLeaseDuration, was %v now %v", old, pc.ExpiresAt)
	}
	eng.SetPendingClaim(&PendingClaim{WinnerID: "other", ExpiresAt: time.Now().Add(time.Hour)})
	before := eng.PendingClaimSnapshot().ExpiresAt
	eng.ExtendClaimLeaseForBTProgress()
	after := eng.PendingClaimSnapshot().ExpiresAt
	if !after.Equal(before) {
		t.Fatalf("ExtendClaimLeaseForBTProgress should no-op when winner is not local, before=%v after=%v", before, after)
	}
	eng.SetPendingClaim(nil)
	eng.ExtendClaimLeaseForBTProgress()
	if eng.PendingClaimSnapshot() != nil {
		t.Fatal("no-op with nil lease should leave nil")
	}
}

func TestNoopNetwork_MethodsAreCallable(t *testing.T) {
	var n noopNetwork
	n.Broadcast(nil)
	if err := n.Send("", nil); err != nil {
		t.Fatalf("noop Send: %v", err)
	}
	if addrs := n.ListenMultiaddrs(); addrs != nil {
		t.Fatalf("ListenMultiaddrs: want nil, got %v", addrs)
	}
	if err := n.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	if ids := n.TransportConnectedPeerIDs(); ids != nil {
		t.Fatalf("TransportConnectedPeerIDs: want nil, got %v", ids)
	}
}

func TestEngine_NilNetworkUsesNoop(t *testing.T) {
	localID := "QmL"
	eng := NewBCOEngine(DeviceState{DeviceID: localID}, "inst", nil, nil, "", DefaultNetworkSettings())
	eng.Broadcast(&BCOMessage{Type: MsgStateUpdate, SenderID: localID, InstanceID: "i", Seq: 1})
	if err := eng.Send("peer", &BCOMessage{Type: MsgStateUpdate, SenderID: localID, InstanceID: "i", Seq: 2}); err != nil {
		t.Fatalf("Send via noop: %v", err)
	}
}

func TestEngine_UpdateNetworkSettingNormalizesInvalidForceConnectTimeouts(t *testing.T) {
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", newRecordingNetwork(), nil, "", DefaultNetworkSettings())
	now := time.Date(2026, 4, 25, 11, 0, 0, 0, time.UTC)

	if err := eng.UpdateNetworkSetting("forceConnectDisconnectTimeoutMs", 0, now); err != nil {
		t.Fatal(err)
	}
	if err := eng.UpdateNetworkSetting("forceConnectConnectTimeoutMs", -1, now.Add(time.Millisecond)); err != nil {
		t.Fatal(err)
	}

	got := eng.NetworkSettingsSnapshot()
	defaults := DefaultNetworkSettings()
	if got.ForceConnectDisconnectTimeoutMs.Value != defaults.ForceConnectDisconnectTimeoutMs.Value {
		t.Fatalf("disconnect timeout: got %d want %d", got.ForceConnectDisconnectTimeoutMs.Value, defaults.ForceConnectDisconnectTimeoutMs.Value)
	}
	if got.ForceConnectConnectTimeoutMs.Value != defaults.ForceConnectConnectTimeoutMs.Value {
		t.Fatalf("connect timeout: got %d want %d", got.ForceConnectConnectTimeoutMs.Value, defaults.ForceConnectConnectTimeoutMs.Value)
	}
}

func TestCloneDeviceState_nil(t *testing.T) {
	if cloneDeviceState(nil) != nil {
		t.Fatal("cloneDeviceState(nil) must be nil")
	}
}

func TestEngine_ProcessInbound_rejectsBadInputs(t *testing.T) {
	localID := "QmSelf"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: localID}, "inst", net, nil, "", DefaultNetworkSettings())
	if eng.ProcessInbound(nil) {
		t.Fatal("nil message")
	}
	if eng.ProcessInbound(&BCOMessage{Type: "NOT_A_REAL_TYPE", SenderID: "p", InstanceID: "i", Seq: 1}) {
		t.Fatal("unknown type")
	}
	if eng.ProcessInbound(&BCOMessage{Type: MsgStateUpdate, SenderID: "", InstanceID: "i", Seq: 1, State: &DeviceState{}}) {
		t.Fatal("empty sender")
	}
	if eng.ProcessInbound(&BCOMessage{Type: MsgStateUpdate, SenderID: localID, InstanceID: "i", Seq: 1, State: &DeviceState{}}) {
		t.Fatal("sender equals local")
	}
}

func TestEngine_ProcessInbound_deviceJoinNilStateReturnsTrue(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{Type: MsgDeviceJoin, SenderID: "QmP", InstanceID: "i", Seq: 1, State: nil}) {
		t.Fatal("nil State device join")
	}
}

func TestEngine_ProcessInbound_stateUpdateNilStateReturnsTrue(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{Type: MsgStateUpdate, SenderID: "QmP", InstanceID: "i", Seq: 1, State: nil}) {
		t.Fatal("nil State should return true without applying peer map")
	}
	if _, ok := eng.peersCopy()["QmP"]; ok {
		t.Fatal("peer map should not get entry when State nil")
	}
}

func TestEngine_ProcessInbound_peerPauseNilState(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{Type: MsgPeerPause, SenderID: "QmP", InstanceID: "i", Seq: 1, State: nil}) {
		t.Fatal("nil State peer pause")
	}
}

func TestEngine_ProcessInbound_claimRequestNilState(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{Type: MsgClaimRequest, SenderID: "QmP", InstanceID: "i", Seq: 1, State: nil}) {
		t.Fatal("claim request accepted")
	}
	if len(net.SendsTo("QmP")) != 0 {
		t.Fatal("nil state claim request should not send ack")
	}
}

func TestEngine_ProcessInbound_claimAckNilApproved(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{Type: MsgClaimAck, SenderID: "QmP", InstanceID: "i", Seq: 1, Approved: nil}) {
		t.Fatal("ack")
	}
}

func TestEngine_ProcessInbound_settingsSyncPiggybacksPeerState(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	msg := &BCOMessage{
		Type:       MsgSettingsSync,
		SenderID:   "QmP",
		InstanceID: "i",
		Seq:        1,
		State: &DeviceState{
			DeviceID:               "QmP",
			DeviceName:             "Pixel",
			AudioPriority:          AudioPriorityActiveCall,
			HasBluetoothConnection: true,
			Seq:                    1,
		},
	}
	if !eng.ProcessInbound(msg) {
		t.Fatal("settings sync with piggybacked state")
	}
	ps, ok := eng.peersCopy()["QmP"]
	if !ok {
		t.Fatal("expected piggybacked state to populate peer map")
	}
	if ps.DeviceName != "Pixel" || ps.AudioPriority != AudioPriorityActiveCall || !ps.HasBluetoothConnection {
		t.Fatalf("unexpected piggybacked peer state: %+v", ps)
	}
	var sawStateChanged bool
	for _, ev := range drainEvents(eng.Events(), 8) {
		if ev.Type == "STATE_CHANGED" {
			sawStateChanged = true
		}
	}
	if !sawStateChanged {
		t.Fatal("expected STATE_CHANGED after piggybacked state application")
	}
}

func TestEngine_ProcessInbound_peerRemoveWithoutPriorState(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{Type: MsgPeerRemove, SenderID: "QmP", InstanceID: "i", Seq: 1}) {
		t.Fatal("peer remove")
	}
}

func TestEngine_ProcessInbound_deviceLeaveClearsPeer(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: "QmP", InstanceID: "i1", Seq: 1,
		State: &DeviceState{DeviceID: "QmP", Seq: 1},
	}) {
		t.Fatal("seed peer")
	}
	if !eng.ProcessInbound(&BCOMessage{Type: MsgDeviceLeave, SenderID: "QmP", InstanceID: "i1", Seq: 2}) {
		t.Fatal("device leave")
	}
	if _, ok := eng.peersCopy()["QmP"]; ok {
		t.Fatal("peer should be removed on DEVICE_LEAVE")
	}
}

func TestEngine_ProcessInbound_claimReleaseEvaluates(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL", AudioPriority: AudioPriorityActiveCall}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{Type: MsgClaimRelease, SenderID: "QmP", InstanceID: "i", Seq: 1}) {
		t.Fatal("claim release")
	}
}

func TestEngine_ProcessInbound_peerResumeWithDeviceNameEmitsEvents(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	if !eng.ProcessInbound(&BCOMessage{
		Type: MsgPeerResume, SenderID: "QmP", InstanceID: "i", Seq: 1,
		State: &DeviceState{DeviceID: "QmP", DeviceName: "Alice", Seq: 1},
	}) {
		t.Fatal("peer resume")
	}
	var sawResume bool
	for _, e := range drainEvents(eng.Events(), 8) {
		if e.Type == "PEER_RESUMED" {
			sawResume = true
		}
	}
	if !sawResume {
		t.Fatal("expected PEER_RESUMED event")
	}
}

func TestEngine_PollEvent_coalescesOverflowedStateChanged(t *testing.T) {
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", newRecordingNetwork(), nil, "", DefaultNetworkSettings())
	for i := 0; i < 64; i++ {
		eng.TryEmitEvent(EngineEvent{Type: "STATE_CHANGED"})
	}
	eng.TryEmitEvent(EngineEvent{Type: "STATE_CHANGED"})
	ev, ok := eng.PollEvent(5 * time.Millisecond)
	if !ok || ev.Type != "STATE_CHANGED" {
		t.Fatalf("expected coalesced STATE_CHANGED, ok=%v ev=%+v", ok, ev)
	}
}

func TestEngine_SwitchHistory_RecordAndQuery(t *testing.T) {
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", newRecordingNetwork(), nil, "", DefaultNetworkSettings())
	if got := eng.GetSwitchHistory(); got != nil {
		t.Fatalf("empty history: %v", got)
	}
	eng.RecordSwitchEvent(SwitchEvent{
		Timestamp: 1000, FromPeerID: "A", ToPeerID: "B", Trigger: SwitchTriggerPriority,
	})
	eng.RecordSwitchEvent(SwitchEvent{
		Timestamp: 2000, FromPeerID: "B", ToPeerID: "C", Trigger: SwitchTriggerForce,
	})
	got := eng.GetSwitchHistory()
	if len(got) != 2 {
		t.Fatalf("history len: %d", len(got))
	}
	if got[0].Timestamp != 2000 || got[1].Timestamp != 1000 {
		t.Fatalf("history order: %+v", got)
	}
}

func TestEngine_SwitchHistory_RingBufferEviction(t *testing.T) {
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", newRecordingNetwork(), nil, "", DefaultNetworkSettings())
	for i := 0; i < 110; i++ {
		eng.RecordSwitchEvent(SwitchEvent{Timestamp: int64(i)})
	}
	got := eng.GetSwitchHistory()
	if len(got) != 100 {
		t.Fatalf("expected 100 entries, got %d", len(got))
	}
	if got[0].Timestamp != 109 || got[99].Timestamp != 10 {
		t.Fatalf("eviction: first=%d last=%d", got[0].Timestamp, got[99].Timestamp)
	}
}

func TestEngine_ActivityFeed_RecordAndQuery(t *testing.T) {
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", newRecordingNetwork(), nil, "", DefaultNetworkSettings())
	if got := eng.GetActivityFeed(0); got != nil {
		t.Fatalf("empty feed: %v", got)
	}
	eng.RecordActivity(ActivitySwitch, "Switched to X", "X")
	eng.RecordActivity(ActivityConnect, "Connected to Y", "Y")
	eng.RecordActivity(ActivityPeerJoined, "Z joined", "Z")

	got := eng.GetActivityFeed(0)
	if len(got) != 3 {
		t.Fatalf("feed len: %d", len(got))
	}
	if got[0].Type != ActivityPeerJoined || got[2].Type != ActivitySwitch {
		t.Fatalf("feed order: %+v", got)
	}
	if got[0].ID == "" || got[1].ID == "" || got[2].ID == "" {
		t.Fatal("IDs should be auto-generated")
	}
	if got[0].ID == got[1].ID || got[1].ID == got[2].ID {
		t.Fatal("IDs should be unique")
	}
}

func TestEngine_ActivityFeed_Limited(t *testing.T) {
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", newRecordingNetwork(), nil, "", DefaultNetworkSettings())
	for i := 0; i < 10; i++ {
		eng.RecordActivity(ActivitySwitch, "event", "")
	}
	got := eng.GetActivityFeed(3)
	if len(got) != 3 {
		t.Fatalf("limited feed len: %d", len(got))
	}
}

func TestEngine_ActivityFeed_RingBufferEviction(t *testing.T) {
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", newRecordingNetwork(), nil, "", DefaultNetworkSettings())
	for i := 0; i < 210; i++ {
		eng.RecordActivity(ActivitySwitch, fmt.Sprintf("event %d", i), "")
	}
	got := eng.GetActivityFeed(0)
	if len(got) != 200 {
		t.Fatalf("expected 200 entries, got %d", len(got))
	}
}

func TestEngine_WinnerChange_RecordsSwitchEvent(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:               localID,
		DeviceName:             "My Phone",
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: true,
	}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.EvaluateSync()
	_ = drainEvents(eng.Events(), 32)

	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "ip", Seq: 1,
		State: &DeviceState{DeviceID: peerID, DeviceName: "MacBook Pro", AudioPriority: AudioPriorityActiveCall, Seq: 1},
	})
	_ = drainEvents(eng.Events(), 32)

	history := eng.GetSwitchHistory()
	if len(history) == 0 {
		t.Fatal("expected switch event when winner changes")
	}
	ev := history[0]
	if ev.FromPeerID != localID || ev.ToPeerID != peerID {
		t.Fatalf("switch from=%s to=%s, want from=%s to=%s", ev.FromPeerID, ev.ToPeerID, localID, peerID)
	}
	if ev.ToPeerName != "MacBook Pro" {
		t.Fatalf("toPeerName=%q want MacBook Pro", ev.ToPeerName)
	}
	if ev.Trigger != SwitchTriggerPriority {
		t.Fatalf("trigger=%q want priority", ev.Trigger)
	}
}

func TestEngine_FirstWinner_RecordsSwitchEvent(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      "QmL",
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.EvaluateSync()
	history := eng.GetSwitchHistory()
	if len(history) != 1 {
		t.Fatalf("first winner should record a switch for analytics, got %+v", history)
	}
	if history[0].ToPeerID != "QmL" || history[0].FromPeerID != "" {
		t.Fatalf("unexpected first switch: %+v", history[0])
	}
}

func TestEngine_DeviceJoin_RecordsActivity(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.ProcessInbound(&BCOMessage{
		Type: MsgDeviceJoin, SenderID: "QmP", InstanceID: "i", Seq: 1,
		State: &DeviceState{DeviceID: "QmP", DeviceName: "Pixel", Seq: 1},
	})
	feed := eng.GetActivityFeed(0)
	var found bool
	for _, e := range feed {
		if e.Type == ActivityPeerJoined && e.PeerName == "Pixel" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected peer_joined activity for Pixel, feed=%+v", feed)
	}
}

func TestEngine_DeviceLeave_RecordsActivity(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: "QmP", InstanceID: "i", Seq: 1,
		State: &DeviceState{DeviceID: "QmP", DeviceName: "Pixel", Seq: 1},
	})
	eng.ProcessInbound(&BCOMessage{
		Type: MsgDeviceLeave, SenderID: "QmP", InstanceID: "i", Seq: 2,
	})
	feed := eng.GetActivityFeed(0)
	var found bool
	for _, e := range feed {
		if e.Type == ActivityPeerLeft && e.PeerName == "Pixel" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected peer_left activity for Pixel, feed=%+v", feed)
	}
}

func TestEngine_PeerPauseResume_RecordsActivity(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.ProcessInbound(&BCOMessage{
		Type: MsgPeerPause, SenderID: "QmP", InstanceID: "i", Seq: 1,
		State: &DeviceState{DeviceID: "QmP", DeviceName: "Pixel", Paused: true, Seq: 1},
	})
	eng.ProcessInbound(&BCOMessage{
		Type: MsgPeerResume, SenderID: "QmP", InstanceID: "i", Seq: 2,
		State: &DeviceState{DeviceID: "QmP", DeviceName: "Pixel", Paused: false, Seq: 2},
	})
	feed := eng.GetActivityFeed(0)
	var foundPause, foundResume bool
	for _, e := range feed {
		if e.Type == ActivityPeerPaused && e.PeerName == "Pixel" {
			foundPause = true
		}
		if e.Type == ActivityPeerResumed && e.PeerName == "Pixel" {
			foundResume = true
		}
	}
	if !foundPause || !foundResume {
		t.Fatalf("expected peer_paused and peer_resumed, got pause=%v resume=%v feed=%+v", foundPause, foundResume, feed)
	}
}

func TestEngine_PeerRemove_RecordsDisconnectActivity(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{DeviceID: "QmL"}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: "QmP", InstanceID: "i", Seq: 1,
		State: &DeviceState{DeviceID: "QmP", DeviceName: "Pixel", Seq: 1},
	})
	eng.ProcessInbound(&BCOMessage{
		Type: MsgPeerRemove, SenderID: "QmP", InstanceID: "i", Seq: 2,
	})
	feed := eng.GetActivityFeed(0)
	var found bool
	for _, e := range feed {
		if e.Type == ActivityDisconnect && e.PeerName == "Pixel" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected disconnect activity for Pixel, feed=%+v", feed)
	}
}

func TestEngine_ConnectBT_NoActivityOnEmission(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		DeviceName:    "My Phone",
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", aggressiveSettings())
	eng.mu.Lock()
	eng.local.HeadsetDisplayName = "Buds4 Pro"
	eng.mu.Unlock()
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "ip", Seq: 1,
		State: &DeviceState{DeviceID: peerID, DeviceName: "MacBook", AudioPriority: AudioPriorityIdle, Seq: 1},
	})
	evs := drainEvents(eng.Events(), 32)
	var gotConnect bool
	for _, ev := range evs {
		if ev.Type == "CONNECT_BT" {
			gotConnect = true
		}
	}
	if !gotConnect {
		t.Fatal("expected CONNECT_BT event")
	}
	feed := eng.GetActivityFeed(0)
	for _, e := range feed {
		if e.Type == ActivityConnect || e.Type == ActivitySwitch {
			t.Fatalf("no connect/switch activity should be recorded at CONNECT_BT emission time, got %q", e.Message)
		}
	}
}

func TestEngine_ConnectBT_RecordsConnectActivity(t *testing.T) {
	localID := "QmLocal"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		DeviceName:    "My Phone",
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", aggressiveSettings())
	eng.mu.Lock()
	eng.local.HeadsetDisplayName = "Buds4 Pro"
	eng.recordBTGainedActivityLocked()
	eng.mu.Unlock()

	feed := eng.GetActivityFeed(0)
	var found bool
	for _, e := range feed {
		if e.Type == ActivityConnect {
			found = true
			if e.Message != "Connected Buds4 Pro to My Phone" || e.PeerName != "Buds4 Pro" {
				t.Fatalf("connect activity: got message=%q peerName=%q", e.Message, e.PeerName)
			}
		}
	}
	if !found {
		t.Fatalf("expected connect activity on actual BT gain, feed=%+v", feed)
	}
}

func TestEngine_ConnectBT_ActivityUsesSavedHeadsetWhenDisplayNameEmpty(t *testing.T) {
	localID := "QmLocal"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		DeviceName:    "My Phone",
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", aggressiveSettings())
	eng.mu.Lock()
	eng.recordBTGainedActivityLocked()
	eng.mu.Unlock()

	feed := eng.GetActivityFeed(0)
	var found bool
	for _, e := range feed {
		if e.Type == ActivityConnect {
			found = true
			if e.Message != "Connected saved headset to My Phone" || e.PeerName != "saved headset" {
				t.Fatalf("connect activity: got message=%q peerName=%q", e.Message, e.PeerName)
			}
		}
	}
	if !found {
		t.Fatalf("expected connect activity on actual BT gain, feed=%+v", feed)
	}
}

func TestEngine_ConnectBT_RecordsSwitchWhenPeerHadBT(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		DeviceName:    "My Phone",
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", aggressiveSettings())
	eng.mu.Lock()
	eng.local.HeadsetDisplayName = "Buds4 Pro"
	eng.peers[peerID] = DeviceState{
		DeviceID: peerID, DeviceName: "MacBook",
		HasBluetoothConnection: true,
	}
	eng.recordBTGainedActivityLocked()
	eng.mu.Unlock()

	feed := eng.GetActivityFeed(0)
	var found bool
	for _, e := range feed {
		if e.Type == ActivitySwitch {
			found = true
			if e.Message != "Switched Buds4 Pro from MacBook to My Phone" {
				t.Fatalf("switch activity: got message=%q", e.Message)
			}
		}
	}
	if !found {
		t.Fatalf("expected switch activity when peer held BT, feed=%+v", feed)
	}
}

func TestEngine_ConnectBT_SwitchFallsBackToLastKnownHolder(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		DeviceName:    "My Phone",
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", aggressiveSettings())
	eng.mu.Lock()
	eng.local.HeadsetDisplayName = "Buds4 Pro"
	eng.lastKnownBTHolder = "MacBook"
	eng.peers[peerID] = DeviceState{
		DeviceID: peerID, DeviceName: "MacBook",
		HasBluetoothConnection: false,
	}
	eng.recordBTGainedActivityLocked()
	eng.mu.Unlock()

	feed := eng.GetActivityFeed(0)
	var found bool
	for _, e := range feed {
		if e.Type == ActivitySwitch {
			found = true
			if e.Message != "Switched Buds4 Pro from MacBook to My Phone" {
				t.Fatalf("switch activity: got message=%q", e.Message)
			}
		}
	}
	if !found {
		t.Fatalf("expected switch activity using lastKnownBTHolder fallback, feed=%+v", feed)
	}
}

func TestEngine_DisconnectBT_RecordsDisconnectOnActualBTLoss(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:               localID,
		DeviceName:             "My Phone",
		AudioPriority:          AudioPriorityIdle,
		HasBluetoothConnection: true,
	}, "inst", net, nil, "", DefaultNetworkSettings())
	eng.mu.Lock()
	eng.local.HeadsetDisplayName = "Buds4 Pro"
	eng.mu.Unlock()
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "ip", Seq: 1,
		State: &DeviceState{DeviceID: peerID, DeviceName: "MacBook", AudioPriority: AudioPriorityActiveCall, Seq: 1},
	})
	evs := drainEvents(eng.Events(), 32)
	var gotDisconnect bool
	for _, ev := range evs {
		if ev.Type == "DISCONNECT_BT" {
			gotDisconnect = true
		}
	}
	if !gotDisconnect {
		t.Fatal("expected DISCONNECT_BT event")
	}
	feed := eng.GetActivityFeed(0)
	for _, e := range feed {
		if e.Type == ActivitySwitch || e.Type == ActivityDisconnect {
			t.Fatalf("no switch/disconnect activity should be recorded at DISCONNECT_BT emission time, got %q", e.Message)
		}
	}

	eng.mu.Lock()
	eng.local.HasBluetoothConnection = false
	eng.recordBTLostActivityLocked()
	eng.mu.Unlock()

	feed = eng.GetActivityFeed(0)
	var disconnectMsg string
	for _, e := range feed {
		if e.Type == ActivityDisconnect {
			disconnectMsg = e.Message
		}
	}
	if disconnectMsg != "Disconnected Buds4 Pro from My Phone" {
		t.Fatalf("disconnect activity: got %q", disconnectMsg)
	}
}

func TestEngine_ConnectBT_RetriedAfterPeerReleasesBT(t *testing.T) {
	origCooldown := bluetoothOpposingEventCooldown
	bluetoothOpposingEventCooldown = 2 * time.Second
	defer func() { bluetoothOpposingEventCooldown = origCooldown }()

	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		DeviceName:    "My Phone",
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", DefaultNetworkSettings())

	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "ip", Seq: 1,
		State: &DeviceState{
			DeviceID: peerID, DeviceName: "MacBook",
			AudioPriority:          AudioPriorityIdle,
			HasBluetoothConnection: true, Seq: 1,
		},
	})
	evs := drainEvents(eng.Events(), 32)
	var firstConnect bool
	for _, ev := range evs {
		if ev.Type == "CONNECT_BT" {
			firstConnect = true
		}
	}
	if !firstConnect {
		t.Fatal("expected initial CONNECT_BT when local wins priority")
	}

	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "ip", Seq: 2,
		State: &DeviceState{
			DeviceID: peerID, DeviceName: "MacBook",
			AudioPriority:          AudioPriorityIdle,
			HasBluetoothConnection: false, Seq: 2,
		},
	})
	evs = drainEvents(eng.Events(), 32)
	var retryConnect bool
	for _, ev := range evs {
		if ev.Type == "CONNECT_BT" {
			retryConnect = true
		}
	}
	if !retryConnect {
		t.Fatal("expected CONNECT_BT retry after peer released headset")
	}
}

func TestEngine_SmartSafetyPolicy_AllowsConnectAfterPeerRelease(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		DeviceName:    "My Phone",
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", DefaultNetworkSettings())

	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "ip", Seq: 1,
		State: &DeviceState{
			DeviceID: peerID, DeviceName: "MacBook",
			AudioPriority:          AudioPriorityIdle,
			HasBluetoothConnection: true, Seq: 1,
		},
	})
	_ = drainEvents(eng.Events(), 32)

	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "ip", Seq: 2,
		State: &DeviceState{
			DeviceID: peerID, DeviceName: "MacBook",
			AudioPriority:          AudioPriorityIdle,
			HasBluetoothConnection: false, Seq: 2,
		},
	})

	eng.mu.Lock()
	allowed := eng.btSafetyPolicyAllowsConnect(time.Now())
	eng.mu.Unlock()
	if !allowed {
		t.Fatal("smart safety policy should allow connect within grace window after peer released headset")
	}
}

func TestEngine_BtSafetyPolicyUsesFreshnessAdjustedPeerView(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		DeviceName:    "My Phone",
		AudioPriority: AudioPriorityActiveCall,
	}, "inst", net, nil, "", DefaultNetworkSettings())

	now := time.Now()
	eng.mu.Lock()
	eng.peers[peerID] = DeviceState{
		DeviceID:               peerID,
		DeviceName:             "MacBook",
		AudioPriority:          AudioPriorityIdle,
		HasBluetoothConnection: true,
	}
	eng.lastPeerStateAt[peerID] = now.Add(-PeerStateFreshnessLimit - time.Second)
	eng.lastKnownBTHolderAt = now.Add(-btSafetyRecentBTGrace - time.Second)
	allowed := eng.btSafetyPolicyAllowsConnect(now)
	eng.mu.Unlock()

	if allowed {
		t.Fatal("smart safety policy should not trust stale peer HasBluetoothConnection=true outside grace")
	}
}

func TestEngine_ForceConnect_AlreadyHoldingHeadset(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:               "QmL",
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: true,
	}, "inst", net, nil, "", DefaultNetworkSettings())
	result := eng.ForceConnect()
	if !result {
		t.Fatal("ForceConnect should return true when already holding headset")
	}
	evs := drainEvents(eng.Events(), 8)
	var found bool
	for _, e := range evs {
		if e.Type == "FORCE_CONNECT_RESULT" && e.Success != nil && *e.Success {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected FORCE_CONNECT_RESULT success=true, events=%+v", evs)
	}
}

func TestEngine_ForceConnect_BoostsPriorityClaimsAndWaitsForLocalConnect(t *testing.T) {
	localID := "QmLocal"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		DeviceName:    "My Phone",
		AudioPriority: AudioPriorityIdle,
	}, "inst", net, nil, "", forceConnectSettings())

	done := make(chan bool, 1)
	go func() {
		done <- eng.ForceConnect()
	}()

	if _, ok := waitForEventType(eng.Events(), "CONNECT_BT", 300*time.Millisecond); !ok {
		t.Fatal("expected CONNECT_BT after force connect boost")
	}
	eng.SetLocalState(DeviceState{
		DeviceID:               localID,
		DeviceName:             "My Phone",
		AudioPriority:          AudioPriorityActiveCall,
		HasBluetoothConnection: true,
	})
	result := <-done
	bcs := net.Broadcasts()
	var sawStateUpdate, sawClaim bool
	for _, m := range bcs {
		if m.Type == MsgStateUpdate && m.State != nil && m.State.AudioPriority == AudioPriorityActiveCall {
			sawStateUpdate = true
		}
		if m.Type == MsgClaimRequest {
			sawClaim = true
		}
	}
	if !sawStateUpdate {
		t.Fatal("ForceConnect should broadcast STATE_UPDATE with ActiveCall priority")
	}
	if !sawClaim {
		t.Fatal("ForceConnect should broadcast CLAIM_REQUEST")
	}

	ls := eng.LocalState()
	if ls.AudioPriority != AudioPriorityIdle {
		t.Fatalf("priority should be restored to Idle, got %d", ls.AudioPriority)
	}

	evs := drainEvents(eng.Events(), 16)
	var foundResult bool
	for _, e := range evs {
		if e.Type == "FORCE_CONNECT_RESULT" && e.Success != nil && *e.Success {
			foundResult = true
		}
	}
	if !foundResult {
		t.Fatal("expected FORCE_CONNECT_RESULT success event")
	}
	if !result {
		t.Fatal("ForceConnect should succeed after local BT confirmation")
	}
}

func TestEngine_ForceConnect_WaitsForPeerReleaseBeforeConnectEvent(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		DeviceName:    "My Phone",
		AudioPriority: AudioPriorityIdle,
	}, "inst", net, nil, "", forceConnectSettings())
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "peer-inst", Seq: 1,
		State: &DeviceState{
			DeviceID:               peerID,
			DeviceName:             "MacBook",
			AudioPriority:          AudioPriorityIdle,
			HasBluetoothConnection: true,
			Seq:                    1,
		},
	})
	_ = drainEvents(eng.Events(), 16)

	done := make(chan bool, 1)
	go func() {
		done <- eng.ForceConnect()
	}()

	time.Sleep(75 * time.Millisecond)
	for _, ev := range drainQueuedEvents(eng.Events(), 16) {
		if ev.Type == "CONNECT_BT" {
			t.Fatalf("CONNECT_BT should wait for peer BT release, got events=%+v", ev)
		}
	}

	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "peer-inst", Seq: 2,
		State: &DeviceState{
			DeviceID:               peerID,
			DeviceName:             "MacBook",
			AudioPriority:          AudioPriorityIdle,
			HasBluetoothConnection: false,
			Seq:                    2,
		},
	})
	if _, ok := waitForEventType(eng.Events(), "CONNECT_BT", 300*time.Millisecond); !ok {
		t.Fatal("expected CONNECT_BT after peer released BT")
	}
	eng.SetLocalState(DeviceState{
		DeviceID:               localID,
		DeviceName:             "My Phone",
		AudioPriority:          AudioPriorityActiveCall,
		HasBluetoothConnection: true,
	})
	if !<-done {
		t.Fatal("ForceConnect should succeed after peer release and local connect")
	}
}

func TestEngine_ForceConnect_FailsWhenLocalConnectNotObserved(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      "QmLocal",
		DeviceName:    "My Phone",
		AudioPriority: AudioPriorityMedia,
	}, "inst", net, nil, "", shortForceConnectSettings())

	if eng.ForceConnect() {
		t.Fatal("ForceConnect should fail when local BT never connects")
	}
	evs := drainEvents(eng.Events(), 16)
	var foundFailure bool
	for _, ev := range evs {
		if ev.Type == "FORCE_CONNECT_RESULT" && ev.Success != nil && !*ev.Success &&
			ev.Reason != nil && strings.Contains(*ev.Reason, "local BT connect") {
			foundFailure = true
		}
	}
	if !foundFailure {
		t.Fatalf("expected FORCE_CONNECT_RESULT failure with local connect timeout, events=%+v", evs)
	}
}

func TestEngineEvent_JSONWithSuccessField(t *testing.T) {
	s := true
	ev := EngineEvent{Type: "FORCE_CONNECT_RESULT", Success: &s}
	b, err := json.Marshal(ev)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	if m["success"] != true {
		t.Fatalf("expected success=true in JSON, got %s", b)
	}

	ev2 := EngineEvent{Type: "STATE_CHANGED"}
	b2, _ := json.Marshal(ev2)
	var m2 map[string]any
	_ = json.Unmarshal(b2, &m2)
	if _, ok := m2["success"]; ok {
		t.Fatalf("success should be omitted when nil, got %s", b2)
	}
}

// TestEngine_LocalBroadcastState_GraceHeldValue verifies that while the media-pause
// grace window is active, LocalBroadcastState() returns the pre-drop AudioPriority
// along with AudioPriorityHeldUntilMs and AudioPriorityRaw, so peers and the local
// engine agree on the effective tier during the grace window. This prevents the
// reconnect-loop pattern where a peer steals the headset based on the momentarily
// dropped priority while the local engine still considers itself the winner.
func TestEngine_LocalBroadcastState_GraceHeldValue(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      "QmLocal",
		DeviceName:    "Phone",
		AudioPriority: AudioPriorityMedia,
	}, "inst", net, nil, "", DefaultNetworkSettings())

	// Drop real priority to Idle and arm grace.
	eng.SetLocalState(DeviceState{
		DeviceID:      "QmLocal",
		DeviceName:    "Phone",
		AudioPriority: AudioPriorityIdle,
	})
	eng.NotifyAudioPriorityDrop(AudioPriorityMedia, AudioPriorityIdle)

	rawLS := eng.LocalState()
	if rawLS.AudioPriority != AudioPriorityIdle {
		t.Fatalf("LocalState() should return the raw (dropped) priority, got %v", rawLS.AudioPriority)
	}

	bst := eng.LocalBroadcastState()
	if bst.AudioPriority != AudioPriorityMedia {
		t.Fatalf("LocalBroadcastState() should return grace-held priority (Media), got %v", bst.AudioPriority)
	}
	if bst.AudioPriorityRaw != AudioPriorityIdle {
		t.Fatalf("LocalBroadcastState() should populate AudioPriorityRaw with the real priority (Idle), got %v", bst.AudioPriorityRaw)
	}
	if bst.AudioPriorityHeldUntilMs == 0 {
		t.Fatal("LocalBroadcastState() should populate AudioPriorityHeldUntilMs while grace is active")
	}
	nowMs := time.Now().UnixMilli()
	if bst.AudioPriorityHeldUntilMs <= nowMs {
		t.Fatalf("AudioPriorityHeldUntilMs=%d should be in the future relative to now=%d", bst.AudioPriorityHeldUntilMs, nowMs)
	}
}

// TestEngine_LocalBroadcastState_NoGraceWhenIdleDropHasNoPriorBoost verifies that
// LocalBroadcastState() returns the raw state unchanged when no grace is active
// (e.g., priority was already Idle before the call).
func TestEngine_LocalBroadcastState_NoGraceWhenIdleDropHasNoPriorBoost(t *testing.T) {
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      "QmLocal",
		DeviceName:    "Phone",
		AudioPriority: AudioPriorityIdle,
	}, "inst", net, nil, "", DefaultNetworkSettings())

	bst := eng.LocalBroadcastState()
	if bst.AudioPriority != AudioPriorityIdle {
		t.Fatalf("without grace, LocalBroadcastState() should return raw priority (Idle), got %v", bst.AudioPriority)
	}
	if bst.AudioPriorityHeldUntilMs != 0 {
		t.Fatalf("AudioPriorityHeldUntilMs should be zero without grace, got %d", bst.AudioPriorityHeldUntilMs)
	}
	if bst.AudioPriorityRaw != 0 {
		t.Fatalf("AudioPriorityRaw should be zero without grace, got %v", bst.AudioPriorityRaw)
	}
}

// TestEngine_LocalBroadcastState_DisabledWhenGraceMsZero verifies that when the
// MediaPauseGraceMs setting is zero, no grace hold is applied even after a drop.
func TestEngine_LocalBroadcastState_DisabledWhenGraceMsZero(t *testing.T) {
	settings := DefaultNetworkSettings()
	settings.MediaPauseGraceMs = SettingValue[int]{Value: 0, UpdatedAt: 1}
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      "QmLocal",
		DeviceName:    "Phone",
		AudioPriority: AudioPriorityMedia,
	}, "inst", net, nil, "", settings)

	eng.SetLocalState(DeviceState{
		DeviceID:      "QmLocal",
		DeviceName:    "Phone",
		AudioPriority: AudioPriorityIdle,
	})
	eng.NotifyAudioPriorityDrop(AudioPriorityMedia, AudioPriorityIdle)

	bst := eng.LocalBroadcastState()
	if bst.AudioPriority != AudioPriorityIdle {
		t.Fatalf("with MediaPauseGraceMs=0 no grace should apply; got %v", bst.AudioPriority)
	}
	if bst.AudioPriorityHeldUntilMs != 0 {
		t.Fatalf("AudioPriorityHeldUntilMs should be zero when grace disabled, got %d", bst.AudioPriorityHeldUntilMs)
	}
}

// TestEngine_PeerWithGraceHeldPriorityWinsResolution verifies that when a peer
// broadcasts a grace-held priority (Media) in its STATE_UPDATE, the local engine's
// priority resolution treats that peer as Media and therefore does not steal the
// headset by becoming the winner.
func TestEngine_PeerWithGraceHeldPriorityWinsResolution(t *testing.T) {
	localID := "QmA" // lexicographically lower
	peerID := "QmB"
	net := newRecordingNetwork()
	// Local is idle (would otherwise lose to any peer at Media or above).
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		DeviceName:    "Local",
		AudioPriority: AudioPriorityMedia,
	}, "inst", net, nil, "", DefaultNetworkSettings())

	// Peer reports grace-held Media with raw Idle (matches what the new broadcast logic sends).
	heldUntil := time.Now().Add(5 * time.Second).UnixMilli()
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "peer-inst", Seq: 1,
		State: &DeviceState{
			DeviceID:                 peerID,
			AudioPriority:            AudioPriorityMedia,
			AudioPriorityRaw:         AudioPriorityIdle,
			AudioPriorityHeldUntilMs: heldUntil,
			HasBluetoothConnection:   true, // sticky bonus applies
			Seq:                      1,
		},
	})

	peers := eng.peersCopy()
	local := eng.LocalState().DeviceState
	winner, ok := ResolveWinner(localID, local, peers, DefaultNetworkSettings())
	if !ok {
		t.Fatal("ResolveWinner should produce a winner")
	}
	// Peer has Media(100) + stickiness(50) = 150; local has Media(100). Peer must win.
	if winner != peerID {
		t.Fatalf("peer with grace-held Media + stickiness should win over local Media; got %q", winner)
	}
}

// TestEngine_ReconnectStormBackoff_SuppressesFastCONNECT_BT verifies that after a
// CONNECT_BT is immediately followed by an external disconnect (the "headset was
// stolen" pattern), the engine suppresses subsequent CONNECT_BT emissions for an
// exponentially-growing backoff window even if local is still the priority winner.
func TestEngine_ReconnectStormBackoff_SuppressesFastCONNECT_BT(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	settings := aggressiveSettings()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      localID,
		DeviceName:    "Phone",
		AudioPriority: AudioPriorityMedia,
	}, "inst", net, nil, "", settings)

	// Register a peer so the engine has someone to lose BT to, but peer is Idle so
	// local is the rightful winner.
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "pi", Seq: 1,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityIdle, Seq: 1},
	})

	// First evaluation: local has no BT, local wins → CONNECT_BT emitted.
	eng.SetLocalState(DeviceState{
		DeviceID:               localID,
		DeviceName:             "Phone",
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: false,
	})
	evs1 := drainEvents(eng.Events(), 16)
	sawConnect1 := false
	for _, e := range evs1 {
		if e.Type == "CONNECT_BT" {
			sawConnect1 = true
			break
		}
	}
	if !sawConnect1 {
		t.Fatalf("expected first CONNECT_BT, got %v", evs1)
	}

	// Shell reports BT gained.
	eng.SetLocalState(DeviceState{
		DeviceID:               localID,
		DeviceName:             "Phone",
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: true,
	})
	eng.mu.Lock()
	eng.recordBTGainedActivityLocked()
	eng.mu.Unlock()
	_ = drainEvents(eng.Events(), 16)

	// Shell reports BT lost *externally* (we did NOT emit DISCONNECT_BT) within the
	// storm-detection window.
	eng.SetLocalState(DeviceState{
		DeviceID:               localID,
		DeviceName:             "Phone",
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: false,
	})
	eng.mu.Lock()
	eng.recordBTLostActivityLocked()
	eng.mu.Unlock()

	// Now trigger another evaluation — local is still the winner, but storm backoff
	// should suppress CONNECT_BT.
	eng.EvaluateSync()
	evs2 := drainEvents(eng.Events(), 16)
	for _, e := range evs2 {
		if e.Type == "CONNECT_BT" {
			t.Fatalf("CONNECT_BT should be suppressed by reconnect-storm backoff, events=%v", evs2)
		}
	}
}

// TestEngine_ReconnectStormBackoff_NotTriggeredByIntentionalDisconnect verifies that
// an engine-initiated DISCONNECT_BT (tracked via btDisconnectOutstanding) does NOT
// arm the storm backoff, because the disconnect was intentional (handover to a peer).
// Mirrors the BCOSendStateUpdate call order: recordBTLostActivityLocked runs BEFORE
// evaluateLocked so btDisconnectOutstanding is still set when we check it.
func TestEngine_ReconnectStormBackoff_NotTriggeredByIntentionalDisconnect(t *testing.T) {
	localID := "QmLocal"
	peerID := "QmPeer"
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:               localID,
		DeviceName:             "Phone",
		AudioPriority:          AudioPriorityMedia,
		HasBluetoothConnection: true,
	}, "inst", net, nil, "", DefaultNetworkSettings())

	// Peer with ActiveCall wins → engine emits DISCONNECT_BT and sets btDisconnectOutstanding.
	eng.ProcessInbound(&BCOMessage{
		Type: MsgStateUpdate, SenderID: peerID, InstanceID: "pi", Seq: 1,
		State: &DeviceState{DeviceID: peerID, AudioPriority: AudioPriorityActiveCall, Seq: 1},
	})
	_ = drainEvents(eng.Events(), 16)

	// Verify btDisconnectOutstanding is set by the DISCONNECT_BT emission.
	eng.mu.Lock()
	if !eng.btDisconnectOutstanding {
		eng.mu.Unlock()
		t.Fatal("setup failure: btDisconnectOutstanding should be set after engine-initiated DISCONNECT_BT")
	}
	// Pretend we recently emitted CONNECT_BT so the "recent connect attempt" predicate
	// is true (to ensure it's the intentional-disconnect flag, not the predicate,
	// that prevents storm tripping).
	eng.lastConnectBTEmittedAt = time.Now()
	// Drop local BT locally, then call recordBTLostActivityLocked in the same
	// order BCOSendStateUpdate does (before updateBluetoothEventsLocked clears
	// btDisconnectOutstanding).
	eng.local.HasBluetoothConnection = false
	stormAttemptsBefore := eng.reconnectStormAttempts
	eng.recordBTLostActivityLocked()
	stormAttemptsAfter := eng.reconnectStormAttempts
	eng.mu.Unlock()
	if stormAttemptsAfter != stormAttemptsBefore {
		t.Fatalf("intentional disconnect should NOT arm storm backoff; attempts went %d -> %d",
			stormAttemptsBefore, stormAttemptsAfter)
	}
}

// TestEngine_CapiBroadcastHoldsPriorityDuringGrace simulates the Android reconnect
// loop end-to-end: the shell reports priority dropping from Media to Idle (which
// triggers capi.go's arm-grace-before-broadcast logic). The resulting broadcast
// must carry AudioPriority=Media (held) and AudioPriorityHeldUntilMs so peers
// don't race to steal the headset.
func TestEngine_CapiBroadcastHoldsPriorityDuringGrace(t *testing.T) {
	// Drive the whole arming+broadcast path the way BCOSendStateUpdate does, but
	// in-process (no cgo). We set priority to Media via SetLocalState, then simulate
	// the shell dropping it to Idle with grace armed (equivalent to what the capi
	// path now does atomically).
	net := newRecordingNetwork()
	eng := NewBCOEngine(DeviceState{
		DeviceID:      "QmLocal",
		DeviceName:    "Phone",
		AudioPriority: AudioPriorityMedia,
	}, "inst", net, nil, "", DefaultNetworkSettings())

	// Mirror BCOSendStateUpdate's atomic "set local then arm grace then broadcast" sequence.
	eng.mu.Lock()
	eng.local.AudioPriority = AudioPriorityIdle
	eng.armAudioPriorityGraceLocked(AudioPriorityMedia)
	bst := eng.localBroadcastStateLocked(time.Now())
	eng.mu.Unlock()

	if bst.AudioPriority != AudioPriorityMedia {
		t.Fatalf("broadcast state during grace should hold Media, got %v", bst.AudioPriority)
	}
	if bst.AudioPriorityRaw != AudioPriorityIdle {
		t.Fatalf("broadcast state AudioPriorityRaw should be Idle, got %v", bst.AudioPriorityRaw)
	}
	if bst.AudioPriorityHeldUntilMs == 0 {
		t.Fatal("broadcast state AudioPriorityHeldUntilMs should be set while grace is active")
	}
}
