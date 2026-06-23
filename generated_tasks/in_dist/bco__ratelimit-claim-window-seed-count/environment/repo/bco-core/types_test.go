package main

import (
	"encoding/json"
	"testing"
)

func TestLocalState_JSONBackwardCompatMissingField(t *testing.T) {
	const legacy = `{"deviceId":"d","deviceName":"phone","audioPriority":0,"seq":1,"hasBluetoothConnection":false,"platform":"android","paused":false}`
	var ls LocalState
	if err := json.Unmarshal([]byte(legacy), &ls); err != nil {
		t.Fatal(err)
	}
	if ls.HeadsetDisplayName != "" {
		t.Fatalf("HeadsetDisplayName: got %q want empty", ls.HeadsetDisplayName)
	}
	if ls.DeviceID != "d" {
		t.Fatalf("DeviceID: %q", ls.DeviceID)
	}
}

func TestLocalState_JSONRoundTripHeadsetDisplayName(t *testing.T) {
	ls := LocalState{
		DeviceState: DeviceState{
			DeviceID: "d", DeviceName: "phone", AudioPriority: AudioPriorityMedia, Seq: 2,
			Platform: "android",
		},
		HeadsetDisplayName: "Buds4 Pro",
	}
	b, err := json.Marshal(ls)
	if err != nil {
		t.Fatal(err)
	}
	var back LocalState
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatal(err)
	}
	if back.HeadsetDisplayName != "Buds4 Pro" {
		t.Fatalf("got %q", back.HeadsetDisplayName)
	}
}

func TestLocalState_JSONOmitemptyEmptyHeadset(t *testing.T) {
	ls := LocalState{DeviceState: DeviceState{DeviceID: "d", DeviceName: "n"}}
	b, err := json.Marshal(ls)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	if _, ok := m["headsetDisplayName"]; ok {
		t.Fatalf("expected headsetDisplayName omitted, got %s", b)
	}
}
