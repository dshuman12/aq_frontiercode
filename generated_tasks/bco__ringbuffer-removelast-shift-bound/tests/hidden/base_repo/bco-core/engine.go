package main

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/libp2p/go-libp2p/core/peer"
)

// ClaimLeaseDuration is the default pending-claim TTL (data-model.md).
const ClaimLeaseDuration = 15 * time.Second

// PeerStateFreshnessLimit is spec.md / contracts/protocol.md — stale peer view downgrades to Idle.
const PeerStateFreshnessLimit = 30 * time.Second

// bluetoothStableFalseBeforeConnect absorbs brief HasBluetoothConnection=false flicker while A2DP is still up (008 T006 / research R1).
const bluetoothStableFalseBeforeConnect = 300 * time.Millisecond

// bluetoothOpposingEventCooldown is the minimum gap between emitted CONNECT_BT and DISCONNECT_BT (or vice versa); overridden in tests.
var bluetoothOpposingEventCooldown = 2 * time.Second

// reconnectStormDetectionWindow is the window after an emitted CONNECT_BT during which
// a loss of HasBluetoothConnection (that we did NOT ask for via DISCONNECT_BT) counts
// as an "external disconnect" signaling a reconnect storm.
const reconnectStormDetectionWindow = 15 * time.Second

// reconnectStormInitialBackoff is the first backoff applied when a storm is detected.
// Doubles (capped at reconnectStormMaxBackoff) on each subsequent storm within the
// same window. Reset when a connection holds longer than reconnectStormDetectionWindow.
const reconnectStormInitialBackoff = 5 * time.Second

// reconnectStormMaxBackoff caps the exponential backoff to keep recovery reasonable.
const reconnectStormMaxBackoff = 60 * time.Second

// Network abstracts peer messaging; US2 implements this in network.go.
type Network interface {
	Broadcast(msg *BCOMessage)
	Send(peerID string, msg *BCOMessage) error
	ListenMultiaddrs() []string
	// TransportConnectedPeerIDs returns remote libp2p peer ID strings with an active transport
	// connection. Nil means "unknown" (legacy: registry peers are reported connected=true).
	TransportConnectedPeerIDs() []string
	// ConnectTransitivePeer attempts an async dial to a peer discovered via CRDT allowlist gossip.
	ConnectTransitivePeer(multiaddr string)
	Close() error
}

type noopNetwork struct{}

func (noopNetwork) Broadcast(*BCOMessage) {}

func (noopNetwork) Send(string, *BCOMessage) error { return nil }

func (noopNetwork) ListenMultiaddrs() []string { return nil }

func (noopNetwork) TransportConnectedPeerIDs() []string { return nil }

func (noopNetwork) ConnectTransitivePeer(string) {}

func (noopNetwork) Close() error { return nil }

// PendingClaim is the in-memory claim lease (data-model.md).
type PendingClaim struct {
	WinnerID  string
	ExpiresAt time.Time
}

// EngineEvent is JSON-serialized to the platform shell.
type EngineEvent struct {
	Type           string         `json:"type"`
	PeerName       *string        `json:"peerName,omitempty"`
	PeerID         *string        `json:"peerId,omitempty"`
	Reason         *string        `json:"reason,omitempty"`
	CompareCode    *string        `json:"compareCode,omitempty"`
	Fingerprint    *string        `json:"fingerprint,omitempty"`
	Success        *bool          `json:"success,omitempty"`
	Platform       *string        `json:"platform,omitempty"`
	TargetBTDevice *string        `json:"targetBtDevice,omitempty"`
	Headset        *HeadsetConfig `json:"headset,omitempty"`
}

// BCOEngine owns local/peer orchestration state (Phase 2 scaffold).
type BCOEngine struct {
	mu           sync.Mutex
	local        LocalState
	instanceID   string
	peers        map[string]DeviceState
	pendingClaim *PendingClaim
	events       chan EngineEvent
	net          Network

	allowlist       *CRDTAllowlist
	storagePath     string
	networkSettings NetworkSettings

	// targetHeadset stores the locally configured headset (set via BCOSetTargetHeadset).
	// Copied into local.DeviceState headset fields on state updates.
	targetHeadset HeadsetConfig

	lastSeenSeq      map[string]uint64
	lastSeenInstance map[string]string
	lastPeerStateAt  map[string]time.Time // wall clock when we last applied peer registry state from that deviceId
	lastWinner       string

	// Media pause grace: holds real audio priority while grace timer is active.
	audioPriorityBeforeGrace AudioPriority
	audioPriorityDroppedAt   time.Time
	graceActive              bool

	// Manual connect timeout tracking.
	manualConnectStartedAt time.Time
	// forceConnectInProgress suppresses platform priority downgrades while ForceConnect
	// temporarily advertises ActiveCall to arm a claim.
	forceConnectInProgress  bool
	forceConnectBTConfirmed bool

	btDisconnectOutstanding bool
	suppressNextClaimArm    bool

	// lastKnownBTHolder caches the device name of the last peer (or local) observed with
	// HasBluetoothConnection==true. Used by recordBTGainedActivityLocked to provide a
	// reliable "Switched from <holder>" message even if the peer's HasBluetoothConnection
	// has already been cleared by the time the local shell reports gaining BT.
	lastKnownBTHolder string
	// lastKnownBTHolderAt is the wall time when lastKnownBTHolder was last updated (any
	// device observed with HasBluetoothConnection==true). Used by btSafetyPolicyAllowsConnect
	// to allow connect within a grace window after a peer releases the headset.
	lastKnownBTHolderAt time.Time

	// btLastSeenConnectedAt is the last wall time updateBluetoothEventsLocked observed local HasBluetoothConnection==true (008 T006).
	btLastSeenConnectedAt time.Time
	// lastBTShellEventAt / lastBTShellEventType debounce opposing CONNECT_BT vs DISCONNECT_BT emissions.
	lastBTShellEventAt   time.Time
	lastBTShellEventType string
	// btDebouncedSuppressLogged* avoid repeating the same suppression log on every evaluate tick (008 T008).
	btDebouncedSuppressLoggedDisconnect         bool
	btDebouncedSuppressLoggedConnectOpp         bool
	btDebouncedSuppressLoggedConnectStableFalse bool

	// lastCONNECT_BTEmittedAt is the last wall time we emitted CONNECT_BT. Used with
	// lastExternalBTDropAt to detect "quick external disconnect" reconnect storms where
	// the headset keeps getting yanked away (e.g., another OS/device also grabbing it).
	lastConnectBTEmittedAt time.Time
	// reconnectStormBackoffUntil is a deadline until which CONNECT_BT is suppressed after
	// we detect a quick external disconnect following our most recent CONNECT_BT. Grows
	// exponentially on repeated storms and resets when a clean connection holds.
	reconnectStormBackoffUntil            time.Time
	reconnectStormAttempts                int
	btDebouncedSuppressLoggedStormBackoff bool

	// partitionLivenessLost is FR-014 split-brain guard (spec.md / protocol.md Split-Brain Rules).
	// Set when we drop a peer from the registry due to transport liveness failure while other
	// peer entries may still be stale (classic partition: we cannot trust cross-peer ordering).
	// Cleared when: (a) BCOTriggerNetworkRefresh calls RemovePeersLocal (intentional reset),
	// (b) we accept DEVICE_JOIN or STATE_UPDATE from any remote (proves at least one live path),
	// or (c) the registry becomes empty after liveness removal (solo device — not a split view).
	// While true and local is not the BT holder, updateClaimLeaseLocked must not broadcast new
	// CLAIM_REQUEST. While true and local *is* the BT holder, updateBluetoothEventsLocked must
	// not emit DISCONNECT_BT due to a remote “winner” that may be a ghost on the other side.
	partitionLivenessLost bool

	// lastPriorityLogKey dedupes identical Priority resolution logs across evaluate passes.
	lastPriorityLogKey string

	// pendingStateChanged is set when TryEmitEvent drops STATE_CHANGED because the events channel is full.
	// PollEvent / BCOWaitForEvent deliver it so shells still refresh (peer audio, etc.).
	pendingStateChanged bool

	switchHistory *RingBuffer[SwitchEvent]
	activityFeed  *RingBuffer[ActivityFeedEntry]
	activitySeq   uint64

	emitMu     sync.Mutex
	eventsDone bool
}

// NewBCOEngine constructs an engine with optional Network (defaults to no-op).
// allowlist and storagePath are optional; when both set, PEER_REMOVE persists allowlist.json.
func NewBCOEngine(local DeviceState, instanceID string, net Network, allowlist *CRDTAllowlist, storagePath string, settings NetworkSettings) *BCOEngine {
	if net == nil {
		net = noopNetwork{}
	}
	return &BCOEngine{
		local:            LocalState{DeviceState: local},
		instanceID:       instanceID,
		peers:            make(map[string]DeviceState),
		events:           make(chan EngineEvent, 64),
		net:              net,
		allowlist:        allowlist,
		storagePath:      storagePath,
		networkSettings:  settings,
		lastSeenSeq:      make(map[string]uint64),
		lastSeenInstance: make(map[string]string),
		lastPeerStateAt:  make(map[string]time.Time),
		switchHistory:    NewRingBuffer[SwitchEvent](100),
		activityFeed:     NewRingBuffer[ActivityFeedEntry](200),
	}
}

// Broadcast forwards to the network implementation.
func (e *BCOEngine) Broadcast(msg *BCOMessage) {
	e.net.Broadcast(msg)
}

// Send forwards a directed message to the network implementation.
func (e *BCOEngine) Send(peerID string, msg *BCOMessage) error {
	return e.net.Send(peerID, msg)
}

// Events exposes the outbound event stream for BCOWaitForEvent.
func (e *BCOEngine) Events() <-chan EngineEvent {
	return e.events
}

// PollEvent waits up to d for an engine event. It prefers a coalesced STATE_CHANGED when the channel
// overflowed (TryEmitEvent), then any queued event, then on timeout returns coalesced STATE_CHANGED if pending.
func (e *BCOEngine) PollEvent(d time.Duration) (EngineEvent, bool) {
	e.emitMu.Lock()
	if e.pendingStateChanged {
		e.pendingStateChanged = false
		e.emitMu.Unlock()
		return EngineEvent{Type: "STATE_CHANGED"}, true
	}
	e.emitMu.Unlock()

	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case ev, ok := <-e.events:
		if !ok {
			return EngineEvent{}, false
		}
		if ev.Type == "STATE_CHANGED" {
			e.emitMu.Lock()
			e.pendingStateChanged = false
			e.emitMu.Unlock()
		}
		return ev, true
	case <-timer.C:
		e.emitMu.Lock()
		pending := e.pendingStateChanged
		if pending {
			e.pendingStateChanged = false
		}
		e.emitMu.Unlock()
		if pending {
			return EngineEvent{Type: "STATE_CHANGED"}, true
		}
		return EngineEvent{}, false
	}
}

// TryEmitEvent sends without blocking; callers may switch to a blocking path once shell consumption guarantees exist (US1+).
func (e *BCOEngine) TryEmitEvent(ev EngineEvent) {
	e.emitMu.Lock()
	defer e.emitMu.Unlock()
	if e.eventsDone {
		return
	}
	select {
	case e.events <- ev:
		if ev.Type == "STATE_CHANGED" {
			e.pendingStateChanged = false
		}
	default:
		if ev.Type == "STATE_CHANGED" {
			e.pendingStateChanged = true
		}
	}
}

func (e *BCOEngine) tryEmit(ev EngineEvent) {
	e.TryEmitEvent(ev)
}

// Stop closes the outbound event channel (idempotent). Unblocks BCOWaitForEvent consumers.
func (e *BCOEngine) Stop() {
	e.emitMu.Lock()
	defer e.emitMu.Unlock()
	if e.eventsDone {
		return
	}
	e.eventsDone = true
	close(e.events)
}

// InstanceID returns the per-launch instance UUID string.
func (e *BCOEngine) InstanceID() string {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.instanceID
}

// ExtendClaimLeaseForBTProgress resets the pending claim TTL when the local winner reports BT connecting (C API status=1).
func (e *BCOEngine) ExtendClaimLeaseForBTProgress() {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.pendingClaim == nil || e.pendingClaim.WinnerID != e.local.DeviceID {
		return
	}
	e.pendingClaim.ExpiresAt = time.Now().Add(ClaimLeaseDuration)
}

// SetPausedSelf sets local paused flag, broadcasts PEER_PAUSE / PEER_RESUME, and re-evaluates.
func (e *BCOEngine) SetPausedSelf(paused bool) {
	e.mu.Lock()
	e.local.Paused = paused
	typ := MsgPeerPause
	if !paused {
		typ = MsgPeerResume
	}
	bst := e.localBroadcastStateLocked(time.Now())
	bst.Seq = e.nextSeqLocked()
	msg := &BCOMessage{
		Type:       typ,
		SenderID:   e.local.DeviceID,
		InstanceID: e.instanceID,
		Seq:        bst.Seq,
		State:      cloneDeviceState(&bst.DeviceState),
	}
	net := e.net
	e.mu.Unlock()
	if net != nil {
		net.Broadcast(msg)
	}
	e.mu.Lock()
	e.evaluateLocked()
	e.mu.Unlock()
}

// RemovePeerLocal removes a peer from the in-memory registry (used when tearing down connections).
func (e *BCOEngine) forgetPeerWireStateLocked(peerID string) {
	delete(e.lastSeenSeq, peerID)
	delete(e.lastSeenInstance, peerID)
}

func (e *BCOEngine) RemovePeerLocal(peerID string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	st, ok := e.peers[peerID]
	if !ok {
		return
	}
	label := strings.TrimSpace(st.DeviceName)
	if label == "" {
		label = e.peerDisplayLocked(peerID)
	}
	e.recordActivityAtLocked(time.Now().UnixMilli(), ActivityPeerLeft, fmt.Sprintf("%s left", label), label)
	delete(e.peers, peerID)
	delete(e.lastPeerStateAt, peerID)
	e.forgetPeerWireStateLocked(peerID)
	e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
}

// RemovePeersLocal removes several peers under one lock and emits at most one STATE_CHANGED (US4 refresh).
func (e *BCOEngine) RemovePeersLocal(peerIDs []string) {
	if len(peerIDs) == 0 {
		return
	}
	e.mu.Lock()
	changed := false
	baseTs := time.Now().UnixMilli()
	n := 0
	for _, id := range peerIDs {
		if st, ok := e.peers[id]; ok {
			label := strings.TrimSpace(st.DeviceName)
			if label == "" {
				label = e.peerDisplayLocked(id)
			}
			e.recordActivityAtLocked(baseTs+int64(n), ActivityPeerLeft, fmt.Sprintf("%s left", label), label)
			n++
			delete(e.peers, id)
			delete(e.lastPeerStateAt, id)
			e.forgetPeerWireStateLocked(id)
			changed = true
		}
	}
	e.partitionLivenessLost = false
	e.mu.Unlock()
	if changed {
		e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	}
}

// RemovePeerDueToLiveness removes one peer after ping/transport failure (FR-012 / FR-014).
// Unlike RemovePeersLocal, this may set partitionLivenessLost so non-holders suppress claims.
func (e *BCOEngine) RemovePeerDueToLiveness(peerID string) {
	e.mu.Lock()
	st, had := e.peers[peerID]
	if !had {
		e.mu.Unlock()
		return
	}
	label := strings.TrimSpace(st.DeviceName)
	if label == "" {
		label = e.peerDisplayLocked(peerID)
	}
	delete(e.peers, peerID)
	delete(e.lastPeerStateAt, peerID)
	e.forgetPeerWireStateLocked(peerID)
	if len(e.peers) == 0 {
		e.partitionLivenessLost = false
	} else {
		e.partitionLivenessLost = true
	}
	e.recordActivityAtLocked(time.Now().UnixMilli(), ActivityPeerLeft, fmt.Sprintf("%s left", label), label)
	e.mu.Unlock()
	e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	e.mu.Lock()
	e.evaluateLocked()
	e.mu.Unlock()
}

// PeerStatesJSON returns a JSON array snapshot for BCOGetPeerStates (FR-002 / 008 T009).
// With BCONetwork, entries merge the orchestration registry and every transport-connected
// libp2p peer: Connected reflects live transport; peers connected but not yet in the registry
// appear as minimal DeviceState rows (idle, connected=true). noopNetwork returns nil transport
// IDs, preserving legacy connected=true for registry-only snapshots.
func (e *BCOEngine) PeerStatesJSON() ([]byte, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	var transportSet map[string]bool
	if ids := e.net.TransportConnectedPeerIDs(); ids != nil {
		transportSet = make(map[string]bool, len(ids))
		for _, id := range ids {
			transportSet[id] = true
		}
	}

	merged := make(map[string]DeviceState, len(e.peers)+len(transportSet))
	for id, st := range e.peers {
		p := st
		if transportSet == nil {
			p.Connected = true
		} else {
			p.Connected = transportSet[id]
		}
		merged[id] = p
	}
	if transportSet != nil {
		for id := range transportSet {
			if _, ok := merged[id]; ok {
				continue
			}
			merged[id] = deviceStateForTransportOnlyPeer(id, e.allowlist)
		}
	}

	list := make([]DeviceState, 0, len(merged))
	for _, p := range merged {
		list = append(list, p)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].DeviceID < list[j].DeviceID })
	for _, p := range list {
		defaultLogger.Debug(LogEngine, fmt.Sprintf(
			"[Trace] PeerStatesJSON: %q (%s) audio=%d has_bt=%v connected=%v paused=%v",
			p.DeviceName, shortID(p.DeviceID), int(p.AudioPriority), p.HasBluetoothConnection, p.Connected, p.Paused,
		))
	}
	return json.Marshal(list)
}

func deviceStateForTransportOnlyPeer(deviceID string, allowlist *CRDTAllowlist) DeviceState {
	name := ""
	if allowlist != nil {
		if id, err := peer.Decode(deviceID); err == nil {
			if n, ok := allowlist.FriendlyName(id); ok && n != "" {
				name = n
			}
		}
	}
	if name == "" {
		if id, err := peer.Decode(deviceID); err == nil {
			name = PeerFingerprint(id)
		} else {
			name = shortID(deviceID)
		}
	}
	return DeviceState{
		DeviceID:               deviceID,
		DeviceName:             name,
		AudioPriority:          AudioPriorityIdle,
		HasBluetoothConnection: false,
		Connected:              true,
	}
}

// LocalStateJSON returns the local state as JSON (listen addrs added at C API layer).
func (e *BCOEngine) LocalStateJSON() ([]byte, error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	return json.Marshal(e.local)
}

// RemoveAllowlistedPeer removes a peer from the allowlist and in-memory peer map and persists.
func (e *BCOEngine) RemoveAllowlistedPeer(peerIDStr string) error {
	id, err := peer.Decode(peerIDStr)
	if err != nil {
		return err
	}
	e.mu.Lock()
	delete(e.peers, peerIDStr)
	delete(e.lastPeerStateAt, peerIDStr)
	e.forgetPeerWireStateLocked(peerIDStr)
	if e.allowlist != nil {
		e.allowlist.Remove(id)
		if e.storagePath != "" {
			_ = SaveAllowlistToStorage(e.allowlist, e.storagePath)
		}
	}
	e.mu.Unlock()
	e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	return nil
}

// SetLocalState updates local device state under the engine lock and re-evaluates resolution.
func (e *BCOEngine) SetLocalState(st DeviceState) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.local.DeviceState = st
	e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	e.evaluateLocked()
}

// LocalState returns a copy of local device state.
func (e *BCOEngine) LocalState() LocalState {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.local
}

// LocalBroadcastState returns a copy of the local state with the media-pause grace
// adjustment applied: while the grace window is active, AudioPriority is replaced by
// the pre-drop tier and AudioPriorityHeldUntilMs/AudioPriorityRaw are populated so
// peers resolve using the same effective tier the local engine uses. This is the
// correct view to embed in outbound state broadcasts (STATE_UPDATE, DEVICE_JOIN,
// PEER_PAUSE/RESUME, CLAIM_*). For UI display use LocalState() instead.
func (e *BCOEngine) LocalBroadcastState() LocalState {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.localBroadcastStateLocked(time.Now())
}

// localBroadcastStateLocked is the lock-held implementation of LocalBroadcastState.
// Callers must hold e.mu.
func (e *BCOEngine) localBroadcastStateLocked(now time.Time) LocalState {
	ls := e.local
	if !e.graceActive {
		return ls
	}
	graceDuration := time.Duration(e.networkSettings.MediaPauseGraceMs.Value) * time.Millisecond
	if graceDuration <= 0 {
		return ls
	}
	if now.Sub(e.audioPriorityDroppedAt) >= graceDuration {
		return ls
	}
	if e.local.AudioPriority >= AudioPriorityMedia {
		return ls
	}
	if e.audioPriorityBeforeGrace < AudioPriorityMedia {
		return ls
	}
	ls.AudioPriorityRaw = e.local.AudioPriority
	ls.AudioPriority = e.audioPriorityBeforeGrace
	ls.AudioPriorityHeldUntilMs = e.audioPriorityDroppedAt.Add(graceDuration).UnixMilli()
	return ls
}

// NetworkSettingsSnapshot returns a copy of current network-wide settings.
func (e *BCOEngine) NetworkSettingsSnapshot() NetworkSettings {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.networkSettings
}

// UpdateNetworkSetting sets one network-wide setting by key with a LWW timestamp,
// persists, and broadcasts SETTINGS_SYNC. Returns error on unknown key or persist failure.
func (e *BCOEngine) UpdateNetworkSetting(key string, value int, now time.Time) error {
	e.mu.Lock()
	ts := now.UnixMilli()
	switch key {
	case "stickinessBonus":
		e.networkSettings.StickinessBonus = SettingValue[int]{Value: value, UpdatedAt: ts}
	case "switchCooldownMs":
		e.networkSettings.SwitchCooldownMs = SettingValue[int]{Value: value, UpdatedAt: ts}
	case "mediaPauseGraceMs":
		e.networkSettings.MediaPauseGraceMs = SettingValue[int]{Value: value, UpdatedAt: ts}
	case "manualConnectTimeoutMs":
		e.networkSettings.ManualConnectTimeoutMs = SettingValue[int]{Value: value, UpdatedAt: ts}
	case "forceConnectDisconnectTimeoutMs":
		value = normalizeForceConnectTimeout(SettingValue[int]{Value: value}, DefaultNetworkSettings().ForceConnectDisconnectTimeoutMs).Value
		e.networkSettings.ForceConnectDisconnectTimeoutMs = SettingValue[int]{Value: value, UpdatedAt: ts}
	case "forceConnectConnectTimeoutMs":
		value = normalizeForceConnectTimeout(SettingValue[int]{Value: value}, DefaultNetworkSettings().ForceConnectConnectTimeoutMs).Value
		e.networkSettings.ForceConnectConnectTimeoutMs = SettingValue[int]{Value: value, UpdatedAt: ts}
	default:
		e.mu.Unlock()
		return fmt.Errorf("unknown network setting key: %s", key)
	}
	ns := e.networkSettings
	sp := e.storagePath
	net := e.net
	senderID := e.local.DeviceID
	inst := e.instanceID
	seq := e.nextSeqLocked()
	e.mu.Unlock()

	if sp != "" {
		if err := SaveNetworkSettings(sp, ns); err != nil {
			return err
		}
	}
	net.Broadcast(&BCOMessage{
		Type:       MsgSettingsSync,
		SenderID:   senderID,
		InstanceID: inst,
		Seq:        seq,
		Settings:   &ns,
	})
	return nil
}

// UpdateNetworkSettingString sets a string-typed network setting by key.
func (e *BCOEngine) UpdateNetworkSettingString(key, value string, now time.Time) error {
	e.mu.Lock()
	ts := now.UnixMilli()
	switch key {
	case "btSafetyPolicy":
		e.networkSettings.BtSafetyPolicy = SettingValue[string]{Value: value, UpdatedAt: ts}
	default:
		e.mu.Unlock()
		return fmt.Errorf("unknown string network setting key: %s", key)
	}
	ns := e.networkSettings
	sp := e.storagePath
	net := e.net
	senderID := e.local.DeviceID
	inst := e.instanceID
	seq := e.nextSeqLocked()
	e.mu.Unlock()

	if sp != "" {
		if err := SaveNetworkSettings(sp, ns); err != nil {
			return err
		}
	}
	net.Broadcast(&BCOMessage{
		Type:       MsgSettingsSync,
		SenderID:   senderID,
		InstanceID: inst,
		Seq:        seq,
		Settings:   &ns,
	})
	return nil
}

// SetPendingClaim sets or clears the pending claim lease.
func (e *BCOEngine) SetPendingClaim(c *PendingClaim) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.pendingClaim = c
}

// PendingClaimSnapshot returns a copy of the pending claim, if any.
func (e *BCOEngine) PendingClaimSnapshot() *PendingClaim {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.pendingClaim == nil {
		return nil
	}
	pc := *e.pendingClaim
	return &pc
}

func (e *BCOEngine) applyPiggybackedStateLocked(sender string, st *DeviceState) bool {
	if st == nil {
		return false
	}
	next := *st
	prev, existed := e.peers[sender]
	e.peers[sender] = next
	e.lastPeerStateAt[sender] = time.Now()
	e.partitionLivenessLost = false
	if existed {
		e.clearConnectCooldownOnBTReleaseLocked(prev, next)
	}
	e.checkHeadsetAutoSyncLocked(sender, &next)
	return !existed || prev != next
}

// ProcessInbound applies a peer message (seq filter, side effects, evaluation). Returns whether the message was accepted (not stale).
func (e *BCOEngine) ProcessInbound(msg *BCOMessage) bool {
	if msg == nil {
		return false
	}
	switch msg.Type {
	case MsgStateUpdate, MsgDeviceJoin, MsgClaimRequest, MsgClaimAck, MsgClaimRelease, MsgDeviceLeave, MsgPeerPause, MsgPeerResume, MsgPeerRemove, MsgSettingsSync, MsgAllowlistSync, MsgHeadsetUpdate:
	default:
		return false
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	sender := msg.SenderID
	if sender == "" || sender == e.local.DeviceID {
		return false
	}
	if e.shouldDiscardSeqLocked(sender, msg.InstanceID, msg.Seq) {
		defaultLogger.Debug(LogEngine, fmt.Sprintf(
			"[Trace] ProcessInbound DISCARDED %s from %s: seq=%d <= lastSeen=%d",
			msg.Type, shortID(sender), msg.Seq, e.lastSeenSeq[sender],
		))
		return false
	}

	piggybackedStateChanged := false
	switch msg.Type {
	case MsgClaimRequest, MsgClaimAck, MsgClaimRelease, MsgPeerPause, MsgPeerResume, MsgSettingsSync, MsgAllowlistSync, MsgHeadsetUpdate:
		piggybackedStateChanged = e.applyPiggybackedStateLocked(sender, msg.State)
		if piggybackedStateChanged {
			e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
		}
	}

	switch msg.Type {
	case MsgStateUpdate, MsgDeviceJoin:
		if msg.State == nil {
			return true
		}
		st := *msg.State
		prev, existed := e.peers[sender]
		e.peers[sender] = st
		e.lastPeerStateAt[sender] = time.Now()
		e.partitionLivenessLost = false
		if existed {
			e.clearConnectCooldownOnBTReleaseLocked(prev, st)
		}
		defaultLogger.Info(LogEngine, fmt.Sprintf(
			"[Trace] ProcessInbound %s from %q (%s): audio_priority=%d has_bt=%v paused=%v seq=%d headset=%q",
			msg.Type, st.DeviceName, shortID(sender), int(st.AudioPriority), st.HasBluetoothConnection, st.Paused, st.Seq, st.TargetHeadsetName,
		))
		if msg.Type == MsgDeviceJoin && !existed {
			e.retractRecentPeerLeftLocked(st.DeviceName)
			e.recordActivityLocked(ActivityPeerJoined, fmt.Sprintf("%s joined", st.DeviceName), st.DeviceName)
		}
		e.checkHeadsetAutoSyncLocked(sender, &st)
		e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
		e.evaluateLocked()
	case MsgClaimRequest:
		e.handleClaimRequestLocked(msg)
		e.evaluateLocked()
	case MsgClaimAck:
		e.handleClaimAckLocked(msg)
		e.evaluateLocked()
	case MsgClaimRelease:
		e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
		e.evaluateLocked()
	case MsgDeviceLeave:
		peerName := e.peerNameLocked(sender)
		delete(e.peers, sender)
		delete(e.lastPeerStateAt, sender)
		e.forgetPeerWireStateLocked(sender)
		e.recordActivityLocked(ActivityPeerLeft, fmt.Sprintf("%s left", peerName), peerName)
		e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
		e.evaluateLocked()
	case MsgPeerPause, MsgPeerResume:
		if msg.State == nil {
			return true
		}
		st := *msg.State
		if cur, ok := e.peers[sender]; ok {
			cur.Paused = st.Paused
			e.peers[sender] = cur
		} else {
			e.peers[sender] = st
		}
		e.lastPeerStateAt[sender] = time.Now()
		sid := sender
		var namePtr *string
		if nm := st.DeviceName; nm != "" {
			namePtr = &nm
		}
		peerName := st.DeviceName
		if msg.Type == MsgPeerPause {
			e.tryEmit(EngineEvent{Type: "PEER_PAUSED", PeerName: namePtr, PeerID: &sid})
			e.recordActivityLocked(ActivityPeerPaused, fmt.Sprintf("%s paused", peerName), peerName)
		} else {
			e.tryEmit(EngineEvent{Type: "PEER_RESUMED", PeerName: namePtr, PeerID: &sid})
			e.recordActivityLocked(ActivityPeerResumed, fmt.Sprintf("%s resumed", peerName), peerName)
		}
		e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
		e.evaluateLocked()
	case MsgSettingsSync:
		if msg.Settings != nil {
			merged, changed := MergeNetworkSettings(e.networkSettings, *msg.Settings)
			if changed {
				e.networkSettings = merged
				if e.storagePath != "" {
					_ = SaveNetworkSettings(e.storagePath, merged)
				}
				defaultLogger.Info(LogEngine, fmt.Sprintf(
					"[Trace] ProcessInbound SETTINGS_SYNC from %s: merged network settings (changed=true)",
					shortID(sender),
				))
				e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
				e.evaluateLocked()
			}
		}
		if piggybackedStateChanged {
			e.evaluateLocked()
		}
	case MsgPeerRemove:
		var removedName *string
		if st, ok := e.peers[sender]; ok {
			n := st.DeviceName
			removedName = &n
		}
		delete(e.peers, sender)
		delete(e.lastPeerStateAt, sender)
		e.forgetPeerWireStateLocked(sender)
		if e.allowlist != nil && e.storagePath != "" {
			if id, err := peer.Decode(sender); err == nil {
				e.allowlist.Remove(id)
				_ = SaveAllowlistToStorage(e.allowlist, e.storagePath)
			}
		}
		sid := sender
		rn := ""
		if removedName != nil {
			rn = *removedName
		}
		e.recordActivityLocked(ActivityDisconnect, fmt.Sprintf("%s disconnected", rn), rn)
		e.tryEmit(EngineEvent{Type: "PEER_REMOVED", PeerName: removedName, PeerID: &sid})
		e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
		e.evaluateLocked()
	case MsgAllowlistSync:
		e.handleAllowlistSyncLocked(msg)
		if piggybackedStateChanged {
			e.evaluateLocked()
		}
	case MsgHeadsetUpdate:
		e.handleHeadsetUpdateLocked(msg)
		if piggybackedStateChanged {
			e.evaluateLocked()
		}
	}
	return true
}

func (e *BCOEngine) shouldDiscardSeqLocked(senderID, instanceID string, seq uint64) bool {
	prevInst, ok := e.lastSeenInstance[senderID]
	if !ok || prevInst != instanceID {
		e.lastSeenInstance[senderID] = instanceID
		e.lastSeenSeq[senderID] = 0
	}
	if seq <= e.lastSeenSeq[senderID] {
		return true
	}
	e.lastSeenSeq[senderID] = seq
	return false
}

func (e *BCOEngine) nextSeqLocked() uint64 {
	e.local.Seq++
	return e.local.Seq
}

// AllocateOutboundSeq returns the next monotonic wire sequence for outbound messages.
func (e *BCOEngine) AllocateOutboundSeq() uint64 {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.nextSeqLocked()
}

// peersForResolutionLocked returns a copy of peer DeviceState for priority resolution, downgrading
// entries whose last registry update is older than PeerStateFreshnessLimit to Idle (spec.md FR edge case).
func (e *BCOEngine) peersForResolutionLocked(now time.Time) map[string]DeviceState {
	out := make(map[string]DeviceState, len(e.peers))
	for id, st := range e.peers {
		ts, ok := e.lastPeerStateAt[id]
		if !ok || now.Sub(ts) > PeerStateFreshnessLimit {
			faded := st
			faded.AudioPriority = AudioPriorityIdle
			faded.HasBluetoothConnection = false
			out[id] = faded
			continue
		}
		out[id] = st
	}
	return out
}

func (e *BCOEngine) handleClaimRequestLocked(msg *BCOMessage) {
	if msg.State == nil {
		return
	}
	// Only respond to claims from the same headset group.
	if e.local.TargetHeadsetAddr != "" && msg.State.TargetHeadsetAddr != "" &&
		!strings.EqualFold(e.local.TargetHeadsetAddr, msg.State.TargetHeadsetAddr) {
		return
	}
	now := time.Now()
	peersView := e.peersForResolutionLocked(now)
	peersView[msg.SenderID] = *msg.State
	winner, ok := ResolveWinner(e.local.DeviceID, e.local.DeviceState, peersView, e.networkSettings)
	approved := ok && winner == msg.SenderID
	targetPeer := msg.SenderID
	seq := e.nextSeqLocked()
	localSender := e.local.DeviceID
	inst := e.instanceID
	netw := e.net
	e.mu.Unlock()
	defer e.mu.Lock()
	ap := approved
	ack := &BCOMessage{
		Type:       MsgClaimAck,
		SenderID:   localSender,
		InstanceID: inst,
		Seq:        seq,
		Approved:   &ap,
	}
	_ = netw.Send(targetPeer, ack)
}

func (e *BCOEngine) handleClaimAckLocked(msg *BCOMessage) {
	if msg.Approved == nil {
		return
	}
	now := time.Now()
	if *msg.Approved {
		if e.pendingClaim != nil && e.pendingClaim.WinnerID == e.local.DeviceID {
			e.pendingClaim.ExpiresAt = now.Add(ClaimLeaseDuration)
		}
		return
	}
	e.pendingClaim = nil
	e.suppressNextClaimArm = true
}

func (e *BCOEngine) evaluateLocked() {
	now := time.Now()

	if e.pendingClaim != nil && now.After(e.pendingClaim.ExpiresAt) {
		if e.pendingClaim.WinnerID == e.local.DeviceID {
			e.net.Broadcast(&BCOMessage{
				Type:       MsgClaimRelease,
				SenderID:   e.local.DeviceID,
				InstanceID: e.instanceID,
				Seq:        e.nextSeqLocked(),
			})
		}
		e.pendingClaim = nil
		e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	}

	// Manual connect timeout: clear override if expired.
	if e.local.ManualConnectOverride && !e.manualConnectStartedAt.IsZero() {
		timeout := time.Duration(e.networkSettings.ManualConnectTimeoutMs.Value) * time.Millisecond
		if timeout > 0 && now.Sub(e.manualConnectStartedAt) >= timeout {
			e.local.ManualConnectOverride = false
			e.manualConnectStartedAt = time.Time{}
			defaultLogger.Info(LogEngine, "manual connect override cleared (timeout expired)")
		}
	}

	// Media pause grace period: if the shell recently reported Idle but we had a higher
	// priority, keep the old priority for resolution until the grace period elapses.
	localForResolution := e.local.DeviceState
	graceDuration := time.Duration(e.networkSettings.MediaPauseGraceMs.Value) * time.Millisecond
	graceExpired := false
	if e.graceActive {
		if now.Sub(e.audioPriorityDroppedAt) >= graceDuration {
			e.graceActive = false
			graceExpired = true
			defaultLogger.Info(LogEngine, fmt.Sprintf(
				"media pause grace expired after %s, applying real priority %s",
				graceDuration, audioTierName(e.local.AudioPriority),
			))
		} else if e.local.AudioPriority >= AudioPriorityMedia {
			e.graceActive = false
		} else {
			localForResolution.AudioPriority = e.audioPriorityBeforeGrace
		}
	}
	// When grace expired, broadcast the now-real priority so peers drop their held view.
	if graceExpired {
		bst := e.localBroadcastStateLocked(now)
		bst.Seq = e.nextSeqLocked()
		msg := &BCOMessage{
			Type:       MsgStateUpdate,
			SenderID:   e.local.DeviceID,
			InstanceID: e.instanceID,
			Seq:        bst.Seq,
			State:      cloneDeviceState(&bst.DeviceState),
		}
		e.net.Broadcast(msg)
		e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	}

	prevWinner := e.lastWinner
	peersView := e.peersForResolutionLocked(now)
	res := ComputePriorityResolution(e.local.DeviceID, localForResolution, peersView, e.networkSettings, e.local.TargetHeadsetAddr)
	winnerID, ok := res.WinnerID, res.Ok
	if !ok {
		winnerID = ""
	}
	e.lastWinner = winnerID

	logKey := res.StableLogKey()
	if logKey != e.lastPriorityLogKey {
		e.lastPriorityLogKey = logKey
		for _, ln := range res.LogLines() {
			defaultLogger.Info(LogPriority, ln)
		}
	}

	if ok && winnerID != "" && prevWinner != winnerID {
		trigger := SwitchTriggerPriority
		if e.forceConnectInProgress {
			trigger = SwitchTriggerForce
		}
		e.recordSwitchLocked(prevWinner, winnerID, trigger, now)
	}

	e.updateBluetoothEventsLocked(prevWinner, winnerID, ok, now, &res)
	e.updateClaimLeaseLocked(winnerID, ok, now)
}

func (e *BCOEngine) peerNameLocked(deviceID string) string {
	if deviceID == e.local.DeviceID {
		return e.local.DeviceName
	}
	if st, ok := e.peers[deviceID]; ok {
		return st.DeviceName
	}
	return ""
}

// peerDisplayLocked returns a human-readable peer label for logs (constitution VI).
func (e *BCOEngine) peerDisplayLocked(deviceID string) string {
	if n := e.peerNameLocked(deviceID); n != "" {
		return n
	}
	if deviceID != "" {
		return shortID(deviceID)
	}
	return "unknown peer"
}

// switchCooldownLocked returns the effective switch cooldown duration from network settings.
func (e *BCOEngine) switchCooldownLocked() time.Duration {
	ms := e.networkSettings.SwitchCooldownMs.Value
	if ms <= 0 {
		return bluetoothOpposingEventCooldown
	}
	return time.Duration(ms) * time.Millisecond
}

func (e *BCOEngine) forceConnectDisconnectTimeoutLocked() time.Duration {
	ms := e.networkSettings.ForceConnectDisconnectTimeoutMs.Value
	if ms < 0 {
		return 0
	}
	return time.Duration(ms) * time.Millisecond
}

func (e *BCOEngine) forceConnectConnectTimeoutLocked() time.Duration {
	ms := e.networkSettings.ForceConnectConnectTimeoutMs.Value
	if ms < 0 {
		return 0
	}
	return time.Duration(ms) * time.Millisecond
}

// btShellOpposingCooldownRemainingLocked returns remaining wait time before typ may be emitted after an opposing shell event.
func (e *BCOEngine) btShellOpposingCooldownRemainingLocked(now time.Time, typ string) time.Duration {
	if e.lastBTShellEventType == "" || e.lastBTShellEventType == typ {
		return 0
	}
	cooldown := e.switchCooldownLocked()
	elapsed := now.Sub(e.lastBTShellEventAt)
	if elapsed >= cooldown {
		return 0
	}
	return cooldown - elapsed
}

func (e *BCOEngine) recordSwitchLocked(fromID, toID string, trigger SwitchTrigger, now time.Time) {
	ev := SwitchEvent{
		Timestamp:    now.UnixMilli(),
		FromPeerID:   fromID,
		FromPeerName: e.peerNameLocked(fromID),
		ToPeerID:     toID,
		ToPeerName:   e.peerNameLocked(toID),
		Trigger:      trigger,
	}
	e.switchHistory.Add(ev)
}

// recordActivityAtLocked appends a feed row with an explicit timestamp (for ordering paired events).
func (e *BCOEngine) recordActivityAtLocked(tsMillis int64, eventType ActivityEventType, message string, peerName string) {
	e.activityFeed.Add(ActivityFeedEntry{
		ID:        e.nextActivityIDLocked(),
		Timestamp: tsMillis,
		Type:      eventType,
		Message:   message,
		PeerName:  peerName,
	})
}

func (e *BCOEngine) recordActivityLocked(eventType ActivityEventType, message string, peerName string) {
	e.recordActivityAtLocked(time.Now().UnixMilli(), eventType, message, peerName)
}

const peerLeftRetractWindowMs = 60_000

// retractRecentPeerLeftLocked removes the most recent peer_left activity for peerName
// if it was recorded within the last 60 seconds. Suppresses noise from transient transport drops
// that resolve themselves quickly.
func (e *BCOEngine) retractRecentPeerLeftLocked(peerName string) {
	if peerName == "" {
		return
	}
	cutoff := time.Now().UnixMilli() - peerLeftRetractWindowMs
	e.activityFeed.RemoveLastWhere(func(entry ActivityFeedEntry) bool {
		return entry.Type == ActivityPeerLeft &&
			entry.PeerName == peerName &&
			entry.Timestamp >= cutoff
	})
}

// headsetActivityNameLocked labels user-facing headset connect/disconnection activity copy.
// Prefer HeadsetDisplayName; if empty, use generic "saved headset" (local-state-headset-label.md).
func (e *BCOEngine) headsetActivityNameLocked() string {
	if n := strings.TrimSpace(e.local.HeadsetDisplayName); n != "" {
		return n
	}
	return "saved headset"
}

// recordBTGainedActivityLocked records an activity when this device actually gains the BT
// headset connection (HasBluetoothConnection transitions false→true). Uses peer state to
// determine if a peer previously held BT, producing a "Switched" vs "Connected" message.
func (e *BCOEngine) recordBTGainedActivityLocked() {
	hn := e.headsetActivityNameLocked()
	toLocal := strings.TrimSpace(e.local.DeviceName)
	if toLocal == "" {
		toLocal = "this device"
	}
	var prevHolderName string
	for _, p := range e.peers {
		if p.HasBluetoothConnection {
			prevHolderName = strings.TrimSpace(p.DeviceName)
			if prevHolderName == "" {
				prevHolderName = "peer"
			}
			break
		}
	}
	if prevHolderName == "" && e.lastKnownBTHolder != "" && e.lastKnownBTHolder != toLocal {
		prevHolderName = e.lastKnownBTHolder
	}
	ts := time.Now().UnixMilli()
	if prevHolderName != "" {
		e.recordActivityAtLocked(ts, ActivitySwitch, fmt.Sprintf("Switched %s from %s to %s", hn, prevHolderName, toLocal), hn)
	} else {
		e.recordActivityAtLocked(ts, ActivityConnect, fmt.Sprintf("Connected %s to %s", hn, toLocal), hn)
	}
}

// recordBTLostActivityLocked records an activity when this device actually loses the BT
// headset connection (HasBluetoothConnection transitions true→false). It also detects
// "reconnect storms" where our CONNECT_BT is quickly undone by an external disconnect
// (e.g., another OS grabbed the multipoint headset) and arms an exponential backoff
// on the CONNECT_BT emitter to avoid hammering the OS.
func (e *BCOEngine) recordBTLostActivityLocked() {
	hn := e.headsetActivityNameLocked()
	fromLocal := strings.TrimSpace(e.local.DeviceName)
	if fromLocal == "" {
		fromLocal = "this device"
	}
	ts := time.Now().UnixMilli()
	e.recordActivityAtLocked(ts, ActivityDisconnect, fmt.Sprintf("Disconnected %s from %s", hn, fromLocal), hn)

	now := time.Now()
	// An "external" disconnect is one we did NOT ask for. The engine emits DISCONNECT_BT
	// only when it wants to hand the headset to a peer; in that case btDisconnectOutstanding
	// is set until the loss is observed. Any other loss is external.
	external := !e.btDisconnectOutstanding
	// Only react if this loss happened shortly after we (intentionally) emitted CONNECT_BT.
	recentConnectAttempt := !e.lastConnectBTEmittedAt.IsZero() &&
		now.Sub(e.lastConnectBTEmittedAt) <= reconnectStormDetectionWindow
	if external && recentConnectAttempt {
		backoff := reconnectStormInitialBackoff
		if e.reconnectStormAttempts > 0 {
			backoff = time.Duration(1<<uint(e.reconnectStormAttempts)) * reconnectStormInitialBackoff
		}
		if backoff > reconnectStormMaxBackoff {
			backoff = reconnectStormMaxBackoff
		}
		e.reconnectStormAttempts++
		e.reconnectStormBackoffUntil = now.Add(backoff)
		e.btDebouncedSuppressLoggedStormBackoff = false
		defaultLogger.Info(LogEngine, fmt.Sprintf(
			"reconnect storm detected: external disconnect %s after CONNECT_BT; suppressing CONNECT_BT for %s (attempt #%d)",
			now.Sub(e.lastConnectBTEmittedAt).Truncate(time.Millisecond), backoff, e.reconnectStormAttempts,
		))
	}
	// Whatever happened, the intentional-disconnect flag applies at most once.
	e.btDisconnectOutstanding = false
}

func (e *BCOEngine) mayEmitOpposingBTShellEventLocked(now time.Time, typ string) bool {
	if e.lastBTShellEventType == "" || e.lastBTShellEventType == typ {
		return true
	}
	return now.Sub(e.lastBTShellEventAt) >= e.switchCooldownLocked()
}

func (e *BCOEngine) btShellCooldownRemainingLocked(now time.Time) time.Duration {
	if e.lastBTShellEventType == "" {
		return 0
	}
	cooldown := e.switchCooldownLocked()
	elapsed := now.Sub(e.lastBTShellEventAt)
	if elapsed >= cooldown {
		return 0
	}
	return cooldown - elapsed
}

func (e *BCOEngine) mayEmitBTShellEventLocked(now time.Time) bool {
	return e.btShellCooldownRemainingLocked(now) == 0
}

func (e *BCOEngine) noteBTShellEventEmittedLocked(now time.Time, typ string) {
	e.lastBTShellEventAt = now
	e.lastBTShellEventType = typ
}

// clearConnectCooldownOnBTReleaseLocked resets the CONNECT_BT cooldown when a peer
// transitions hasBluetoothConnection from true to false. This allows the engine to
// immediately re-emit CONNECT_BT so the local device can take over the headset.
func (e *BCOEngine) clearConnectCooldownOnBTReleaseLocked(prev, next DeviceState) {
	if prev.HasBluetoothConnection && !next.HasBluetoothConnection &&
		e.lastBTShellEventType == "CONNECT_BT" {
		defaultLogger.Info(LogEngine, fmt.Sprintf(
			"peer %q released headset — clearing CONNECT_BT cooldown for retry",
			strings.TrimSpace(prev.DeviceName),
		))
		e.lastBTShellEventAt = time.Time{}
		e.lastBTShellEventType = ""
	}
}

func (e *BCOEngine) peerSharesHeadsetGroupLocked(st DeviceState) bool {
	return e.local.TargetHeadsetAddr == "" || strings.EqualFold(st.TargetHeadsetAddr, e.local.TargetHeadsetAddr)
}

func (e *BCOEngine) forceConnectPeerHoldersLocked(now time.Time) []string {
	peers := e.peersForResolutionLocked(now)
	holders := make([]string, 0, len(peers))
	for id, st := range peers {
		if !e.peerSharesHeadsetGroupLocked(st) || !st.HasBluetoothConnection {
			continue
		}
		holders = append(holders, id)
	}
	sort.Strings(holders)
	return holders
}

func (e *BCOEngine) emitForceConnectBTLocked(prevWinner string, now time.Time) {
	if e.local.HasBluetoothConnection {
		return
	}
	e.btDisconnectOutstanding = false
	e.btDebouncedSuppressLoggedConnectOpp = false
	e.btDebouncedSuppressLoggedConnectStableFalse = false
	// User-initiated ForceConnect overrides any reconnect-storm backoff.
	e.reconnectStormAttempts = 0
	e.reconnectStormBackoffUntil = time.Time{}
	e.btDebouncedSuppressLoggedStormBackoff = false
	e.tryEmit(EngineEvent{Type: "CONNECT_BT"})
	e.noteBTShellEventEmittedLocked(now, "CONNECT_BT")
	e.lastConnectBTEmittedAt = now
	defaultLogger.Info(LogPriority, fmt.Sprintf(
		"ForceConnect CONNECT_BT event: all peers released headset, local %q should connect saved device",
		e.local.DeviceName,
	))
}

// btSafetyRecentBTGrace is the window after any device was last observed with BT during
// which smart/conservative policies still allow auto-connect. Covers the gap between
// a peer releasing the headset and the local device connecting to it.
const btSafetyRecentBTGrace = 10 * time.Second

// btSafetyPolicyAllowsConnect checks whether the current BT safety policy permits auto-connect.
func (e *BCOEngine) btSafetyPolicyAllowsConnect(now time.Time) bool {
	policy := BtSafetyPolicy(e.networkSettings.BtSafetyPolicy.Value)
	peersView := e.peersForResolutionLocked(now)
	switch policy {
	case BtSafetyAggressive:
		return true
	case BtSafetySmart:
		if len(e.peers) == 0 {
			return true
		}
		for _, p := range peersView {
			if p.HasBluetoothConnection {
				return true
			}
		}
		if !e.lastKnownBTHolderAt.IsZero() && now.Sub(e.lastKnownBTHolderAt) < btSafetyRecentBTGrace {
			return true
		}
		return false
	case BtSafetyConservative:
		if e.local.HasBluetoothConnection {
			return true
		}
		for _, p := range peersView {
			if p.HasBluetoothConnection {
				return true
			}
		}
		if !e.lastKnownBTHolderAt.IsZero() && now.Sub(e.lastKnownBTHolderAt) < btSafetyRecentBTGrace {
			return true
		}
		return false
	default:
		return true
	}
}

func (e *BCOEngine) updateBluetoothEventsLocked(prevWinner, winnerID string, ok bool, now time.Time, res *PriorityResolution) {
	if e.local.HasBluetoothConnection {
		e.btLastSeenConnectedAt = now
		e.lastKnownBTHolder = strings.TrimSpace(e.local.DeviceName)
		e.lastKnownBTHolderAt = now
		// A connection that persists past the storm-detection window proves the last
		// CONNECT_BT attempt stuck. Reset the exponential backoff counter.
		if e.reconnectStormAttempts > 0 && !e.lastConnectBTEmittedAt.IsZero() &&
			now.Sub(e.lastConnectBTEmittedAt) > reconnectStormDetectionWindow {
			defaultLogger.Info(LogEngine, fmt.Sprintf(
				"reconnect storm cleared: connection held %s past last CONNECT_BT, resetting backoff (was attempt #%d)",
				now.Sub(e.lastConnectBTEmittedAt).Truncate(time.Second), e.reconnectStormAttempts,
			))
			e.reconnectStormAttempts = 0
			e.reconnectStormBackoffUntil = time.Time{}
		}
	} else {
		for _, p := range e.peers {
			if p.HasBluetoothConnection {
				if n := strings.TrimSpace(p.DeviceName); n != "" {
					e.lastKnownBTHolder = n
					e.lastKnownBTHolderAt = now
				}
				break
			}
		}
	}

	disconnectIntent := e.local.HasBluetoothConnection && ok && winnerID != "" && winnerID != e.local.DeviceID &&
		!e.partitionLivenessLost && !e.btDisconnectOutstanding

	if e.local.HasBluetoothConnection && ok && winnerID != "" && winnerID != e.local.DeviceID {
		// FR-014 (1): BT holder keeps headset during partition; do not tear down on phantom remote winner.
		if e.partitionLivenessLost {
			e.btDisconnectOutstanding = false
		} else if !e.btDisconnectOutstanding {
			if e.mayEmitOpposingBTShellEventLocked(now, "DISCONNECT_BT") {
				e.btDebouncedSuppressLoggedDisconnect = false
				e.tryEmit(EngineEvent{Type: "DISCONNECT_BT"})
				e.noteBTShellEventEmittedLocked(now, "DISCONNECT_BT")
				e.btDisconnectOutstanding = true
				if res != nil {
					defaultLogger.Info(LogPriority, fmt.Sprintf(
						"DISCONNECT_BT event: local %q still had headset link but winner is remote %q (%s) with higher claim — disconnect here so the other device can connect",
						e.local.DeviceName, winnerName(*res), shortID(winnerID),
					))
				}
			} else if disconnectIntent && !e.btDebouncedSuppressLoggedDisconnect {
				rem := e.btShellOpposingCooldownRemainingLocked(now, "DISCONNECT_BT")
				peerDisp := e.peerDisplayLocked(winnerID)
				defaultLogger.Info(LogEngine, fmt.Sprintf(
					"suppressed Bluetooth shell event DISCONNECT_BT (peer %q): opposing cooldown remaining %s",
					peerDisp, rem.Truncate(time.Millisecond),
				))
				e.btDebouncedSuppressLoggedDisconnect = true
			}
		}
	} else {
		e.btDisconnectOutstanding = false
	}
	if !disconnectIntent {
		e.btDebouncedSuppressLoggedDisconnect = false
	}

	// Do not request connect while the latest report says linked, or during a short window after last true (transient false flicker).
	connectAllowed := !e.local.HasBluetoothConnection &&
		(e.btLastSeenConnectedAt.IsZero() || now.Sub(e.btLastSeenConnectedAt) >= bluetoothStableFalseBeforeConnect)

	connectCandidate := ok && winnerID == e.local.DeviceID && !e.local.HasBluetoothConnection
	if connectCandidate && e.forceConnectInProgress {
		connectCandidate = false
	}
	if connectCandidate && !e.btSafetyPolicyAllowsConnect(now) {
		defaultLogger.Info(LogEngine, fmt.Sprintf(
			"BT safety policy %q suppresses CONNECT_BT (no device in network has BT)",
			e.networkSettings.BtSafetyPolicy.Value,
		))
		connectCandidate = false
	}

	if connectCandidate {
		if now.Before(e.reconnectStormBackoffUntil) {
			rem := e.reconnectStormBackoffUntil.Sub(now).Truncate(time.Millisecond)
			if !e.btDebouncedSuppressLoggedStormBackoff {
				defaultLogger.Info(LogEngine, fmt.Sprintf(
					"suppressed Bluetooth shell event CONNECT_BT: reconnect-storm backoff remaining %s (attempts=%d)",
					rem, e.reconnectStormAttempts,
				))
				e.btDebouncedSuppressLoggedStormBackoff = true
			}
			return
		}
		e.btDebouncedSuppressLoggedStormBackoff = false
		if connectAllowed {
			e.btDebouncedSuppressLoggedConnectStableFalse = false
			if e.mayEmitBTShellEventLocked(now) {
				e.btDebouncedSuppressLoggedConnectOpp = false
				e.tryEmit(EngineEvent{Type: "CONNECT_BT"})
				e.noteBTShellEventEmittedLocked(now, "CONNECT_BT")
				e.lastConnectBTEmittedAt = now
				if res != nil {
					defaultLogger.Info(LogPriority, fmt.Sprintf(
						"CONNECT_BT event: local %q won resolution (audio_priority=%d tier=%s effective_score=%d) and reports no headset link — platform should connect saved device",
						e.local.DeviceName, e.local.AudioPriority, audioTierName(e.local.AudioPriority), res.LocalEffectiveScore(e.local.DeviceID),
					))
				}
			} else if !e.btDebouncedSuppressLoggedConnectOpp {
				rem := e.btShellCooldownRemainingLocked(now)
				peerDisp := e.peerDisplayLocked(prevWinner)
				defaultLogger.Info(LogEngine, fmt.Sprintf(
					"suppressed Bluetooth shell event CONNECT_BT (peer %q): cooldown remaining %s",
					peerDisp, rem.Truncate(time.Millisecond),
				))
				e.btDebouncedSuppressLoggedConnectOpp = true
			}
		} else if !e.local.HasBluetoothConnection {
			e.btDebouncedSuppressLoggedConnectOpp = false
			remStable := bluetoothStableFalseBeforeConnect - now.Sub(e.btLastSeenConnectedAt)
			if remStable > 0 {
				if !e.btDebouncedSuppressLoggedConnectStableFalse {
					peerDisp := e.peerDisplayLocked(prevWinner)
					defaultLogger.Info(LogEngine, fmt.Sprintf(
						"suppressed Bluetooth shell event CONNECT_BT (peer %q): stable-false debounce remaining %s",
						peerDisp, remStable.Truncate(time.Millisecond),
					))
					e.btDebouncedSuppressLoggedConnectStableFalse = true
				}
			} else {
				e.btDebouncedSuppressLoggedConnectStableFalse = false
			}
		} else {
			e.btDebouncedSuppressLoggedConnectOpp = false
			e.btDebouncedSuppressLoggedConnectStableFalse = false
		}
	} else {
		e.btDebouncedSuppressLoggedConnectOpp = false
		e.btDebouncedSuppressLoggedConnectStableFalse = false
	}
}

func (e *BCOEngine) updateClaimLeaseLocked(winnerID string, ok bool, now time.Time) {
	if !ok || winnerID != e.local.DeviceID {
		if e.pendingClaim != nil && e.pendingClaim.WinnerID == e.local.DeviceID {
			e.pendingClaim = nil
		}
		return
	}
	if e.local.HasBluetoothConnection {
		e.pendingClaim = nil
		return
	}

	// FR-014 (2): non-holders do not arm new claims until partition heals (see partitionLivenessLost).
	if e.partitionLivenessLost {
		if e.pendingClaim != nil && e.pendingClaim.WinnerID == e.local.DeviceID {
			e.pendingClaim = nil
		}
		return
	}

	if e.suppressNextClaimArm {
		e.suppressNextClaimArm = false
		return
	}

	if e.pendingClaim == nil || e.pendingClaim.WinnerID != e.local.DeviceID {
		e.pendingClaim = &PendingClaim{WinnerID: e.local.DeviceID, ExpiresAt: now.Add(ClaimLeaseDuration)}
		bst := e.localBroadcastStateLocked(now)
		bst.Seq = e.nextSeqLocked()
		e.net.Broadcast(&BCOMessage{
			Type:       MsgClaimRequest,
			SenderID:   e.local.DeviceID,
			InstanceID: e.instanceID,
			Seq:        bst.Seq,
			State:      cloneDeviceState(&bst.DeviceState),
		})
	} else {
		e.pendingClaim.ExpiresAt = now.Add(ClaimLeaseDuration)
	}
}

func cloneDeviceState(st *DeviceState) *DeviceState {
	if st == nil {
		return nil
	}
	c := *st
	return &c
}

// SetBaseBias updates the local device's base priority bias, broadcasts a state update, and re-evaluates.
func (e *BCOEngine) SetBaseBias(bias int) {
	e.mu.Lock()
	e.local.BaseBias = bias
	seq := e.nextSeqLocked()
	bst := e.localBroadcastStateLocked(time.Now())
	bst.Seq = seq
	inst := e.instanceID
	net := e.net
	e.mu.Unlock()
	msg := &BCOMessage{
		Type:       MsgStateUpdate,
		SenderID:   bst.DeviceID,
		InstanceID: inst,
		Seq:        seq,
		State:      cloneDeviceState(&bst.DeviceState),
	}
	net.Broadcast(msg)
	e.mu.Lock()
	e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	e.evaluateLocked()
	e.mu.Unlock()
}

// SetManualConnectOverride sets or clears the manual connect priority boost.
// When enabling, records the start time for timeout tracking.
func (e *BCOEngine) SetManualConnectOverride(override bool) {
	e.mu.Lock()
	e.local.ManualConnectOverride = override
	if override {
		e.manualConnectStartedAt = time.Now()
	} else {
		e.manualConnectStartedAt = time.Time{}
	}
	seq := e.nextSeqLocked()
	bst := e.localBroadcastStateLocked(time.Now())
	bst.Seq = seq
	inst := e.instanceID
	net := e.net
	e.mu.Unlock()
	msg := &BCOMessage{
		Type:       MsgStateUpdate,
		SenderID:   bst.DeviceID,
		InstanceID: inst,
		Seq:        seq,
		State:      cloneDeviceState(&bst.DeviceState),
	}
	net.Broadcast(msg)
	e.mu.Lock()
	e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	e.evaluateLocked()
	e.mu.Unlock()
}

// SetTargetHeadset sets the locally configured headset and populates DeviceState headset fields.
// Broadcasts STATE_UPDATE so peers learn about the new headset.
func (e *BCOEngine) SetTargetHeadset(addr, name string, selectedAtMs int64) {
	e.mu.Lock()
	e.targetHeadset = HeadsetConfig{Addr: addr, Name: name, SelectedAt: selectedAtMs}
	e.local.TargetHeadsetAddr = addr
	e.local.TargetHeadsetName = name
	e.local.HeadsetSelectedAt = selectedAtMs
	e.local.HeadsetDisplayName = name
	seq := e.nextSeqLocked()
	bst := e.localBroadcastStateLocked(time.Now())
	bst.Seq = seq
	inst := e.instanceID
	net := e.net
	e.mu.Unlock()

	msg := &BCOMessage{
		Type:       MsgStateUpdate,
		SenderID:   bst.DeviceID,
		InstanceID: inst,
		Seq:        seq,
		State:      cloneDeviceState(&bst.DeviceState),
	}
	net.Broadcast(msg)
	e.mu.Lock()
	e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	e.evaluateLocked()
	e.mu.Unlock()
}

// TargetHeadsetSnapshot returns a copy of the locally configured headset.
func (e *BCOEngine) TargetHeadsetSnapshot() HeadsetConfig {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.targetHeadset
}

// PushHeadsetToPeers sends HEADSET_UPDATE with the current headset config to all connected peers.
func (e *BCOEngine) PushHeadsetToPeers() {
	e.mu.Lock()
	hs := e.targetHeadset
	seq := e.nextSeqLocked()
	st := e.local
	inst := e.instanceID
	net := e.net
	peerCount := len(e.peers)
	e.mu.Unlock()

	if hs.Addr == "" {
		return
	}
	msg := &BCOMessage{
		Type:       MsgHeadsetUpdate,
		SenderID:   st.DeviceID,
		InstanceID: inst,
		Seq:        seq,
		Headset:    &hs,
	}
	net.Broadcast(msg)
	e.mu.Lock()
	e.recordActivityLocked(ActivityHeadsetSync,
		fmt.Sprintf("Pushed headset %s to %d peers", hs.Name, peerCount), "")
	e.mu.Unlock()
}

func (e *BCOEngine) handleAllowlistSyncLocked(msg *BCOMessage) {
	if msg.Allowlist == nil || e.allowlist == nil {
		return
	}
	selfID, err := peer.Decode(e.local.DeviceID)
	if err != nil {
		return
	}
	newActive, newInactive := e.allowlist.Merge(msg.Allowlist, selfID)
	if len(newActive) == 0 && len(newInactive) == 0 {
		return
	}
	if e.storagePath != "" {
		_ = SaveAllowlistToStorage(e.allowlist, e.storagePath)
	}

	// Collect multiaddr hints for transitive connections before emitting events.
	type transitiveHint struct {
		name  string
		maddr string
	}
	var transitiveHints []transitiveHint

	senderName := e.peerNameLocked(msg.SenderID)
	referrer := senderName
	if referrer == "" {
		referrer = shortID(msg.SenderID)
	}
	var lastAutoPairName string
	for _, pid := range newActive {
		name := ""
		if n, ok := e.allowlist.FriendlyName(pid); ok {
			name = n
		} else {
			name = PeerFingerprint(pid)
		}
		lastAutoPairName = name
		ps := pid.String()
		e.tryEmit(EngineEvent{Type: "PEER_JOINED", PeerName: &name, PeerID: &ps})

		if maddr := e.allowlist.MultiaddrHint(pid); maddr != "" {
			transitiveHints = append(transitiveHints, transitiveHint{name: name, maddr: maddr})
		}
	}
	if len(newActive) == 1 {
		e.recordActivityLocked(ActivityAutoPaired,
			fmt.Sprintf("Auto-paired with %s via %s", lastAutoPairName, referrer), lastAutoPairName)
	} else if len(newActive) > 1 {
		e.recordActivityLocked(ActivityAutoPaired,
			fmt.Sprintf("Auto-paired with %d devices via %s", len(newActive), referrer), "")
	}
	for _, pid := range newInactive {
		name := PeerFingerprint(pid)
		if st, ok := e.peers[pid.String()]; ok {
			name = st.DeviceName
		}
		ps := pid.String()
		delete(e.peers, ps)
		delete(e.lastPeerStateAt, ps)
		e.forgetPeerWireStateLocked(ps)
		e.recordActivityLocked(ActivityDisconnect, fmt.Sprintf("%s removed via sync", name), name)
		e.tryEmit(EngineEvent{Type: "PEER_REMOVED", PeerName: &name, PeerID: &ps})
	}
	e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	e.evaluateLocked()

	// Gossip merged state and attempt transitive connections outside the lock.
	net := e.net
	senderID := e.local.DeviceID
	inst := e.instanceID
	seq := e.nextSeqLocked()
	state := e.allowlist.State()
	e.mu.Unlock()
	net.Broadcast(&BCOMessage{
		Type:       MsgAllowlistSync,
		SenderID:   senderID,
		InstanceID: inst,
		Seq:        seq,
		Allowlist:  state,
	})
	const maxTransitiveDials = 4
	for i, h := range transitiveHints {
		if i >= maxTransitiveDials {
			defaultLogger.Info(LogNetwork, fmt.Sprintf("skipping %d remaining transitive dials (limit %d)", len(transitiveHints)-i, maxTransitiveDials))
			break
		}
		defaultLogger.Info(LogNetwork, fmt.Sprintf("attempting transitive connection to %s at %s", h.name, h.maddr))
		net.ConnectTransitivePeer(h.maddr)
	}
	e.mu.Lock()
}

func (e *BCOEngine) handleHeadsetUpdateLocked(msg *BCOMessage) {
	if msg.Headset == nil {
		return
	}
	hs := *msg.Headset
	peerName := e.peerNameLocked(msg.SenderID)
	e.tryEmit(EngineEvent{
		Type:     "HEADSET_UPDATE_RECEIVED",
		PeerName: &peerName,
		PeerID:   &msg.SenderID,
		Headset:  &hs,
	})
	e.recordActivityLocked(ActivityHeadsetSync,
		fmt.Sprintf("Peer %s changed headset to %s", peerName, hs.Name), peerName)
}

// CheckHeadsetAutoSync is called when a peer's STATE_UPDATE arrives with headset info.
// If the peer has a more recently selected headset, emits HEADSET_AUTO_SYNC for the shell.
func (e *BCOEngine) checkHeadsetAutoSyncLocked(sender string, peerState *DeviceState) {
	if peerState == nil || peerState.TargetHeadsetAddr == "" {
		return
	}
	if strings.EqualFold(peerState.TargetHeadsetAddr, e.local.TargetHeadsetAddr) {
		return
	}
	if peerState.HeadsetSelectedAt <= e.local.HeadsetSelectedAt {
		return
	}
	peerName := e.peerNameLocked(sender)
	hs := HeadsetConfig{
		Addr:       peerState.TargetHeadsetAddr,
		Name:       peerState.TargetHeadsetName,
		SelectedAt: peerState.HeadsetSelectedAt,
	}
	e.tryEmit(EngineEvent{
		Type:     "HEADSET_AUTO_SYNC",
		PeerName: &peerName,
		PeerID:   &sender,
		Headset:  &hs,
	})
}

// BroadcastAllowlistSync sends the current CRDT allowlist state to all connected peers.
func (e *BCOEngine) BroadcastAllowlistSync() {
	e.mu.Lock()
	if e.allowlist == nil {
		e.mu.Unlock()
		return
	}
	state := e.allowlist.State()
	seq := e.nextSeqLocked()
	senderID := e.local.DeviceID
	inst := e.instanceID
	net := e.net
	e.mu.Unlock()

	net.Broadcast(&BCOMessage{
		Type:       MsgAllowlistSync,
		SenderID:   senderID,
		InstanceID: inst,
		Seq:        seq,
		Allowlist:  state,
	})
}

// NotifyAudioPriorityDrop is called when the shell detects audio priority dropping below Media.
// If a grace period is configured, the previous priority is preserved for resolution.
// Callers who already hold e.mu should call armAudioPriorityGraceLocked directly.
func (e *BCOEngine) NotifyAudioPriorityDrop(prevPriority, newPriority AudioPriority) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if prevPriority >= AudioPriorityMedia && newPriority < AudioPriorityMedia {
		e.armAudioPriorityGraceLocked(prevPriority)
	}
}

// armAudioPriorityGraceLocked starts the media-pause grace window holding prevPriority.
// No-op when MediaPauseGraceMs is zero or prevPriority is below Media. Callers must
// hold e.mu. Intended to be called at the same point the real priority is transitioned
// below Media so the subsequent outbound STATE_UPDATE reflects the held value.
func (e *BCOEngine) armAudioPriorityGraceLocked(prevPriority AudioPriority) {
	graceDuration := time.Duration(e.networkSettings.MediaPauseGraceMs.Value) * time.Millisecond
	if graceDuration <= 0 || prevPriority < AudioPriorityMedia {
		return
	}
	e.graceActive = true
	e.audioPriorityBeforeGrace = prevPriority
	e.audioPriorityDroppedAt = time.Now()
	defaultLogger.Info(LogEngine, fmt.Sprintf(
		"media pause grace started: holding priority %s for %s",
		audioTierName(prevPriority), graceDuration,
	))
}

// EvaluateSync runs one resolution pass (claim expiry, BT events, outbound claims). Useful for tests and manual drivers.
func (e *BCOEngine) EvaluateSync() {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.evaluateLocked()
}

// ForceConnect requests immediate headset ownership by temporarily boosting local priority
// to ActiveCall(300), waiting for matching peers to release BT, then explicitly emitting
// CONNECT_BT locally and waiting for the shell to report HasBluetoothConnection=true.
// If local already holds the headset, this is a no-op returning true.
// Emits FORCE_CONNECT_RESULT with success/failure to the event stream.
func (e *BCOEngine) ForceConnect() bool {
	e.mu.Lock()
	if e.local.HasBluetoothConnection {
		e.mu.Unlock()
		s := true
		e.tryEmit(EngineEvent{Type: "FORCE_CONNECT_RESULT", Success: &s})
		return true
	}

	origPriority := e.local.AudioPriority
	prevWinner := e.lastWinner
	disconnectTimeout := e.forceConnectDisconnectTimeoutLocked()
	connectTimeout := e.forceConnectConnectTimeoutLocked()
	e.forceConnectInProgress = true
	e.forceConnectBTConfirmed = false
	e.local.AudioPriority = AudioPriorityActiveCall
	seq := e.nextSeqLocked()
	bst := e.localBroadcastStateLocked(time.Now())
	bst.Seq = seq
	inst := e.instanceID
	net := e.net
	e.mu.Unlock()

	msg := &BCOMessage{
		Type:       MsgStateUpdate,
		SenderID:   bst.DeviceID,
		InstanceID: inst,
		Seq:        seq,
		State:      cloneDeviceState(&bst.DeviceState),
	}
	net.Broadcast(msg)

	e.mu.Lock()
	e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	e.evaluateLocked()
	e.mu.Unlock()

	waitForCondition := func(timeout time.Duration, predicate func(localHasBT bool, peerHolders []string) bool) bool {
		checkOnce := func() (bool, bool) {
			e.mu.Lock()
			localHasBT := e.local.HasBluetoothConnection
			peerHolders := e.forceConnectPeerHoldersLocked(time.Now())
			e.mu.Unlock()
			return predicate(localHasBT, peerHolders), localHasBT
		}
		if matched, _ := checkOnce(); matched {
			return true
		}
		if timeout <= 0 {
			return false
		}
		timer := time.NewTimer(timeout)
		defer timer.Stop()
		tick := time.NewTicker(100 * time.Millisecond)
		defer tick.Stop()
		for {
			select {
			case <-timer.C:
				return false
			case <-tick.C:
				if matched, _ := checkOnce(); matched {
					return true
				}
			}
		}
	}

	success := false
	reason := "local connect not observed within timeout"

	// Phase 1: wait for matching peers to release BT, unless local already connected.
	if !waitForCondition(disconnectTimeout, func(localHasBT bool, peerHolders []string) bool {
		return localHasBT || len(peerHolders) == 0
	}) {
		reason = "peer BT release not observed within timeout"
		goto restore
	}

	e.mu.Lock()
	if !e.local.HasBluetoothConnection {
		e.emitForceConnectBTLocked(prevWinner, time.Now())
	}
	e.mu.Unlock()

	// Phase 2: wait for the local shell to confirm the headset link.
	if !waitForCondition(connectTimeout, func(localHasBT bool, peerHolders []string) bool {
		return localHasBT
	}) {
		reason = "local BT connect not observed within timeout"
		goto restore
	}
	success = true

restore:
	e.mu.Lock()
	e.forceConnectInProgress = false
	e.forceConnectBTConfirmed = false
	e.local.AudioPriority = origPriority
	restoreSeq := e.nextSeqLocked()
	restoreBst := e.localBroadcastStateLocked(time.Now())
	restoreBst.Seq = restoreSeq
	e.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	e.evaluateLocked()
	e.mu.Unlock()

	restoreMsg := &BCOMessage{
		Type:       MsgStateUpdate,
		SenderID:   restoreBst.DeviceID,
		InstanceID: inst,
		Seq:        restoreSeq,
		State:      cloneDeviceState(&restoreBst.DeviceState),
	}
	net.Broadcast(restoreMsg)

	s := success
	ev := EngineEvent{Type: "FORCE_CONNECT_RESULT", Success: &s}
	if !success {
		ev.Reason = &reason
	}
	e.tryEmit(ev)
	return success
}

// RecordSwitchEvent appends a switch event to the history ring buffer.
func (e *BCOEngine) RecordSwitchEvent(ev SwitchEvent) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.switchHistory.Add(ev)
}

// GetSwitchHistory returns switch events newest-first.
func (e *BCOEngine) GetSwitchHistory() []SwitchEvent {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.switchHistory.Entries()
}

func (e *BCOEngine) nextActivityIDLocked() string {
	e.activitySeq++
	return fmt.Sprintf("evt-%06d", e.activitySeq)
}

// RecordActivity appends an activity feed entry with an auto-generated ID and timestamp.
func (e *BCOEngine) RecordActivity(eventType ActivityEventType, message string, peerName string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.activityFeed.Add(ActivityFeedEntry{
		ID:        e.nextActivityIDLocked(),
		Timestamp: time.Now().UnixMilli(),
		Type:      eventType,
		Message:   message,
		PeerName:  peerName,
	})
}

// GetActivityFeed returns activity entries newest-first, limited to maxEntries (0 = all).
func (e *BCOEngine) GetActivityFeed(maxEntries int) []ActivityFeedEntry {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.activityFeed.EntriesLimited(maxEntries)
}
