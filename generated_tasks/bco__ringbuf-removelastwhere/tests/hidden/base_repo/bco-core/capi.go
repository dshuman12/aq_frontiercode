package main

/*
#include <stdlib.h>
*/
import "C"

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
	"unsafe"

	"github.com/libp2p/go-libp2p/core/peer"
)

var globalHandles = NewHandleTable()

func goString(cs *C.char) string {
	if cs == nil {
		return ""
	}
	return C.GoString(cs)
}

func audioPriorityFromInt(p int) AudioPriority {
	switch p {
	case 0:
		return AudioPriorityIdle
	case 100:
		return AudioPriorityMedia
	case 200:
		return AudioPriorityIncomingCall
	case 300:
		return AudioPriorityActiveCall
	default:
		return AudioPriority(p)
	}
}

//export BCONewEngine
func BCONewEngine(deviceName *C.char, storagePath *C.char) C.int {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(-1, fmt.Sprint(r))
		}
	}()
	sp := goString(storagePath)
	if sp == "" {
		setEngineError(-1, "storagePath is required")
		return -1
	}
	dn := goString(deviceName)
	ctx := context.Background()
	h, err := NewHostForStorage(ctx, sp)
	if err != nil {
		setEngineError(-1, err.Error())
		return -1
	}
	instanceID, err := WriteNewInstanceID(sp)
	if err != nil {
		_ = h.Close()
		setEngineError(-1, err.Error())
		return -1
	}
	al := NewPeerAllowlist()
	if err := LoadAllowlistFromStorage(al, sp); err != nil {
		_ = h.Close()
		setEngineError(-1, err.Error())
		return -1
	}
	pending := NewPendingPairing()
	ns, err := LoadNetworkSettings(sp)
	if err != nil {
		_ = h.Close()
		setEngineError(-1, err.Error())
		return -1
	}
	local := DeviceState{
		DeviceID:      h.ID().String(),
		DeviceName:    dn,
		AudioPriority: AudioPriorityIdle,
		Platform:      "go-core",
		CoreVersion:   CoreVersion,
	}
	eng := NewBCOEngine(local, instanceID, nil, al, sp, ns)
	netw, err := AttachBCONetwork(ctx, h, eng, al, pending, sp)
	if err != nil {
		_ = h.Close()
		setEngineError(-1, err.Error())
		return -1
	}
	id := globalHandles.AddBinding(&EngineBinding{Engine: eng, Network: netw})
	eng.RecordActivity(ActivityServiceStart, "Service started", "")
	defaultLogger.Info(LogCAPI, fmt.Sprintf("engine %d started peer=%s", id, h.ID()))
	return C.int(id)
}

//export BCOStop
func BCOStop(engineID C.int) {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	b, ok := globalHandles.GetBinding(int(engineID))
	if !ok {
		return
	}
	if b.Network != nil {
		_ = b.Network.Close()
	}
	b.Engine.Stop()
	globalHandles.Remove(int(engineID))
}

//export BCOSendStateUpdate
func BCOSendStateUpdate(engineID C.int, priority C.int, hasBT C.int, headsetDisplayName *C.char) {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return
	}
	eng.mu.Lock()
	prevPriority := eng.local.AudioPriority
	prevBT := eng.local.HasBluetoothConnection
	priorityApplied := false
	if int(priority) >= 0 {
		if eng.forceConnectInProgress {
			defaultLogger.Info(LogEngine, fmt.Sprintf(
				"STATE_UPDATE from platform ignored priority=%d during ForceConnect boost; keeping audio_priority=%d (%s)",
				int(priority), int(eng.local.AudioPriority), audioTierName(eng.local.AudioPriority),
			))
		} else {
			eng.local.AudioPriority = audioPriorityFromInt(int(priority))
			priorityApplied = true
		}
	}
	newPriority := eng.local.AudioPriority
	reportedBT := hasBT != 0
	newBT := reportedBT
	btApplied := true
	if eng.forceConnectInProgress {
		if reportedBT {
			eng.forceConnectBTConfirmed = true
		} else if eng.forceConnectBTConfirmed {
			newBT = eng.local.HasBluetoothConnection
			btApplied = false
			defaultLogger.Info(LogEngine, "STATE_UPDATE from platform ignored has_bluetooth=false during ForceConnect after local BT confirmation")
		}
	}
	eng.local.HasBluetoothConnection = newBT
	btGained := !prevBT && newBT
	btLost := prevBT && !newBT
	hdn := goString(headsetDisplayName)
	if hdn != "" {
		eng.local.HeadsetDisplayName = hdn
	}

	// Clear manual connect override when audio drops to Idle.
	if eng.local.ManualConnectOverride && newPriority < AudioPriorityMedia {
		eng.local.ManualConnectOverride = false
		eng.manualConnectStartedAt = time.Time{}
		defaultLogger.Info(LogEngine, "manual connect override cleared (audio dropped to Idle)")
	}

	// Arm media pause grace BEFORE broadcasting so the outbound STATE_UPDATE
	// carries the grace-held priority. Without this, peers would briefly see
	// audio=Idle and race to steal the headset for up to MediaPauseGraceMs.
	if prevPriority >= AudioPriorityMedia && newPriority < AudioPriorityMedia {
		eng.armAudioPriorityGraceLocked(prevPriority)
	}

	seq := eng.nextSeqLocked()
	now := time.Now()
	broadcastSt := eng.localBroadcastStateLocked(now)
	broadcastSt.Seq = seq
	inst := eng.instanceID
	peerCount := len(eng.peers)
	eng.mu.Unlock()

	defaultLogger.Info(LogEngine, fmt.Sprintf(
		"STATE_UPDATE from platform: %q audio_priority=%d (%s) has_bluetooth=%v (reported=%v bt_applied=%v priority param=%d, priority_applied=%v, -1 means keep existing)",
		broadcastSt.DeviceName, int(newPriority), audioTierName(newPriority), newBT, reportedBT, btApplied, int(priority), priorityApplied,
	))
	if broadcastSt.AudioPriorityHeldUntilMs != 0 {
		defaultLogger.Info(LogEngine, fmt.Sprintf(
			"STATE_UPDATE broadcasting grace-held priority %s (raw=%s) until unix-ms=%d",
			audioTierName(broadcastSt.AudioPriority), audioTierName(broadcastSt.AudioPriorityRaw),
			broadcastSt.AudioPriorityHeldUntilMs,
		))
	}
	msg := &BCOMessage{
		Type:       MsgStateUpdate,
		SenderID:   broadcastSt.DeviceID,
		InstanceID: inst,
		Seq:        seq,
		State:      cloneDeviceState(&broadcastSt.DeviceState),
	}
	defaultLogger.Info(LogEngine, fmt.Sprintf(
		"[Trace] BCOSendStateUpdate broadcasting seq=%d to %d peers", seq, peerCount,
	))
	eng.Broadcast(msg)
	eng.mu.Lock()
	if btGained {
		eng.recordBTGainedActivityLocked()
	} else if btLost {
		eng.recordBTLostActivityLocked()
	}
	eng.tryEmit(EngineEvent{Type: "STATE_CHANGED"})
	eng.evaluateLocked()
	eng.mu.Unlock()
}

//export BCOReportBTProgress
func BCOReportBTProgress(engineID C.int, status C.int) C.int {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return -1
	}
	if status == 1 {
		eng.ExtendClaimLeaseForBTProgress()
	}
	return 0
}

//export BCOWaitForEvent
func BCOWaitForEvent(engineID C.int, timeoutMs C.int) *C.char {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return nil
	}
	d := time.Duration(timeoutMs) * time.Millisecond
	if timeoutMs <= 0 {
		d = 365 * 24 * time.Hour
	}
	ev, ok := eng.PollEvent(d)
	if !ok {
		return nil
	}
	b, err := json.Marshal(ev)
	if err != nil {
		setEngineError(int(engineID), err.Error())
		return nil
	}
	return C.CString(string(b))
}

//export BCOGetPeerStates
func BCOGetPeerStates(engineID C.int) *C.char {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return nil
	}
	b, err := eng.PeerStatesJSON()
	if err != nil {
		setEngineError(int(engineID), err.Error())
		return nil
	}
	return C.CString(string(b))
}

type localStateDoc struct {
	LocalState
	ListenMultiaddrs []string `json:"listenMultiaddrs,omitempty"`
}

//export BCOGetLocalState
func BCOGetLocalState(engineID C.int) *C.char {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	bind, ok := globalHandles.GetBinding(int(engineID))
	if !ok {
		return nil
	}
	ls, err := bind.Engine.LocalStateJSON()
	if err != nil {
		setEngineError(int(engineID), err.Error())
		return nil
	}
	var st LocalState
	if err := json.Unmarshal(ls, &st); err != nil {
		setEngineError(int(engineID), err.Error())
		return nil
	}
	doc := localStateDoc{LocalState: st}
	if bind.Network != nil {
		doc.ListenMultiaddrs = bind.Network.ListenMultiaddrs()
	}
	b, err := json.Marshal(doc)
	if err != nil {
		setEngineError(int(engineID), err.Error())
		return nil
	}
	return C.CString(string(b))
}

//export BCOSetLogLevel
func BCOSetLogLevel(engineID C.int, level C.int) {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	_ = engineID
	SetGlobalMinLogLevel(int(level))
}

//export BCOGetLastError
func BCOGetLastError(engineID C.int) *C.char {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	msg := TakeEngineError(int(engineID))
	if msg == "" {
		return nil
	}
	return C.CString(msg)
}

//export BCOFreeString
func BCOFreeString(s *C.char) {
	if s == nil {
		return
	}
	C.free(unsafe.Pointer(s))
}

//export BCOGetCoreVersion
func BCOGetCoreVersion() *C.char {
	return C.CString(CoreVersion)
}

//export BCOApprovePeer
func BCOApprovePeer(engineID C.int, peerID *C.char) {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	bind, ok := globalHandles.GetBinding(int(engineID))
	if !ok {
		return
	}
	ps := goString(peerID)
	id, err := peer.Decode(ps)
	if err != nil {
		setEngineError(int(engineID), err.Error())
		return
	}
	name := ps
	if bind.Network == nil {
		return
	}
	if pi, ok := bind.Network.pending.Get(id); ok && pi.PeerName != "" {
		name = pi.PeerName
	}
	if err := bind.Network.ApprovePeer(id, name); err != nil {
		setEngineError(int(engineID), err.Error())
		return
	}
	// Broadcast CRDT allowlist after approval so peers learn about the new member.
	bind.Engine.BroadcastAllowlistSync()
}

//export BCODenyPeer
func BCODenyPeer(engineID C.int, peerID *C.char) {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	bind, ok := globalHandles.GetBinding(int(engineID))
	if !ok || bind.Network == nil {
		return
	}
	id, err := peer.Decode(goString(peerID))
	if err != nil {
		setEngineError(int(engineID), err.Error())
		return
	}
	bind.Network.DenyPeer(id)
}

//export BCORemovePeer
func BCORemovePeer(engineID C.int, peerID *C.char) C.int {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	bind, ok := globalHandles.GetBinding(int(engineID))
	if !ok || bind.Engine == nil {
		return -1
	}
	ps := goString(peerID)
	target, err := peer.Decode(ps)
	if err != nil {
		setEngineError(int(engineID), err.Error())
		return -1
	}
	eng := bind.Engine
	msg := &BCOMessage{
		Type:       MsgPeerRemove,
		SenderID:   eng.LocalState().DeviceID,
		InstanceID: eng.InstanceID(),
		Seq:        eng.AllocateOutboundSeq(),
	}
	var sendErr error
	if bind.Network != nil {
		sendErr = bind.Network.Send(ps, msg)
		bind.Network.ClosePeer(target)
	}
	if err := eng.RemoveAllowlistedPeer(ps); err != nil {
		setEngineError(int(engineID), err.Error())
		return -1
	}
	// Broadcast CRDT allowlist after removal so peers converge.
	eng.BroadcastAllowlistSync()
	if sendErr != nil {
		setEngineError(int(engineID), sendErr.Error())
		return -1
	}
	return 0
}

//export BCOPauseDevice
func BCOPauseDevice(engineID C.int, deviceID *C.char) C.int {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return -1
	}
	if goString(deviceID) != eng.LocalState().DeviceID {
		setEngineError(int(engineID), "only local device pause is supported")
		return -1
	}
	eng.SetPausedSelf(true)
	return 0
}

//export BCOResumeDevice
func BCOResumeDevice(engineID C.int, deviceID *C.char) C.int {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return -1
	}
	if goString(deviceID) != eng.LocalState().DeviceID {
		setEngineError(int(engineID), "only local device resume is supported")
		return -1
	}
	eng.SetPausedSelf(false)
	return 0
}

//export BCOGetSwitchHistory
func BCOGetSwitchHistory(engineID C.int) *C.char {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return nil
	}
	entries := eng.GetSwitchHistory()
	if entries == nil {
		entries = []SwitchEvent{}
	}
	b, err := json.Marshal(entries)
	if err != nil {
		setEngineError(int(engineID), err.Error())
		return nil
	}
	return C.CString(string(b))
}

//export BCORecordActivity
func BCORecordActivity(engineID C.int, eventType *C.char, message *C.char, peerName *C.char) {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return
	}
	eng.RecordActivity(ActivityEventType(goString(eventType)), goString(message), goString(peerName))
}

//export BCOGetActivityFeed
func BCOGetActivityFeed(engineID C.int, maxEvents C.int) *C.char {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return nil
	}
	entries := eng.GetActivityFeed(int(maxEvents))
	if entries == nil {
		entries = []ActivityFeedEntry{}
	}
	b, err := json.Marshal(entries)
	if err != nil {
		setEngineError(int(engineID), err.Error())
		return nil
	}
	return C.CString(string(b))
}

//export BCOForceConnect
func BCOForceConnect(engineID C.int) C.int {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		setEngineError(int(engineID), "invalid engine ID")
		return -1
	}
	if eng.ForceConnect() {
		return 0
	}
	return -1
}

//export BCOTriggerNetworkRefresh
func BCOTriggerNetworkRefresh(engineID C.int) {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	bind, ok := globalHandles.GetBinding(int(engineID))
	if !ok || bind.Network == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	bind.Network.TriggerNetworkRefresh(ctx)
}

//export BCOGetLocalMultiaddr
func BCOGetLocalMultiaddr(engineID C.int) *C.char {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	bind, ok := globalHandles.GetBinding(int(engineID))
	if !ok || bind.Network == nil {
		setEngineError(int(engineID), "invalid engine handle")
		return nil
	}
	s := bind.Network.PreferredDialMultiaddr()
	if s == "" {
		setEngineError(int(engineID), "no listen addresses available")
		return nil
	}
	return C.CString(s)
}

//export BCOConnectPeer
func BCOConnectPeer(engineID C.int, multiaddr *C.char) C.int {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	addr := goString(multiaddr)
	if addr == "" {
		setEngineError(int(engineID), "multiaddr is required")
		return -1
	}
	bind, ok := globalHandles.GetBinding(int(engineID))
	if !ok || bind.Network == nil {
		setEngineError(int(engineID), "invalid engine handle")
		return -1
	}
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	if err := bind.Network.ConnectPeer(ctx, addr); err != nil {
		msg := err.Error()
		setEngineError(int(engineID), msg)
		if bind.Engine != nil {
			bind.Engine.TryEmitEvent(EngineEvent{Type: "ERROR", Reason: &msg})
		}
		return -1
	}
	return 0
}

//export BCOSetBaseBias
func BCOSetBaseBias(engineID C.int, bias C.int) {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return
	}
	eng.SetBaseBias(int(bias))
}

//export BCOGetBaseBias
func BCOGetBaseBias(engineID C.int) C.int {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return 0
	}
	return C.int(eng.LocalState().BaseBias)
}

//export BCOSetManualConnectOverride
func BCOSetManualConnectOverride(engineID C.int, override C.int) {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return
	}
	eng.SetManualConnectOverride(override != 0)
}

//export BCOUpdateNetworkSetting
func BCOUpdateNetworkSetting(engineID C.int, key *C.char, value C.int) C.int {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return -1
	}
	k := goString(key)
	if err := eng.UpdateNetworkSetting(k, int(value), time.Now()); err != nil {
		setEngineError(int(engineID), err.Error())
		return -1
	}
	return 0
}

//export BCOUpdateNetworkSettingString
func BCOUpdateNetworkSettingString(engineID C.int, key *C.char, value *C.char) C.int {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return -1
	}
	k := goString(key)
	v := goString(value)
	if err := eng.UpdateNetworkSettingString(k, v, time.Now()); err != nil {
		setEngineError(int(engineID), err.Error())
		return -1
	}
	return 0
}

//export BCOSetTargetHeadset
func BCOSetTargetHeadset(engineID C.int, addr *C.char, name *C.char, selectedAtMs C.longlong) {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return
	}
	eng.SetTargetHeadset(goString(addr), goString(name), int64(selectedAtMs))
}

//export BCOPushHeadsetToPeers
func BCOPushHeadsetToPeers(engineID C.int) {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return
	}
	eng.PushHeadsetToPeers()
}

//export BCOGetNetworkSettings
func BCOGetNetworkSettings(engineID C.int) *C.char {
	defer func() {
		if r := recover(); r != nil {
			setEngineError(int(engineID), fmt.Sprint(r))
		}
	}()
	eng, ok := globalHandles.GetEngine(int(engineID))
	if !ok {
		return nil
	}
	ns := eng.NetworkSettingsSnapshot()
	b, err := json.Marshal(ns)
	if err != nil {
		setEngineError(int(engineID), err.Error())
		return nil
	}
	return C.CString(string(b))
}
