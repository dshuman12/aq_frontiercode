package main

import (
	"encoding/json"
	"testing"
)

func TestBCOMessage_RoundTripStateUpdate(t *testing.T) {
	raw := []byte(`{
  "type": "STATE_UPDATE",
  "senderId": "QmPeerA",
  "instanceId": "550e8400-e29b-41d4-a716-446655440000",
  "seq": 42,
  "state": {
    "deviceId": "QmPeerA",
    "deviceName": "Harsh's MacBook Pro",
    "audioPriority": 100,
    "seq": 42,
    "hasBluetoothConnection": true,
    "platform": "macos",
    "paused": false
  }
}`)
	var msg BCOMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		t.Fatal(err)
	}
	if msg.Type != MsgStateUpdate || msg.Seq != 42 || msg.State == nil {
		t.Fatalf("unmarshal: %+v", msg)
	}
	out, err := json.Marshal(&msg)
	if err != nil {
		t.Fatal(err)
	}
	var back BCOMessage
	if err := json.Unmarshal(out, &back); err != nil {
		t.Fatal(err)
	}
	if back.Type != msg.Type || back.Seq != msg.Seq || back.State.AudioPriority != AudioPriorityMedia {
		t.Fatalf("round-trip mismatch: %+v", back)
	}
	if len(out) > 4096 {
		t.Fatalf("message exceeds 4096 bytes: %d", len(out))
	}
}

func TestBCOMessage_HelloHelloAck(t *testing.T) {
	hello := []byte(`{
  "type": "BCO_HELLO",
  "senderId": "QmPeerA",
  "instanceId": "550e8400-e29b-41d4-a716-446655440000",
  "seq": 1,
  "protocolVersion": 1,
  "minProtocolVersion": 1
}`)
	var h BCOMessage
	if err := json.Unmarshal(hello, &h); err != nil {
		t.Fatal(err)
	}
	if h.Type != MsgBCOHello || h.ProtocolVersion == nil || *h.ProtocolVersion != 1 {
		t.Fatalf("hello: %+v", h)
	}
	ack := []byte(`{
  "type": "BCO_HELLO_ACK",
  "senderId": "QmPeerB",
  "instanceId": "660e8400-e29b-41d4-a716-446655440001",
  "seq": 1,
  "protocolVersion": 1,
  "minProtocolVersion": 1,
  "agreed": true
}`)
	var a BCOMessage
	if err := json.Unmarshal(ack, &a); err != nil {
		t.Fatal(err)
	}
	if a.Type != MsgBCOHelloAck || a.Agreed == nil || !*a.Agreed {
		t.Fatalf("ack: %+v", a)
	}
	hb, _ := json.Marshal(&h)
	ab, _ := json.Marshal(&a)
	if len(hb)+len(ab) > 4096 {
		t.Fatalf("combined handshake size unexpectedly large")
	}
}

func TestVersionHandshakeAgreed_Examples(t *testing.T) {
	if !VersionHandshakeAgreed(1, 1, 1, 1) {
		t.Fatal("v1/v1 should agree")
	}
	if VersionHandshakeAgreed(2, 2, 1, 1) {
		t.Fatal("incompatible ranges should not agree")
	}
}

func TestSwitchEvent_JSONRoundTrip(t *testing.T) {
	ev := SwitchEvent{
		Timestamp:    1711900200000,
		FromPeerID:   "QmABC",
		FromPeerName: "Galaxy S24",
		ToPeerID:     "QmXYZ",
		ToPeerName:   "MacBook Pro",
		Trigger:      SwitchTriggerPriority,
	}
	b, err := json.Marshal(ev)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"timestamp", "fromPeerId", "fromPeerName", "toPeerId", "toPeerName", "trigger"} {
		if _, ok := m[key]; !ok {
			t.Fatalf("missing JSON key %q in %s", key, b)
		}
	}
	if m["trigger"] != "priority" {
		t.Fatalf("trigger: got %v want priority", m["trigger"])
	}
	var back SwitchEvent
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatal(err)
	}
	if back != ev {
		t.Fatalf("round-trip mismatch: %+v vs %+v", back, ev)
	}
}

func TestSwitchTrigger_Values(t *testing.T) {
	triggers := []SwitchTrigger{SwitchTriggerPriority, SwitchTriggerForce, SwitchTriggerDisconnect, SwitchTriggerClaimTimeout}
	want := []string{"priority", "force", "disconnect", "claim_timeout"}
	for i, tr := range triggers {
		if string(tr) != want[i] {
			t.Fatalf("trigger %d: got %q want %q", i, tr, want[i])
		}
	}
}

func TestActivityFeedEntry_JSONRoundTrip(t *testing.T) {
	entry := ActivityFeedEntry{
		ID:        "evt-001",
		Timestamp: 1711900200000,
		Type:      ActivitySwitch,
		Message:   "Headset switched to MacBook Pro",
		PeerName:  "MacBook Pro",
	}
	b, err := json.Marshal(entry)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"id", "timestamp", "type", "message", "peerName"} {
		if _, ok := m[key]; !ok {
			t.Fatalf("missing JSON key %q in %s", key, b)
		}
	}
	var back ActivityFeedEntry
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatal(err)
	}
	if back != entry {
		t.Fatalf("round-trip mismatch: %+v vs %+v", back, entry)
	}
}

func TestActivityFeedEntry_OmitsEmptyPeerName(t *testing.T) {
	entry := ActivityFeedEntry{
		ID:        "evt-002",
		Timestamp: 1711900200000,
		Type:      ActivityServiceStart,
		Message:   "Service started",
	}
	b, err := json.Marshal(entry)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	if _, ok := m["peerName"]; ok {
		t.Fatalf("peerName should be omitted when empty, got %s", b)
	}
}

func TestActivityEventType_AllValues(t *testing.T) {
	types := []ActivityEventType{
		ActivitySwitch, ActivityConnect, ActivityDisconnect,
		ActivityForceConnect, ActivityForceDisconnect,
		ActivityPeerJoined, ActivityPeerLeft, ActivityPeerPaused,
		ActivityPeerResumed, ActivityServiceStart, ActivityError,
	}
	want := []string{
		"switch", "connect", "disconnect",
		"force_connect", "force_disconnect",
		"peer_joined", "peer_left", "peer_paused",
		"peer_resumed", "service_start", "error",
	}
	for i, at := range types {
		if string(at) != want[i] {
			t.Fatalf("type %d: got %q want %q", i, at, want[i])
		}
	}
}

func TestDeviceState_JSONTags(t *testing.T) {
	st := DeviceState{
		DeviceID:               "d1",
		DeviceName:             "n",
		AudioPriority:          AudioPriorityIncomingCall,
		Seq:                    9,
		HasBluetoothConnection: false,
		Platform:               "android",
		Paused:                 true,
	}
	b, err := json.Marshal(st)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	if _, ok := m["deviceId"]; !ok {
		t.Fatalf("expected camelCase deviceId in %s", b)
	}
}

func TestNetworkSettingsWithDefaults_NormalizesInvalidForceConnectTimeouts(t *testing.T) {
	ns := DefaultNetworkSettings()
	ns.ForceConnectDisconnectTimeoutMs = SettingValue[int]{Value: 0, UpdatedAt: 123}
	ns.ForceConnectConnectTimeoutMs = SettingValue[int]{Value: -10, UpdatedAt: 124}

	got := ns.withDefaults()
	defaults := DefaultNetworkSettings()
	if got.ForceConnectDisconnectTimeoutMs.Value != defaults.ForceConnectDisconnectTimeoutMs.Value {
		t.Fatalf("disconnect timeout: got %d want %d", got.ForceConnectDisconnectTimeoutMs.Value, defaults.ForceConnectDisconnectTimeoutMs.Value)
	}
	if got.ForceConnectDisconnectTimeoutMs.UpdatedAt != 123 {
		t.Fatalf("disconnect timeout UpdatedAt should be preserved, got %d", got.ForceConnectDisconnectTimeoutMs.UpdatedAt)
	}
	if got.ForceConnectConnectTimeoutMs.Value != defaults.ForceConnectConnectTimeoutMs.Value {
		t.Fatalf("connect timeout: got %d want %d", got.ForceConnectConnectTimeoutMs.Value, defaults.ForceConnectConnectTimeoutMs.Value)
	}
	if got.ForceConnectConnectTimeoutMs.UpdatedAt != 124 {
		t.Fatalf("connect timeout UpdatedAt should be preserved, got %d", got.ForceConnectConnectTimeoutMs.UpdatedAt)
	}
}

func TestMergeNetworkSettings_NormalizesRemoteInvalidForceConnectTimeouts(t *testing.T) {
	local := DefaultNetworkSettings()
	local.ForceConnectDisconnectTimeoutMs.UpdatedAt = 1
	local.ForceConnectConnectTimeoutMs.UpdatedAt = 1
	remote := DefaultNetworkSettings()
	remote.ForceConnectDisconnectTimeoutMs = SettingValue[int]{Value: 0, UpdatedAt: 10}
	remote.ForceConnectConnectTimeoutMs = SettingValue[int]{Value: -1, UpdatedAt: 11}

	merged, changed := MergeNetworkSettings(local, remote)
	defaults := DefaultNetworkSettings()
	if !changed {
		t.Fatal("expected merge to report changed for newer remote settings")
	}
	if merged.ForceConnectDisconnectTimeoutMs.Value != defaults.ForceConnectDisconnectTimeoutMs.Value ||
		merged.ForceConnectDisconnectTimeoutMs.UpdatedAt != 10 {
		t.Fatalf("disconnect timeout merged incorrectly: %+v", merged.ForceConnectDisconnectTimeoutMs)
	}
	if merged.ForceConnectConnectTimeoutMs.Value != defaults.ForceConnectConnectTimeoutMs.Value ||
		merged.ForceConnectConnectTimeoutMs.UpdatedAt != 11 {
		t.Fatalf("connect timeout merged incorrectly: %+v", merged.ForceConnectConnectTimeoutMs)
	}
}
