package main

// AudioPriority tiers per specs/001-go-shared-core/data-model.md
type AudioPriority int

const (
	AudioPriorityIdle         AudioPriority = 0
	AudioPriorityMedia        AudioPriority = 100
	AudioPriorityIncomingCall AudioPriority = 200
	AudioPriorityActiveCall   AudioPriority = 300
)

// DeviceState is exchanged in STATE_UPDATE and used by the priority resolver.
type DeviceState struct {
	DeviceID               string        `json:"deviceId"`
	DeviceName             string        `json:"deviceName"`
	AudioPriority          AudioPriority `json:"audioPriority"`
	Seq                    uint64        `json:"seq"`
	HasBluetoothConnection bool          `json:"hasBluetoothConnection"`
	Platform               string        `json:"platform"`
	Paused                 bool          `json:"paused"`
	CoreVersion            string        `json:"coreVersion,omitempty"`
	BaseBias               int           `json:"baseBias,omitempty"`
	ManualConnectOverride  bool          `json:"manualConnectOverride,omitempty"`
	// Connected is omitted on wire STATE_UPDATE; PeerStatesJSON sets it from transport + registry.
	Connected bool `json:"connected,omitempty"`
	// Per-device headset target (v4+). Peers with the same TargetHeadsetAddr form a
	// negotiation group; priority resolution runs independently per group.
	TargetHeadsetAddr string `json:"targetHeadsetAddr,omitempty"`
	TargetHeadsetName string `json:"targetHeadsetName,omitempty"`
	HeadsetSelectedAt int64  `json:"headsetSelectedAt,omitempty"`
	// AudioPriorityHeldUntilMs is the unix-ms deadline until which AudioPriority in this
	// payload represents a grace-held value (the sender's real audio dropped below Media
	// but is being held at the pre-drop tier for MediaPauseGraceMs to avoid handover churn).
	// Omitted / zero means AudioPriority is the true current priority. Peers MAY surface
	// this in logs/UI but MUST honor AudioPriority for resolution — it is already
	// grace-adjusted by the sender so all peers agree on the effective tier.
	AudioPriorityHeldUntilMs int64 `json:"audioPriorityHeldUntilMs,omitempty"`
	// AudioPriorityRaw is the sender's true current priority when AudioPriorityHeldUntilMs
	// is non-zero. Informational only (for UI/telemetry that wants to show the real state
	// underneath the grace hold). Omitted when no grace is active.
	AudioPriorityRaw AudioPriority `json:"audioPriorityRaw,omitempty"`
}

// HeadsetConfig is the on-wire payload for HEADSET_UPDATE messages.
type HeadsetConfig struct {
	Addr       string `json:"addr"`
	Name       string `json:"name"`
	SelectedAt int64  `json:"selectedAt"`
}

// BCOMessageType string values match contracts/protocol.md
type BCOMessageType string

const (
	MsgBCOHello      BCOMessageType = "BCO_HELLO"
	MsgBCOHelloAck   BCOMessageType = "BCO_HELLO_ACK"
	MsgStateUpdate   BCOMessageType = "STATE_UPDATE"
	MsgClaimRequest  BCOMessageType = "CLAIM_REQUEST"
	MsgClaimAck      BCOMessageType = "CLAIM_ACK"
	MsgClaimRelease  BCOMessageType = "CLAIM_RELEASE"
	MsgDeviceJoin    BCOMessageType = "DEVICE_JOIN"
	MsgDeviceLeave   BCOMessageType = "DEVICE_LEAVE"
	MsgPeerRemove    BCOMessageType = "PEER_REMOVE"
	MsgPeerPause     BCOMessageType = "PEER_PAUSE"
	MsgPeerResume    BCOMessageType = "PEER_RESUME"
	MsgSettingsSync  BCOMessageType = "SETTINGS_SYNC"
	MsgAllowlistSync BCOMessageType = "ALLOWLIST_SYNC"
	MsgHeadsetUpdate BCOMessageType = "HEADSET_UPDATE"
)

// BCOMessage is the on-wire JSON unit (go-msgio framed).
type BCOMessage struct {
	Type               BCOMessageType      `json:"type"`
	SenderID           string              `json:"senderId"`
	InstanceID         string              `json:"instanceId"`
	Seq                uint64              `json:"seq"`
	State              *DeviceState        `json:"state,omitempty"`
	Approved           *bool               `json:"approved,omitempty"`
	ProtocolVersion    *uint32             `json:"protocolVersion,omitempty"`
	MinProtocolVersion *uint32             `json:"minProtocolVersion,omitempty"`
	Agreed             *bool               `json:"agreed,omitempty"`
	Settings           *NetworkSettings    `json:"settings,omitempty"`
	Allowlist          *CRDTAllowlistState `json:"allowlist,omitempty"`
	Headset            *HeadsetConfig      `json:"headset,omitempty"`
	// Populated in BCO_HELLO / BCO_HELLO_ACK so the peer can be identified before allowlisting.
	DeviceName     *string `json:"deviceName,omitempty"`
	Platform       *string `json:"platform,omitempty"`
	TargetBTDevice *string `json:"targetBtDevice,omitempty"`
}

// SwitchTrigger describes what caused a headset ownership change.
type SwitchTrigger string

const (
	SwitchTriggerPriority     SwitchTrigger = "priority"
	SwitchTriggerForce        SwitchTrigger = "force"
	SwitchTriggerDisconnect   SwitchTrigger = "disconnect"
	SwitchTriggerClaimTimeout SwitchTrigger = "claim_timeout"
)

// SwitchEvent records a headset ownership change between peers.
// Stored in an in-memory ring buffer and exposed via BCOGetSwitchHistory.
type SwitchEvent struct {
	Timestamp    int64         `json:"timestamp"`
	FromPeerID   string        `json:"fromPeerId"`
	FromPeerName string        `json:"fromPeerName"`
	ToPeerID     string        `json:"toPeerId"`
	ToPeerName   string        `json:"toPeerName"`
	Trigger      SwitchTrigger `json:"trigger"`
}

// ActivityEventType categorizes activity feed entries.
type ActivityEventType string

const (
	ActivitySwitch          ActivityEventType = "switch"
	ActivityConnect         ActivityEventType = "connect"
	ActivityDisconnect      ActivityEventType = "disconnect"
	ActivityForceConnect    ActivityEventType = "force_connect"
	ActivityForceDisconnect ActivityEventType = "force_disconnect"
	ActivityPeerJoined      ActivityEventType = "peer_joined"
	ActivityPeerLeft        ActivityEventType = "peer_left"
	ActivityPeerPaused      ActivityEventType = "peer_paused"
	ActivityPeerResumed     ActivityEventType = "peer_resumed"
	ActivityServiceStart    ActivityEventType = "service_start"
	ActivityError           ActivityEventType = "error"
	ActivityHeadsetSync     ActivityEventType = "headset_sync"
	ActivityAutoPaired      ActivityEventType = "auto_paired"
)

// ActivityFeedEntry is a timestamped log entry for user-visible system events.
// Stored in an in-memory ring buffer and exposed via BCOGetActivityFeed.
type ActivityFeedEntry struct {
	ID        string            `json:"id"`
	Timestamp int64             `json:"timestamp"`
	Type      ActivityEventType `json:"type"`
	Message   string            `json:"message"`
	PeerName  string            `json:"peerName,omitempty"`
}

// BtSafetyPolicy controls when auto-connect is suppressed based on BT state across the network.
type BtSafetyPolicy string

const (
	BtSafetyConservative BtSafetyPolicy = "conservative"
	BtSafetySmart        BtSafetyPolicy = "smart"
	BtSafetyAggressive   BtSafetyPolicy = "aggressive"
)

// SettingValue wraps a value with a LWW (last-writer-wins) timestamp for network-wide settings sync.
type SettingValue[T any] struct {
	Value     T     `json:"value"`
	UpdatedAt int64 `json:"updatedAt"`
}

// NetworkSettings holds network-wide configuration synced between peers via SETTINGS_SYNC (LWW).
type NetworkSettings struct {
	StickinessBonus                 SettingValue[int]    `json:"stickinessBonus"`
	BtSafetyPolicy                  SettingValue[string] `json:"btSafetyPolicy"`
	SwitchCooldownMs                SettingValue[int]    `json:"switchCooldownMs"`
	MediaPauseGraceMs               SettingValue[int]    `json:"mediaPauseGraceMs"`
	ManualConnectTimeoutMs          SettingValue[int]    `json:"manualConnectTimeoutMs"`
	ForceConnectDisconnectTimeoutMs SettingValue[int]    `json:"forceConnectDisconnectTimeoutMs"`
	ForceConnectConnectTimeoutMs    SettingValue[int]    `json:"forceConnectConnectTimeoutMs"`
}

// DefaultNetworkSettings returns NetworkSettings with production defaults.
func DefaultNetworkSettings() NetworkSettings {
	return NetworkSettings{
		StickinessBonus:                 SettingValue[int]{Value: 50},
		BtSafetyPolicy:                  SettingValue[string]{Value: string(BtSafetySmart)},
		SwitchCooldownMs:                SettingValue[int]{Value: 2000},
		MediaPauseGraceMs:               SettingValue[int]{Value: 30000},
		ManualConnectTimeoutMs:          SettingValue[int]{Value: 1800000},
		ForceConnectDisconnectTimeoutMs: SettingValue[int]{Value: 5000},
		ForceConnectConnectTimeoutMs:    SettingValue[int]{Value: 5000},
	}
}

func normalizeForceConnectTimeout(value SettingValue[int], defaultValue SettingValue[int]) SettingValue[int] {
	if value.Value <= 0 {
		value.Value = defaultValue.Value
	}
	return value
}

// withDefaults fills any zero-value fields that were absent in persisted JSON from older versions.
// Explicit non-positive ForceConnect timeouts are normalized to defaults so bad synced settings
// cannot make ForceConnect perform only an immediate single check.
func (ns NetworkSettings) withDefaults() NetworkSettings {
	defaults := DefaultNetworkSettings()
	if ns.StickinessBonus.UpdatedAt == 0 && ns.StickinessBonus.Value == 0 {
		ns.StickinessBonus = defaults.StickinessBonus
	}
	if ns.BtSafetyPolicy.UpdatedAt == 0 && ns.BtSafetyPolicy.Value == "" {
		ns.BtSafetyPolicy = defaults.BtSafetyPolicy
	}
	if ns.SwitchCooldownMs.UpdatedAt == 0 && ns.SwitchCooldownMs.Value == 0 {
		ns.SwitchCooldownMs = defaults.SwitchCooldownMs
	}
	if ns.MediaPauseGraceMs.UpdatedAt == 0 && ns.MediaPauseGraceMs.Value == 0 {
		ns.MediaPauseGraceMs = defaults.MediaPauseGraceMs
	}
	if ns.ManualConnectTimeoutMs.UpdatedAt == 0 && ns.ManualConnectTimeoutMs.Value == 0 {
		ns.ManualConnectTimeoutMs = defaults.ManualConnectTimeoutMs
	}
	if ns.ForceConnectDisconnectTimeoutMs.UpdatedAt == 0 && ns.ForceConnectDisconnectTimeoutMs.Value == 0 {
		ns.ForceConnectDisconnectTimeoutMs = defaults.ForceConnectDisconnectTimeoutMs
	}
	if ns.ForceConnectConnectTimeoutMs.UpdatedAt == 0 && ns.ForceConnectConnectTimeoutMs.Value == 0 {
		ns.ForceConnectConnectTimeoutMs = defaults.ForceConnectConnectTimeoutMs
	}
	ns.ForceConnectDisconnectTimeoutMs = normalizeForceConnectTimeout(ns.ForceConnectDisconnectTimeoutMs, defaults.ForceConnectDisconnectTimeoutMs)
	ns.ForceConnectConnectTimeoutMs = normalizeForceConnectTimeout(ns.ForceConnectConnectTimeoutMs, defaults.ForceConnectConnectTimeoutMs)
	return ns
}

// MergeNetworkSettings returns the LWW merge of local and remote settings.
// For each field, the value with the later UpdatedAt wins. Returns the merged
// result and whether anything changed relative to local.
func MergeNetworkSettings(local, remote NetworkSettings) (merged NetworkSettings, changed bool) {
	originalLocal := local
	local = local.withDefaults()
	remote = remote.withDefaults()
	merged = local
	changed = merged != originalLocal
	if remote.StickinessBonus.UpdatedAt > local.StickinessBonus.UpdatedAt {
		merged.StickinessBonus = remote.StickinessBonus
		changed = true
	}
	if remote.BtSafetyPolicy.UpdatedAt > local.BtSafetyPolicy.UpdatedAt {
		merged.BtSafetyPolicy = remote.BtSafetyPolicy
		changed = true
	}
	if remote.SwitchCooldownMs.UpdatedAt > local.SwitchCooldownMs.UpdatedAt {
		merged.SwitchCooldownMs = remote.SwitchCooldownMs
		changed = true
	}
	if remote.MediaPauseGraceMs.UpdatedAt > local.MediaPauseGraceMs.UpdatedAt {
		merged.MediaPauseGraceMs = remote.MediaPauseGraceMs
		changed = true
	}
	if remote.ManualConnectTimeoutMs.UpdatedAt > local.ManualConnectTimeoutMs.UpdatedAt {
		merged.ManualConnectTimeoutMs = remote.ManualConnectTimeoutMs
		changed = true
	}
	if remote.ForceConnectDisconnectTimeoutMs.UpdatedAt > local.ForceConnectDisconnectTimeoutMs.UpdatedAt {
		merged.ForceConnectDisconnectTimeoutMs = remote.ForceConnectDisconnectTimeoutMs
		changed = true
	}
	if remote.ForceConnectConnectTimeoutMs.UpdatedAt > local.ForceConnectConnectTimeoutMs.UpdatedAt {
		merged.ForceConnectConnectTimeoutMs = remote.ForceConnectConnectTimeoutMs
		changed = true
	}
	return merged, changed
}

// ProtocolWireVersion is the current /bco/1.0.0 schema version (contracts/protocol.md).
// v4 adds per-device headset fields, ALLOWLIST_SYNC (CRDT), and HEADSET_UPDATE.
const ProtocolWireVersion uint32 = 4

// MinSupportedProtocolVersion is the oldest version we can interop with.
const MinSupportedProtocolVersion uint32 = 3

// VersionHandshakeAgreed returns true when max(minA,minB) <= min(verA,verB) per protocol contract.
func VersionHandshakeAgreed(verA, minA, verB, minB uint32) bool {
	minVer := verA
	if verB < minVer {
		minVer = verB
	}
	maxMin := minA
	if minB > maxMin {
		maxMin = minB
	}
	return maxMin <= minVer
}
