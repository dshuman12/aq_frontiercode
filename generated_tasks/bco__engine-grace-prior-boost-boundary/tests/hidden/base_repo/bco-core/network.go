package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"maps"
	"sync"
	"time"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/connmgr"
	"github.com/libp2p/go-libp2p/core/control"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/protocol"
	"github.com/libp2p/go-libp2p/p2p/discovery/mdns"
	rcmgr "github.com/libp2p/go-libp2p/p2p/host/resource-manager"
	"github.com/libp2p/go-libp2p/p2p/protocol/ping"
	"github.com/libp2p/go-msgio"
	ma "github.com/multiformats/go-multiaddr"
	manet "github.com/multiformats/go-multiaddr/net"
)

const (
	bcoProtocolID  = protocol.ID("/bco/1.0.0")
	maxBCOMsgBytes = 8192
	mdnsServiceTag = "bco-1-0-0"

	// Liveness (contracts/protocol.md — Liveness Protocol)
	pingLivenessInterval       = 5 * time.Second
	pingLivenessAttemptTimeout = 4 * time.Second
	pingFailuresBeforeDead     = 2
)

// BCONetwork wires libp2p transport, FR-021 handshake, allowlist gating, and engine callbacks (US2).
type BCONetwork struct {
	host    host.Host
	engine  *BCOEngine
	ctx     context.Context
	cancel  context.CancelFunc
	wg      sync.WaitGroup
	mdnsSvc mdns.Service

	allowlist   *CRDTAllowlist
	pending     *PendingPairing
	storagePath string

	appRL *peerAppRateLimiter
	ipRL  *inboundIPRateLimiter

	mu            sync.Mutex
	stopped       bool
	pairingSent   map[peer.ID]struct{}
	joinedEmitted map[peer.ID]struct{}

	manualPeersMu sync.RWMutex
	manualPeers   map[string]string // peer ID string → last successful manual dial multiaddr

	pingFailMu              sync.Mutex
	consecutivePingFailures map[peer.ID]int
}

type bcoConnGater struct {
	ip *inboundIPRateLimiter
}

func (g *bcoConnGater) InterceptPeerDial(peer.ID) bool { return true }

func (g *bcoConnGater) InterceptAddrDial(peer.ID, ma.Multiaddr) bool { return true }

func (g *bcoConnGater) InterceptAccept(c network.ConnMultiaddrs) bool {
	if g.ip == nil {
		return true
	}
	ra := c.RemoteMultiaddr()
	ipStr := remoteIPString(ra)
	if !g.ip.allow(ipStr, time.Now()) {
		defaultLogger.Warn(LogNetwork, fmt.Sprintf("rejecting inbound connection from %s: per-IP rate limit", ipStr))
		return false
	}
	return true
}

func (g *bcoConnGater) InterceptSecured(network.Direction, peer.ID, network.ConnMultiaddrs) bool {
	return true
}

func (g *bcoConnGater) InterceptUpgraded(network.Conn) (bool, control.DisconnectReason) {
	return true, 0
}

var _ connmgr.ConnectionGater = (*bcoConnGater)(nil)

func remoteIPString(m ma.Multiaddr) string {
	if m == nil {
		return ""
	}
	ip, err := manet.ToIP(m)
	if err != nil {
		return ""
	}
	return ip.String()
}

func newResourceManager() (network.ResourceManager, error) {
	defaults := rcmgr.DefaultLimits.AutoScale()
	cfg := rcmgr.PartialLimitConfig{
		System: rcmgr.ResourceLimits{
			ConnsInbound:    rcmgr.LimitVal(8),
			ConnsOutbound:   rcmgr.LimitVal(8),
			StreamsInbound:  rcmgr.LimitVal(32),
			StreamsOutbound: rcmgr.LimitVal(32),
			FD:              rcmgr.LimitVal(16),
		},
	}
	lim := rcmgr.NewFixedLimiter(cfg.Build(defaults))
	return rcmgr.NewResourceManager(lim)
}

// NewHostForStorage builds a libp2p host using the identity in storagePath (TCP, Noise, yamux per plan).
func NewHostForStorage(ctx context.Context, storagePath string) (host.Host, error) {
	priv, err := LoadOrCreateIdentityKey(storagePath)
	if err != nil {
		return nil, err
	}
	rm, err := newResourceManager()
	if err != nil {
		return nil, err
	}
	ipRL := newInboundIPRateLimiter()
	g := &bcoConnGater{ip: ipRL}
	opts := []libp2p.Option{
		libp2p.Identity(priv),
		libp2p.ListenAddrStrings("/ip4/0.0.0.0/tcp/0", "/ip6/::/tcp/0"),
		libp2p.ResourceManager(rm),
		libp2p.ConnectionGater(g),
	}
	h, err := libp2p.New(opts...)
	if err != nil {
		return nil, err
	}
	return h, nil
}

// AttachBCONetwork constructs the BCO protocol facade around an existing host and engine.
func AttachBCONetwork(ctx context.Context, h host.Host, eng *BCOEngine, allowlist *CRDTAllowlist, pending *PendingPairing, storagePath string) (*BCONetwork, error) {
	cctx, cancel := context.WithCancel(ctx)
	n := &BCONetwork{
		host:                    h,
		engine:                  eng,
		ctx:                     cctx,
		cancel:                  cancel,
		allowlist:               allowlist,
		pending:                 pending,
		storagePath:             storagePath,
		appRL:                   newPeerAppRateLimiter(),
		ipRL:                    nil,
		pairingSent:             make(map[peer.ID]struct{}),
		joinedEmitted:           make(map[peer.ID]struct{}),
		consecutivePingFailures: make(map[peer.ID]int),
	}
	mp, err := LoadManualPeersFile(storagePath)
	if err != nil {
		cancel()
		return nil, err
	}
	n.manualPeers = mp
	eng.net = n
	h.SetStreamHandler(bcoProtocolID, n.handleStream)
	n.registerDisconnectNotifee()
	svc := newBCOMDNSService(h, &mdnsNotifee{n: n})
	n.mdnsSvc = svc
	if err := svc.Start(); err != nil {
		cancel()
		return nil, err
	}
	defaultLogger.Info(LogNetwork, "mDNS discovery started")
	n.startManualPeerRedialGoroutine()
	n.startPingLivenessLoop()
	return n, nil
}

func (n *BCONetwork) startManualPeerRedialGoroutine() {
	n.wg.Add(1)
	go func() {
		defer n.wg.Done()
		select {
		case <-time.After(200 * time.Millisecond):
		case <-n.ctx.Done():
			return
		}
		ctx, cancel := context.WithTimeout(n.ctx, 2*time.Minute)
		defer cancel()
		n.RedialPersistedManualPeers(ctx)
	}()
}

// startPingLivenessLoop runs FR-012 / protocol.md Liveness Protocol: ping each connected
// allowlisted peer every 5s; two consecutive failures close the connection and remove peer state.
func (n *BCONetwork) startPingLivenessLoop() {
	n.wg.Add(1)
	go func() {
		defer n.wg.Done()
		ticker := time.NewTicker(pingLivenessInterval)
		defer ticker.Stop()
		for {
			select {
			case <-n.ctx.Done():
				return
			case <-ticker.C:
				n.runPingLivenessTick()
			}
		}
	}()
}

func (n *BCONetwork) runPingLivenessTick() {
	n.mu.Lock()
	stopped := n.stopped
	n.mu.Unlock()
	if stopped {
		return
	}
	for _, pid := range n.host.Network().Peers() {
		if pid == n.host.ID() {
			continue
		}
		if n.host.Network().Connectedness(pid) != network.Connected {
			continue
		}
		if !n.allowlist.IsAllowed(pid) {
			continue
		}
		pctx, cancel := context.WithTimeout(n.ctx, pingLivenessAttemptTimeout)
		ch := ping.Ping(pctx, n.host, pid)
		var pingErr error
		select {
		case res, ok := <-ch:
			if !ok {
				pingErr = errors.New("ping channel closed")
			} else if res.Error != nil {
				pingErr = res.Error
			}
		case <-pctx.Done():
			pingErr = pctx.Err()
		}
		cancel()

		if pingErr == nil {
			n.pingFailMu.Lock()
			delete(n.consecutivePingFailures, pid)
			n.pingFailMu.Unlock()
			continue
		}
		n.pingFailMu.Lock()
		n.consecutivePingFailures[pid]++
		nFails := n.consecutivePingFailures[pid]
		n.pingFailMu.Unlock()
		defaultLogger.Debug(LogNetwork, fmt.Sprintf("ping to %s failed (%d/%d): %v", pid, nFails, pingFailuresBeforeDead, pingErr))
		if nFails >= pingFailuresBeforeDead {
			defaultLogger.Warn(LogNetwork, fmt.Sprintf("liveness: declaring peer dead after ping failures peer=%s", pid))
			n.declarePeerDeadFromPing(pid)
		}
	}
}

func (n *BCONetwork) declarePeerDeadFromPing(id peer.ID) {
	n.pingFailMu.Lock()
	delete(n.consecutivePingFailures, id)
	n.pingFailMu.Unlock()
	// Run off the ping tick stack: ClosePeer can synchronously re-enter network notifiees.
	go n.dropAllowlistedPeerAfterTransportLoss(id)
}

// dropAllowlistedPeerAfterTransportLoss clears orchestration state when we can no longer reach
// an allowlisted peer (ping failures or last libp2p connection closed). Complements the ping
// loop: after link loss Connectedness is often not Connected, so ping ticks would skip the peer.
func (n *BCONetwork) dropAllowlistedPeerAfterTransportLoss(id peer.ID) {
	n.mu.Lock()
	stopped := n.stopped
	n.mu.Unlock()
	if stopped {
		return
	}
	if !n.allowlist.IsAllowed(id) {
		return
	}
	n.mu.Lock()
	_, hadJoined := n.joinedEmitted[id]
	delete(n.joinedEmitted, id)
	delete(n.pairingSent, id)
	n.mu.Unlock()

	if hadJoined {
		name := n.allowlistDisplayName(id)
		ps := id.String()
		n.engine.TryEmitEvent(EngineEvent{Type: "PEER_LEFT", PeerName: &name, PeerID: &ps})
	}
	if n.appRL != nil {
		n.appRL.resetPeer(id)
	}
	_ = n.host.Network().ClosePeer(id)
	n.engine.RemovePeerDueToLiveness(id.String())
}

func (n *BCONetwork) registerDisconnectNotifee() {
	nb := &network.NotifyBundle{
		DisconnectedF: func(_ network.Network, c network.Conn) {
			n.onLibp2pDisconnected(c.RemotePeer())
		},
	}
	n.host.Network().Notify(nb)
}

func (n *BCONetwork) onLibp2pDisconnected(id peer.ID) {
	if id == n.host.ID() {
		return
	}
	n.mu.Lock()
	stopped := n.stopped
	n.mu.Unlock()
	if stopped {
		return
	}
	if !n.allowlist.IsAllowed(id) {
		return
	}
	if n.host.Network().Connectedness(id) == network.Connected {
		return
	}
	n.pingFailMu.Lock()
	delete(n.consecutivePingFailures, id)
	n.pingFailMu.Unlock()
	// Do not call ClosePeer from inside libp2p's Disconnected notification path (deadlock risk).
	go n.dropAllowlistedPeerAfterTransportLoss(id)
}

// TriggerNetworkRefresh is invoked from BCOTriggerNetworkRefresh (c-api-surface.md).
// Tears down remote connections, clears join/pairing bookkeeping, restarts mDNS when it was
// running, and re-dials persisted manual peers. Allowlisted discovery peers reconnect via mDNS.
func (n *BCONetwork) TriggerNetworkRefresh(ctx context.Context) {
	n.mu.Lock()
	stopped := n.stopped
	n.mu.Unlock()
	if stopped {
		return
	}

	var remote []peer.ID
	for _, p := range n.host.Network().Peers() {
		if p != n.host.ID() {
			remote = append(remote, p)
		}
	}

	for _, p := range remote {
		if n.allowlist.IsAllowed(p) {
			n.mu.Lock()
			_, hadJoined := n.joinedEmitted[p]
			n.mu.Unlock()
			if hadJoined {
				name := n.allowlistDisplayName(p)
				ps := p.String()
				n.engine.TryEmitEvent(EngineEvent{Type: "PEER_LEFT", PeerName: &name, PeerID: &ps})
			}
		}
		_ = n.host.Network().ClosePeer(p)
	}

	idStrs := make([]string, 0, len(remote))
	for _, p := range remote {
		idStrs = append(idStrs, p.String())
	}
	n.engine.RemovePeersLocal(idStrs)

	n.pingFailMu.Lock()
	n.consecutivePingFailures = make(map[peer.ID]int)
	n.pingFailMu.Unlock()

	n.mu.Lock()
	n.joinedEmitted = make(map[peer.ID]struct{})
	n.pairingSent = make(map[peer.ID]struct{})
	if n.appRL != nil {
		n.appRL.Reset()
	}
	oldMdns := n.mdnsSvc
	n.mdnsSvc = nil
	n.mu.Unlock()

	if oldMdns != nil {
		_ = oldMdns.Close()
		svc := newBCOMDNSService(n.host, &mdnsNotifee{n: n})
		if err := svc.Start(); err != nil {
			defaultLogger.Warn(LogNetwork, fmt.Sprintf("mDNS restart after refresh: %v", err))
		} else {
			n.mu.Lock()
			n.mdnsSvc = svc
			n.mu.Unlock()
			defaultLogger.Info(LogNetwork, "mDNS discovery restarted after network refresh")
		}
	}

	n.RedialPersistedManualPeers(ctx)
}

// RedialPersistedManualPeers dials peers from manual_peers.json in parallel with discovery.
// Skips peers that are already connected. US4 network refresh should call this again after teardown.
func (n *BCONetwork) RedialPersistedManualPeers(ctx context.Context) {
	n.manualPeersMu.RLock()
	addrs := maps.Clone(n.manualPeers)
	n.manualPeersMu.RUnlock()
	for pidStr, maddr := range addrs {
		if err := ctx.Err(); err != nil {
			return
		}
		pid, err := peer.Decode(pidStr)
		if err != nil {
			defaultLogger.Debug(LogNetwork, fmt.Sprintf("manual redial skip bad peer id %q: %v", pidStr, err))
			continue
		}
		if pid == n.host.ID() {
			continue
		}
		if n.host.Network().Connectedness(pid) == network.Connected {
			continue
		}
		if err := n.ConnectPeer(ctx, maddr); err != nil {
			defaultLogger.Debug(LogNetwork, fmt.Sprintf("manual redial to %s: %v", pidStr, err))
		}
	}
}

type mdnsNotifee struct {
	n *BCONetwork
}

func (m *mdnsNotifee) HandlePeerFound(pi peer.AddrInfo) {
	if pi.ID == m.n.host.ID() {
		return
	}
	m.n.wg.Add(1)
	go func(pi peer.AddrInfo) {
		defer m.n.wg.Done()
		ctx, cancel := context.WithTimeout(m.n.ctx, 15*time.Second)
		defer cancel()
		if err := m.n.host.Connect(ctx, pi); err != nil {
			defaultLogger.Debug(LogNetwork, fmt.Sprintf("mdns connect to %s: %v", pi.ID, err))
			return
		}
		defaultLogger.InfoPeer(LogNetwork, "", pi.ID.String(), "connected via mDNS")
		_ = m.n.openOutboundStream(ctx, pi.ID)
	}(pi)
}

// helloMetadata carries peer identity fields extracted from BCO_HELLO / BCO_HELLO_ACK
// so the pairing prompt can show the real device name and BT headset target.
type helloMetadata struct {
	DeviceName     string
	Platform       string
	TargetBTDevice string
}

func extractHelloMetadata(msg *BCOMessage) *helloMetadata {
	m := &helloMetadata{}
	if msg.DeviceName != nil {
		m.DeviceName = *msg.DeviceName
	}
	if msg.Platform != nil {
		m.Platform = *msg.Platform
	}
	if msg.TargetBTDevice != nil {
		m.TargetBTDevice = *msg.TargetBTDevice
	}
	return m
}

func (n *BCONetwork) populateHelloIdentity(msg *BCOMessage) {
	ls := n.engine.LocalState()
	dn := ls.DeviceName
	pl := ls.Platform
	msg.DeviceName = &dn
	msg.Platform = &pl
	if bt := ls.HeadsetDisplayName; bt != "" {
		msg.TargetBTDevice = &bt
	}
}

func (n *BCONetwork) helloMessage(seq uint64) *BCOMessage {
	v := ProtocolWireVersion
	minv := MinSupportedProtocolVersion
	msg := &BCOMessage{
		Type:               MsgBCOHello,
		SenderID:           n.engine.LocalState().DeviceID,
		InstanceID:         n.engine.InstanceID(),
		Seq:                seq,
		ProtocolVersion:    &v,
		MinProtocolVersion: &minv,
	}
	n.populateHelloIdentity(msg)
	return msg
}

func (n *BCONetwork) helloAckMessage(seq uint64, remoteVer, remoteMin *uint32) *BCOMessage {
	v := ProtocolWireVersion
	minv := MinSupportedProtocolVersion
	agreed := false
	if remoteVer != nil && remoteMin != nil {
		agreed = VersionHandshakeAgreed(ProtocolWireVersion, MinSupportedProtocolVersion, *remoteVer, *remoteMin)
	}
	msg := &BCOMessage{
		Type:               MsgBCOHelloAck,
		SenderID:           n.engine.LocalState().DeviceID,
		InstanceID:         n.engine.InstanceID(),
		Seq:                seq,
		ProtocolVersion:    &v,
		MinProtocolVersion: &minv,
		Agreed:             &agreed,
	}
	n.populateHelloIdentity(msg)
	return msg
}

func writeBCOFrame(w msgio.WriteCloser, msg *BCOMessage) error {
	if msg == nil {
		return errors.New("nil message")
	}
	b, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	if len(b) > maxBCOMsgBytes {
		return fmt.Errorf("message exceeds %d bytes", maxBCOMsgBytes)
	}
	return w.WriteMsg(b)
}

func readBCOFrame(r msgio.Reader) (*BCOMessage, error) {
	b, err := r.ReadMsg()
	if err != nil {
		return nil, err
	}
	if len(b) > maxBCOMsgBytes {
		return nil, msgio.ErrMsgTooLarge
	}
	var msg BCOMessage
	if err := json.Unmarshal(b, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}

func (n *BCONetwork) runOpenerHandshake(s network.Stream) error {
	w := msgio.NewWriter(s)
	r := msgio.NewReaderSize(s, maxBCOMsgBytes)
	if err := writeBCOFrame(w, n.helloMessage(1)); err != nil {
		return err
	}
	msg, err := readBCOFrame(r)
	if err != nil {
		return err
	}
	if msg.Type != MsgBCOHelloAck || msg.Agreed == nil || !*msg.Agreed {
		return errors.New("hello ack missing or not agreed")
	}
	return nil
}

func (n *BCONetwork) runResponderHandshake(s network.Stream) (*helloMetadata, error) {
	r := msgio.NewReaderSize(s, maxBCOMsgBytes)
	w := msgio.NewWriter(s)
	msg, err := readBCOFrame(r)
	if err != nil {
		return nil, err
	}
	if msg.Type != MsgBCOHello {
		return nil, errors.New("expected BCO_HELLO")
	}
	ack := n.helloAckMessage(1, msg.ProtocolVersion, msg.MinProtocolVersion)
	if err := writeBCOFrame(w, ack); err != nil {
		return nil, err
	}
	if ack.Agreed == nil || !*ack.Agreed {
		return nil, errors.New("versions not agreed")
	}
	return extractHelloMetadata(msg), nil
}

func (n *BCONetwork) handleStream(s network.Stream) {
	remote := s.Conn().RemotePeer()
	defer s.Close()

	meta, err := n.runResponderHandshake(s)
	if err != nil {
		defaultLogger.Debug(LogNetwork, fmt.Sprintf("handshake failed with %s: %v", remote, err))
		return
	}

	r := msgio.NewReaderSize(s, maxBCOMsgBytes)
	n.postHelloInbound(remote, s, r, meta)
}

func (n *BCONetwork) postHelloInbound(remote peer.ID, s network.Stream, r msgio.Reader, meta *helloMetadata) {
	n.maybePairingEvent(remote, meta)

	for n.ctx.Err() == nil {
		b, err := r.ReadMsg()
		if err != nil {
			if !errors.Is(err, io.EOF) {
				defaultLogger.Debug(LogNetwork, fmt.Sprintf("read from %s: %v", remote, err))
			}
			return
		}
		if len(b) > maxBCOMsgBytes {
			return
		}
		var msg BCOMessage
		if err := json.Unmarshal(b, &msg); err != nil {
			continue
		}
		if msg.Type == MsgBCOHello || msg.Type == MsgBCOHelloAck {
			defaultLogger.Warn(LogNetwork, fmt.Sprintf("unexpected handshake replay from %s", remote))
			return
		}
		if !n.allowlist.IsAllowed(remote) {
			continue
		}
		if !n.appRateOK(remote, msg.Type) {
			defaultLogger.Warn(LogNetwork, fmt.Sprintf("dropping rate-limited %s from %s", msg.Type, remote))
			continue
		}
		n.engine.ProcessInbound(&msg)
	}
}

func (n *BCONetwork) appRateOK(remote peer.ID, t BCOMessageType) bool {
	now := time.Now()
	switch t {
	case MsgStateUpdate:
		return n.appRL.AllowStateUpdate(remote, now)
	case MsgClaimRequest:
		return n.appRL.AllowClaimRequest(remote, now)
	case MsgAllowlistSync:
		return n.appRL.AllowAllowlistSync(remote, now)
	default:
		return true
	}
}

func (n *BCONetwork) maybePairingEvent(remote peer.ID, meta *helloMetadata) {
	if n.allowlist.IsAllowed(remote) {
		return
	}
	n.mu.Lock()
	if _, ok := n.pairingSent[remote]; ok {
		n.mu.Unlock()
		return
	}
	n.pairingSent[remote] = struct{}{}
	n.mu.Unlock()

	code := PairCompareCode(n.host.ID(), remote)
	fp := PeerFingerprint(remote)
	name := remote.String()
	if len(name) > 12 {
		name = name[:12] + "…"
	}

	var platform, targetBT string
	if meta != nil {
		if meta.DeviceName != "" {
			name = meta.DeviceName
		}
		platform = meta.Platform
		targetBT = meta.TargetBTDevice
	}

	n.pending.Stage(remote, PendingPeerInfo{
		CompareCode:    code,
		Fingerprint:    fp,
		PeerName:       name,
		Platform:       platform,
		TargetBTDevice: targetBT,
	})
	pid := remote.String()
	cc, fp2 := code, fp
	event := EngineEvent{
		Type:        "PAIRING_REQUEST",
		PeerName:    &name,
		PeerID:      &pid,
		CompareCode: &cc,
		Fingerprint: &fp2,
	}
	if platform != "" {
		event.Platform = &platform
	}
	if targetBT != "" {
		event.TargetBTDevice = &targetBT
	}
	n.engine.TryEmitEvent(event)
	defaultLogger.Info(LogPairing, fmt.Sprintf("pairing required for peer %s code=%s", remote, code))
}

func (n *BCONetwork) maybeEmitPeerJoined(remote peer.ID) {
	if !n.allowlist.IsAllowed(remote) {
		return
	}
	n.mu.Lock()
	if _, ok := n.joinedEmitted[remote]; ok {
		n.mu.Unlock()
		return
	}
	n.joinedEmitted[remote] = struct{}{}
	n.mu.Unlock()
	name := n.allowlistDisplayName(remote)
	pid := remote.String()
	n.engine.TryEmitEvent(EngineEvent{Type: "PEER_JOINED", PeerName: &name, PeerID: &pid})
}

func (n *BCONetwork) allowlistDisplayName(id peer.ID) string {
	if name, ok := n.allowlist.FriendlyName(id); ok && name != "" {
		return name
	}
	s := id.String()
	if len(s) > 16 {
		return s[:16] + "…"
	}
	return s
}

// ApprovePeer adds the peer to the allowlist, persists, and primes join notification.
func (n *BCONetwork) ApprovePeer(id peer.ID, friendlyName string) error {
	n.allowlist.Add(id, friendlyName)
	if err := SaveAllowlistToStorage(n.allowlist, n.storagePath); err != nil {
		return err
	}
	n.pending.Remove(id)
	n.maybeEmitPeerJoined(id)
	n.engine.TryEmitEvent(EngineEvent{Type: "STATE_CHANGED"})
	_ = n.openOutboundStream(context.Background(), id)
	return nil
}

// DenyPeer drops pending pairing state and closes connections to the peer.
func (n *BCONetwork) DenyPeer(id peer.ID) {
	n.pending.Remove(id)
	n.host.Network().ClosePeer(id)
	n.mu.Lock()
	delete(n.pairingSent, id)
	delete(n.joinedEmitted, id)
	n.mu.Unlock()
}

// ClosePeer disconnects libp2p state for a peer (e.g. after removal).
func (n *BCONetwork) ClosePeer(id peer.ID) {
	_ = n.host.Network().ClosePeer(id)
	n.mu.Lock()
	delete(n.joinedEmitted, id)
	delete(n.pairingSent, id)
	n.mu.Unlock()
}

func (n *BCONetwork) openOutboundStream(ctx context.Context, id peer.ID) error {
	if n.host.Network().Connectedness(id) != network.Connected {
		return errors.New("not connected")
	}
	s, err := n.host.NewStream(ctx, id, bcoProtocolID)
	if err != nil {
		return err
	}
	defer s.Close()
	if err := n.runOpenerHandshake(s); err != nil {
		return err
	}
	n.maybeEmitPeerJoined(id)

	// Propagate the successful dial address into the CRDT entry for transitive peering.
	if n.allowlist != nil && n.allowlist.IsAllowed(id) {
		if conn := s.Conn(); conn != nil {
			ra := conn.RemoteMultiaddr()
			if ra != nil {
				p2pPart, _ := ma.NewMultiaddr("/p2p/" + id.String())
				if p2pPart != nil {
					full := ra.Encapsulate(p2pPart).String()
					n.allowlist.SetMultiaddr(id, full)
				}
			}
		}
	}
	w := msgio.NewWriter(s)
	st := n.engine.LocalBroadcastState()
	joinSeq := n.engine.AllocateOutboundSeq()
	join := &BCOMessage{
		Type:       MsgDeviceJoin,
		SenderID:   st.DeviceID,
		InstanceID: n.engine.InstanceID(),
		Seq:        joinSeq,
		State:      cloneDeviceState(&st.DeviceState),
	}
	if err := writeBCOFrame(w, n.withLocalState(join)); err != nil {
		return err
	}
	st2 := n.engine.LocalBroadcastState()
	suSeq := n.engine.AllocateOutboundSeq()
	st2.Seq = suSeq
	su := &BCOMessage{
		Type:       MsgStateUpdate,
		SenderID:   st2.DeviceID,
		InstanceID: n.engine.InstanceID(),
		Seq:        suSeq,
		State:      cloneDeviceState(&st2.DeviceState),
	}
	if err := writeBCOFrame(w, n.withLocalState(su)); err != nil {
		return err
	}

	ns := n.engine.NetworkSettingsSnapshot()
	ssSeq := n.engine.AllocateOutboundSeq()
	ss := &BCOMessage{
		Type:       MsgSettingsSync,
		SenderID:   st2.DeviceID,
		InstanceID: n.engine.InstanceID(),
		Seq:        ssSeq,
		Settings:   &ns,
	}
	if err := writeBCOFrame(w, n.withLocalState(ss)); err != nil {
		return err
	}

	// Send CRDT allowlist state for transitive peering.
	if n.allowlist != nil {
		alState := n.allowlist.State()
		alSeq := n.engine.AllocateOutboundSeq()
		al := &BCOMessage{
			Type:       MsgAllowlistSync,
			SenderID:   st2.DeviceID,
			InstanceID: n.engine.InstanceID(),
			Seq:        alSeq,
			Allowlist:  alState,
		}
		if err := writeBCOFrame(w, n.withLocalState(al)); err != nil {
			defaultLogger.Debug(LogNetwork, fmt.Sprintf("allowlist sync to %s: %v", id, err))
		}
	}
	return nil
}

func (n *BCONetwork) withLocalState(msg *BCOMessage) *BCOMessage {
	if msg == nil {
		return nil
	}
	cp := *msg
	if msg.State != nil {
		cp.State = cloneDeviceState(msg.State)
		return &cp
	}
	st := n.engine.LocalBroadcastState()
	cp.State = cloneDeviceState(&st.DeviceState)
	return &cp
}

func (n *BCONetwork) sendOne(ctx context.Context, id peer.ID, msg *BCOMessage) error {
	if n.host.Network().Connectedness(id) != network.Connected {
		return errors.New("peer not connected")
	}
	s, err := n.host.NewStream(ctx, id, bcoProtocolID)
	if err != nil {
		return err
	}
	defer s.Close()
	if err := n.runOpenerHandshake(s); err != nil {
		return err
	}
	w := msgio.NewWriter(s)
	return writeBCOFrame(w, n.withLocalState(msg))
}

// Broadcast implements Network — sends only to allowlisted connected peers.
func (n *BCONetwork) Broadcast(msg *BCOMessage) {
	if msg == nil {
		return
	}
	for _, pid := range n.host.Network().Peers() {
		if pid == n.host.ID() {
			continue
		}
		if !n.allowlist.IsAllowed(pid) {
			continue
		}
		pid := pid
		n.wg.Add(1)
		go func(p peer.ID) {
			defer n.wg.Done()
			ctx, cancel := context.WithTimeout(n.ctx, 20*time.Second)
			defer cancel()
			if err := n.sendOne(ctx, p, msg); err != nil {
				defaultLogger.Debug(LogNetwork, fmt.Sprintf("broadcast to %s: %v", p, err))
			}
		}(pid)
	}
}

// Send implements Network — directed send to an allowlisted connected peer.
func (n *BCONetwork) Send(peerID string, msg *BCOMessage) error {
	id, err := peer.Decode(peerID)
	if err != nil {
		return err
	}
	if !n.allowlist.IsAllowed(id) {
		return nil
	}
	ctx, cancel := context.WithTimeout(n.ctx, 20*time.Second)
	defer cancel()
	return n.sendOne(ctx, id, msg)
}

// ListenMultiaddrs returns host listen addresses as strings for shells / C API.
func (n *BCONetwork) ListenMultiaddrs() []string {
	addrs := n.host.Addrs()
	out := make([]string, 0, len(addrs))
	p2p, err := ma.NewMultiaddr("/p2p/" + n.host.ID().String())
	if err != nil {
		return out
	}
	for _, a := range addrs {
		out = append(out, a.Encapsulate(p2p).String())
	}
	return out
}

// TransportConnectedPeerIDs returns remote peers with Connected libp2p reachability (FR-002).
func (n *BCONetwork) TransportConnectedPeerIDs() []string {
	if n == nil || n.host == nil {
		return nil
	}
	netw := n.host.Network()
	self := n.host.ID()
	peers := netw.Peers()
	out := make([]string, 0, len(peers))
	for _, pid := range peers {
		if pid == self {
			continue
		}
		if netw.Connectedness(pid) != network.Connected {
			continue
		}
		out = append(out, pid.String())
	}
	return out
}

// PreferredDialMultiaddr picks a listen multiaddr suitable for sharing with a remote peer
// (prefers non-loopback IP; falls back to the first address).
func (n *BCONetwork) PreferredDialMultiaddr() string {
	addrs := n.ListenMultiaddrs()
	for _, s := range addrs {
		m, err := ma.NewMultiaddr(s)
		if err != nil {
			continue
		}
		ip, err := manet.ToIP(m)
		if err != nil {
			continue
		}
		if !ip.IsLoopback() {
			return s
		}
	}
	if len(addrs) > 0 {
		return addrs[0]
	}
	return ""
}

// ConnectPeer parses a full multiaddr (including /p2p/<peerID>), dials the peer if needed,
// opens a BCO stream, runs the opener HELLO handshake, and sends initial join/state (US3).
func (n *BCONetwork) ConnectPeer(ctx context.Context, multiaddrStr string) error {
	maddr, err := ma.NewMultiaddr(multiaddrStr)
	if err != nil {
		return fmt.Errorf("parse multiaddr: %w", err)
	}
	ai, err := peer.AddrInfoFromP2pAddr(maddr)
	if err != nil {
		return fmt.Errorf("peer from multiaddr: %w", err)
	}
	if ai.ID == n.host.ID() {
		return errors.New("cannot connect to self")
	}
	if err := n.host.Connect(ctx, *ai); err != nil {
		return err
	}
	if err := n.openOutboundStream(ctx, ai.ID); err != nil {
		return err
	}
	n.persistManualPeer(ai.ID.String(), multiaddrStr)
	return nil
}

func (n *BCONetwork) persistManualPeer(peerID, multiaddrStr string) {
	n.manualPeersMu.Lock()
	if n.manualPeers == nil {
		n.manualPeers = make(map[string]string)
	}
	n.manualPeers[peerID] = multiaddrStr
	snap := maps.Clone(n.manualPeers)
	n.manualPeersMu.Unlock()
	if err := SaveManualPeersFile(n.storagePath, snap); err != nil {
		defaultLogger.Warn(LogPersistence, fmt.Sprintf("manual_peers.json: %v", err))
	}
}

// ConnectTransitivePeer asynchronously dials a peer discovered via CRDT allowlist gossip.
func (n *BCONetwork) ConnectTransitivePeer(maddr string) {
	if maddr == "" {
		return
	}
	n.wg.Add(1)
	go func() {
		defer n.wg.Done()
		ctx, cancel := context.WithTimeout(n.ctx, 30*time.Second)
		defer cancel()
		if err := n.ConnectPeer(ctx, maddr); err != nil {
			defaultLogger.Debug(LogNetwork, fmt.Sprintf("transitive peer dial %s: %v", maddr, err))
		}
	}()
}

// Close shuts down mDNS, removes handlers, and closes the host.
func (n *BCONetwork) Close() error {
	n.mu.Lock()
	if n.stopped {
		n.mu.Unlock()
		return nil
	}
	n.stopped = true
	n.mu.Unlock()

	n.cancel()
	if n.mdnsSvc != nil {
		_ = n.mdnsSvc.Close()
	}
	n.host.RemoveStreamHandler(bcoProtocolID)
	n.wg.Wait()
	_ = n.host.Close()
	return nil
}

// Host exposes the underlying libp2p host for tests.
func (n *BCONetwork) Host() host.Host { return n.host }

// StartTestNetwork wires host+engine for mocknet tests (no mDNS — pass mdnsSvc nil by not starting mdns in test helper).
// skipPing avoids the FR-012 ping loop (mocknet can fail pings and evict peers during transport-only scenarios).
func startEngineWithHost(ctx context.Context, h host.Host, deviceName, storagePath string, skipMDNS, skipPing bool) (*BCOEngine, *BCONetwork, error) {
	if err := EnsureStorageDir(storagePath); err != nil {
		return nil, nil, err
	}
	instanceID, err := WriteNewInstanceID(storagePath)
	if err != nil {
		return nil, nil, err
	}
	al := NewPeerAllowlist()
	if err := LoadAllowlistFromStorage(al, storagePath); err != nil {
		return nil, nil, err
	}
	pending := NewPendingPairing()
	local := DeviceState{
		DeviceID:      h.ID().String(),
		DeviceName:    deviceName,
		AudioPriority: AudioPriorityIdle,
		Platform:      "test",
	}
	ns, err := LoadNetworkSettings(storagePath)
	if err != nil {
		return nil, nil, err
	}
	eng := NewBCOEngine(local, instanceID, nil, al, storagePath, ns)
	cctx, cancel := context.WithCancel(ctx)
	n := &BCONetwork{
		host:                    h,
		engine:                  eng,
		ctx:                     cctx,
		cancel:                  cancel,
		allowlist:               al,
		pending:                 pending,
		storagePath:             storagePath,
		appRL:                   newPeerAppRateLimiter(),
		pairingSent:             make(map[peer.ID]struct{}),
		joinedEmitted:           make(map[peer.ID]struct{}),
		consecutivePingFailures: make(map[peer.ID]int),
	}
	mp, err := LoadManualPeersFile(storagePath)
	if err != nil {
		cancel()
		return nil, nil, err
	}
	n.manualPeers = mp
	eng.net = n
	h.SetStreamHandler(bcoProtocolID, n.handleStream)
	n.registerDisconnectNotifee()
	if !skipMDNS {
		svc := newBCOMDNSService(h, &mdnsNotifee{n: n})
		n.mdnsSvc = svc
		if err := svc.Start(); err != nil {
			cancel()
			return nil, nil, err
		}
	}
	n.startManualPeerRedialGoroutine()
	if !skipPing {
		n.startPingLivenessLoop()
	}
	return eng, n, nil
}
