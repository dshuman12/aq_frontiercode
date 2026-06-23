package main

// LocalState is the JSON shape for the local device from shells and BCOGetLocalState.
// DeviceState fields are shared with STATE_UPDATE; HeadsetDisplayName is shell metadata only
// (specs/008-android-ui-quality-bugs/contracts/local-state-headset-label.md).
type LocalState struct {
	DeviceState
	HeadsetDisplayName string `json:"headsetDisplayName,omitempty"`
}
