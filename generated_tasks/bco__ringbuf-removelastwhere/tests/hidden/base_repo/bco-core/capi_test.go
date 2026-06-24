package main

// C API coverage lives here; CGO helpers are in capi_testhooks.go because the Go toolchain
// rejects import "C" inside *_test.go files.

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	libp2pcrypto "github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/peer"
)

func TestCAPI_handleOnlyBinding_noNetworkFacets(t *testing.T) {
	eng := NewBCOEngine(DeviceState{DeviceID: "QmHandleOnly", DeviceName: "h"}, "inst", newRecordingNetwork(), nil, "", DefaultNetworkSettings())
	id := globalHandles.Add(eng)
	t.Cleanup(func() { goTestStop(id) })

	goTestTriggerNetworkRefresh(id)

	if m := goTestGetLocalMultiaddr(id); m != "" {
		t.Fatalf("expected empty multiaddr without network binding, got %q", m)
	}
	if msg := goTestGetLastErrorString(id); msg == "" || !strings.Contains(msg, "invalid") {
		t.Fatalf("GetLocalMultiaddr error: %q", msg)
	}

	pid := mustPeerIDString(t)
	if rc := goTestConnectPeer(id, fmt.Sprintf("/ip4/127.0.0.1/tcp/9/p2p/%s", pid)); rc != -1 {
		t.Fatalf("ConnectPeer without network: got %d", rc)
	}
	if msg := goTestGetLastErrorString(id); msg == "" || !strings.Contains(msg, "invalid") {
		t.Fatalf("ConnectPeer error: %q", msg)
	}
}

func TestBCONewEngine_EmptyStoragePath(t *testing.T) {
	rc := goTestNewEngine("dev", "")
	if rc != -1 {
		t.Fatalf("expected -1, got %d", rc)
	}
	msg := goTestGetLastErrorString(-1)
	if msg == "" {
		t.Fatal("expected last error")
	}
	if !strings.Contains(msg, "storagePath") {
		t.Fatalf("unexpected error: %q", msg)
	}
}

func TestBCONewEngine_StoragePathNotDirectory(t *testing.T) {
	f := filepath.Join(t.TempDir(), "not-a-dir")
	if err := os.WriteFile(f, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	rc := goTestNewEngine("dev", f)
	if rc != -1 {
		t.Fatalf("expected -1, got %d", rc)
	}
	msg := goTestGetLastErrorString(-1)
	if msg == "" {
		t.Fatal("expected last error")
	}
}

func TestBCONewEngine_SuccessAndBCOStop(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-test", dir)
	if id <= 0 {
		t.Fatalf("expected positive engine id, got %d lastErr=%q", id, PeekEngineError(-1))
	}
	goTestStop(id)
	goTestStop(id)
}

func TestBCOGetLastError_BCOFreeString_NilWhenEmpty(t *testing.T) {
	p := goTestBCOGetLastErrorRaw(42)
	if p != nil {
		goTestBCOFreeString(p)
		t.Fatal("expected nil from BCOGetLastError when no error")
	}
	goTestBCOFreeStringNil()
}

func TestGoStringNilHook(t *testing.T) {
	if goTestGoStringNil() != "" {
		t.Fatalf("goString(nil) should be empty, got %q", goTestGoStringNil())
	}
}

func TestBCOFreeString_nonNilCStringViaHook(t *testing.T) {
	goTestBCOFreeStringNonNil()
}

func TestBCONewEngine_nilCStringPointers(t *testing.T) {
	rc := goTestBCONewEngineNilPointers()
	if rc != -1 {
		t.Fatalf("expected -1 for nil C strings, got %d", rc)
	}
	msg := goTestGetLastErrorString(-1)
	if msg == "" || !strings.Contains(msg, "storagePath") {
		t.Fatalf("unexpected error: %q", msg)
	}
}

func TestBCONewEngine_corruptAllowlistJSON(t *testing.T) {
	dir := t.TempDir()
	if err := EnsureStorageDir(dir); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "allowlist.json"), []byte(`{`), 0o600); err != nil {
		t.Fatal(err)
	}
	rc := goTestNewEngine("bad-allowlist", dir)
	if rc != -1 {
		t.Fatalf("expected -1, got %d", rc)
	}
	msg := goTestGetLastErrorString(-1)
	if msg == "" {
		t.Fatal("expected last error after allowlist load failure")
	}
}

func TestBCOSendStateUpdate_audioPriorityEnumCases(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-prio-enum", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })
	for _, p := range []int{0, 100, 200, 300} {
		goTestSendStateUpdate(id, p, false)
		raw := goTestGetLocalState(id)
		var doc struct {
			AudioPriority AudioPriority `json:"audioPriority"`
		}
		if err := json.Unmarshal([]byte(raw), &doc); err != nil {
			t.Fatalf("priority %d json: %v", p, err)
		}
		if int(doc.AudioPriority) != p {
			t.Fatalf("priority %d: got %d in JSON", p, doc.AudioPriority)
		}
	}
}

func TestBCOGetLastError_InvalidEngineHandle(t *testing.T) {
	goTestSendStateUpdate(999_999, 0, false)
	msg := goTestGetLastErrorString(999_999)
	if msg == "" || !strings.Contains(msg, "invalid") {
		t.Fatalf("unexpected message: %q", msg)
	}
	if goTestBCOGetLastErrorRaw(999_999) != nil {
		t.Fatal("error should be consumed")
	}
}

func TestBCOSendStateUpdate_CustomAudioPriorityPassesThrough(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-prio-custom", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })
	goTestSendStateUpdate(id, 42, false)
	raw := goTestGetLocalState(id)
	var doc struct {
		AudioPriority AudioPriority `json:"audioPriority"`
	}
	if err := json.Unmarshal([]byte(raw), &doc); err != nil {
		t.Fatalf("json: %v", err)
	}
	if doc.AudioPriority != AudioPriority(42) {
		t.Fatalf("audioPriority: got %d want 42 (audioPriorityFromInt default branch)", doc.AudioPriority)
	}
}

func TestBCOSendStateUpdate_ValidEngine_BCOWaitForEvent(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-ev", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	goTestSendStateUpdate(id, 100, true)
	raw := goTestWaitForEvent(id, 5000)
	if raw == "" {
		t.Fatal("expected event JSON after state update")
	}
	var ev struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal([]byte(raw), &ev); err != nil {
		t.Fatalf("json: %v raw=%q", err, raw)
	}
	if ev.Type != "STATE_CHANGED" {
		t.Fatalf("got type %q want STATE_CHANGED", ev.Type)
	}
}

func TestBCOWaitForEvent_closedEventsChannelReturnsEmpty(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-wait-chclose", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })
	if !goTestCloseEngineEventsChannel(id) {
		t.Fatal("expected to close engine events channel")
	}
	out := goTestWaitForEvent(id, 60_000)
	if out != "" {
		t.Fatalf("expected empty when events channel is closed, got %q", out)
	}
}

func TestBCONewEngine_instanceIDPathIsDirectory(t *testing.T) {
	dir := t.TempDir()
	if err := EnsureStorageDir(dir); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(filepath.Join(dir, fileInstance), 0o700); err != nil {
		t.Fatal(err)
	}
	rc := goTestNewEngine("inst-is-dir", dir)
	if rc != -1 {
		t.Fatalf("expected -1, got %d", rc)
	}
	if msg := goTestGetLastErrorString(-1); msg == "" {
		t.Fatal("expected error from WriteNewInstanceID")
	}
}

func TestBCOWaitForEvent_TimeoutReturnsEmptyString(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-wait-timeout", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })
	start := time.Now()
	got := goTestWaitForEvent(id, 25)
	if got != "" {
		t.Fatalf("expected empty JSON on timeout, got %q", got)
	}
	if time.Since(start) > 2*time.Second {
		t.Fatalf("expected short timeout, took %s", time.Since(start))
	}
}

func TestBCOWaitForEvent_InvalidEngineReturnsImmediately(t *testing.T) {
	start := time.Now()
	got := goTestWaitForEvent(999_998, 60_000)
	if got != "" {
		t.Fatalf("expected empty, got %q", got)
	}
	if time.Since(start) > 200*time.Millisecond {
		t.Fatalf("expected fast return for invalid engine, took %s", time.Since(start))
	}
	msg := goTestGetLastErrorString(999_998)
	if msg == "" || !strings.Contains(msg, "invalid") {
		t.Fatalf("unexpected error: %q", msg)
	}
}

func TestBCOReportBTProgress_InvalidEngine(t *testing.T) {
	if rc := goTestReportBTProgress(999_997, 1); rc != -1 {
		t.Fatalf("expected -1, got %d", rc)
	}
	msg := goTestGetLastErrorString(999_997)
	if msg == "" || !strings.Contains(msg, "invalid") {
		t.Fatalf("unexpected error: %q", msg)
	}
}

func TestBCOReportBTProgress_ValidEngine(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-bt", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })
	for _, st := range []int{0, 1, 2, 3} {
		if rc := goTestReportBTProgress(id, st); rc != 0 {
			t.Fatalf("status %d: got %d err=%q", st, rc, goTestGetLastErrorString(id))
		}
	}
}

func TestBCOSetLogLevel_Smoke(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-log", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })
	goTestSetLogLevel(id, 3)
	goTestSetLogLevel(id, 0)
	goTestSetLogLevel(0, 1)
}

func TestBCOGetPeerStates_ValidAndInvalid(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-peers", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })
	raw := goTestGetPeerStates(id)
	if raw == "" || !strings.HasPrefix(strings.TrimSpace(raw), "[") {
		t.Fatalf("expected JSON array, got %q", raw)
	}
	if goTestGetPeerStates(999_996) != "" {
		t.Fatal("expected empty for invalid engine")
	}
	msg := goTestGetLastErrorString(999_996)
	if msg == "" || !strings.Contains(msg, "invalid") {
		t.Fatalf("unexpected error: %q", msg)
	}
}

func TestBCOGetLocalState_ValidAndInvalid(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-local", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })
	raw := goTestGetLocalState(id)
	if raw == "" {
		t.Fatal("expected local state JSON")
	}
	var doc struct {
		DeviceName string   `json:"deviceName"`
		ListenMA   []string `json:"listenMultiaddrs"`
	}
	if err := json.Unmarshal([]byte(raw), &doc); err != nil {
		t.Fatalf("json: %v", err)
	}
	if doc.DeviceName != "capi-local" {
		t.Fatalf("deviceName %q", doc.DeviceName)
	}
	if len(doc.ListenMA) == 0 {
		t.Fatal("expected listenMultiaddrs in C API local state")
	}
	if goTestGetLocalState(999_995) != "" {
		t.Fatal("expected empty for invalid engine")
	}
}

func TestBCOGetLocalMultiaddr_ValidAndInvalid(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-maddr", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })
	m := goTestGetLocalMultiaddr(id)
	if m == "" {
		t.Fatal("expected non-empty multiaddr")
	}
	if !strings.Contains(m, "/tcp/") {
		t.Fatalf("unexpected multiaddr: %q", m)
	}
	if goTestGetLocalMultiaddr(999_994) != "" {
		t.Fatal("expected empty for invalid engine")
	}
	msg := goTestGetLastErrorString(999_994)
	if msg == "" {
		t.Fatal("expected error for invalid engine")
	}
}

func TestBCOTriggerNetworkRefresh_Smoke(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-refresh", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })
	goTestTriggerNetworkRefresh(id)
	goTestTriggerNetworkRefresh(999_993)
}

func TestBCOConnectPeer_ErrorsWithoutPeer(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-conn", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	if rc := goTestConnectPeer(id, ""); rc != -1 {
		t.Fatalf("empty multiaddr: got %d", rc)
	}
	if msg := goTestGetLastErrorString(id); msg == "" || !strings.Contains(msg, "multiaddr") {
		t.Fatalf("unexpected err: %q", msg)
	}

	if rc := goTestConnectPeer(id, "/ip4/127.0.0.1/tcp/12345"); rc != -1 {
		t.Fatalf("maddr without /p2p: got %d", rc)
	}
	if msg := goTestGetLastErrorString(id); msg == "" {
		t.Fatal("expected error after bad multiaddr")
	}

	pid := mustPeerIDString(t)
	if rc := goTestConnectPeer(999_992, fmt.Sprintf("/ip4/127.0.0.1/tcp/1/p2p/%s", pid)); rc != -1 {
		t.Fatalf("invalid engine: got %d", rc)
	}
	if msg := goTestGetLastErrorString(999_992); !strings.Contains(msg, "invalid") {
		t.Fatalf("unexpected err: %q", msg)
	}
}

func mustPeerIDString(t *testing.T) string {
	t.Helper()
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, -1)
	if err != nil {
		t.Fatal(err)
	}
	id, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	return id.String()
}

func localDeviceID(t *testing.T, engineID int) string {
	t.Helper()
	raw := goTestGetLocalState(engineID)
	var doc struct {
		DeviceID string `json:"deviceId"`
	}
	if err := json.Unmarshal([]byte(raw), &doc); err != nil {
		t.Fatalf("local state json: %v", err)
	}
	if doc.DeviceID == "" {
		t.Fatal("empty deviceId")
	}
	return doc.DeviceID
}

func TestBCOApprovePeer_nilCStringDecodeError(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-appr-nil", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })
	goTestApprovePeerNilPeerCString(id)
	msg := goTestGetLastErrorString(id)
	if msg == "" {
		t.Fatal("expected decode error for nil peer C string")
	}
}

func TestBCOPauseResume_nilDeviceCString(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-pause-nil", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })
	if rc := goTestPauseDeviceNilDeviceCString(id); rc != -1 {
		t.Fatalf("pause nil c string: got %d", rc)
	}
	if msg := goTestGetLastErrorString(id); msg == "" || !strings.Contains(msg, "pause") {
		t.Fatalf("pause error: %q", msg)
	}
	if rc := goTestResumeDeviceNilDeviceCString(id); rc != -1 {
		t.Fatalf("resume nil c string: got %d", rc)
	}
	if msg := goTestGetLastErrorString(id); msg == "" || !strings.Contains(msg, "resume") {
		t.Fatalf("resume error: %q", msg)
	}
}

func TestBCOApprovePeer_DecodeError(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-appr", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	goTestApprovePeer(id, "%%%not-a-peer-id%%%")
	msg := goTestGetLastErrorString(id)
	if msg == "" {
		t.Fatal("expected decode error")
	}
}

func TestBCOApprovePeer_AddsAllowlistedPeer(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-appr-ok", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	pid := mustPeerIDString(t)
	goTestApprovePeer(id, pid)
	if errMsg := goTestGetLastErrorString(id); errMsg != "" {
		t.Fatalf("unexpected error: %q", errMsg)
	}
	path := filepath.Join(dir, "allowlist.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("allowlist: %v", err)
	}
	if !strings.Contains(string(data), pid) {
		t.Fatalf("allowlist should contain peer id, got %s", data)
	}
}

func TestGoTestCloseEngineEventsChannel_invalidEngine(t *testing.T) {
	if goTestCloseEngineEventsChannel(888_777_666) {
		t.Fatal("expected false for unknown engine id")
	}
}

func TestBCOApprovePeer_invalidEngineNoop(t *testing.T) {
	goTestApprovePeer(888_666_555, mustPeerIDString(t))
}

func TestBCODenyPeer_invalidEngineNoop(t *testing.T) {
	goTestDenyPeer(888_555_444, mustPeerIDString(t))
}

func TestBCODenyPeer_DecodeError(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-deny", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	goTestDenyPeer(id, "not-valid")
	msg := goTestGetLastErrorString(id)
	if msg == "" {
		t.Fatal("expected decode error")
	}
}

func TestBCODenyPeer_ValidPeerNoPanic(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-deny-ok", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	pid := mustPeerIDString(t)
	goTestDenyPeer(id, pid)
}

func TestBCORemovePeer_Errors(t *testing.T) {
	if rc := goTestRemovePeer(999_991, mustPeerIDString(t)); rc != -1 {
		t.Fatalf("invalid engine: got %d", rc)
	}

	dir := t.TempDir()
	id := goTestNewEngine("capi-rem", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	if rc := goTestRemovePeer(id, "%%%bad%%%"); rc != -1 {
		t.Fatalf("bad peer id: got %d", rc)
	}
	if msg := goTestGetLastErrorString(id); msg == "" {
		t.Fatal("expected error")
	}

	pid := mustPeerIDString(t)
	goTestApprovePeer(id, pid)
	_ = goTestGetLastErrorString(id)

	if rc := goTestRemovePeer(id, pid); rc != -1 {
		t.Fatalf("expected -1 when remove sends to disconnected allowlisted peer, got %d err=%q", rc, goTestGetLastErrorString(id))
	}
	if msg := goTestGetLastErrorString(id); msg == "" {
		t.Fatal("expected remove/send error when peer not connected")
	}
}

func TestBCOGetSwitchHistory_EmptyAndInvalid(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-switch-hist", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	raw := goTestGetSwitchHistory(id)
	if raw != "[]" {
		t.Fatalf("expected empty JSON array, got %q", raw)
	}

	if goTestGetSwitchHistory(999_989) != "" {
		t.Fatal("expected empty for invalid engine")
	}
}

func TestBCOGetActivityFeed_EmptyAndInvalid(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-act-feed", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	raw := goTestGetActivityFeed(id, 0)
	var allEntries []ActivityFeedEntry
	if err := json.Unmarshal([]byte(raw), &allEntries); err != nil {
		t.Fatalf("unmarshal maxEvents=0: %v", err)
	}
	if len(allEntries) != 1 || allEntries[0].Type != ActivityServiceStart {
		t.Fatalf("expected single service_start for maxEvents=0, got %q", raw)
	}

	raw = goTestGetActivityFeed(id, 5)
	var entries []ActivityFeedEntry
	if err := json.Unmarshal([]byte(raw), &entries); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(entries) != 1 || entries[0].Type != ActivityServiceStart {
		t.Fatalf("expected single service_start entry, got %q", raw)
	}

	if goTestGetActivityFeed(999_988, 0) != "" {
		t.Fatal("expected empty for invalid engine")
	}
}

func TestBCOGetSwitchHistory_AfterStateChange(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-switch-data", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	goTestSendStateUpdate(id, 100, true)
	drainCAPIEvents(t, id)

	raw := goTestGetSwitchHistory(id)
	var events []SwitchEvent
	if err := json.Unmarshal([]byte(raw), &events); err != nil {
		t.Fatalf("json: %v raw=%q", err, raw)
	}
}

func TestBCOGetActivityFeed_AfterStateChange(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-act-data", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	goTestSendStateUpdate(id, 100, true)
	drainCAPIEvents(t, id)

	raw := goTestGetActivityFeed(id, 10)
	var entries []ActivityFeedEntry
	if err := json.Unmarshal([]byte(raw), &entries); err != nil {
		t.Fatalf("json: %v raw=%q", err, raw)
	}
}

func TestBCOForceConnect_InvalidEngine(t *testing.T) {
	rc := goTestForceConnect(999_987)
	if rc != -1 {
		t.Fatalf("expected -1 for invalid engine, got %d", rc)
	}
	msg := goTestGetLastErrorString(999_987)
	if msg == "" || !strings.Contains(msg, "invalid engine") {
		t.Fatalf("unexpected error: %q", msg)
	}
}

func TestBCOForceConnect_AlreadyHolding(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-force", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	goTestSendStateUpdate(id, 100, true)
	drainCAPIEvents(t, id)

	rc := goTestForceConnect(id)
	if rc != 0 {
		t.Fatalf("expected 0 when already holding headset, got %d", rc)
	}

	raw := goTestWaitForEvent(id, 1000)
	if raw == "" {
		t.Fatal("expected FORCE_CONNECT_RESULT event")
	}
	var ev struct {
		Type    string `json:"type"`
		Success *bool  `json:"success"`
	}
	if err := json.Unmarshal([]byte(raw), &ev); err != nil {
		t.Fatalf("json: %v", err)
	}
	if ev.Type != "FORCE_CONNECT_RESULT" {
		t.Fatalf("expected FORCE_CONNECT_RESULT, got %q", ev.Type)
	}
	if ev.Success == nil || !*ev.Success {
		t.Fatalf("expected success=true, got %v", ev.Success)
	}
}

func TestBCOForceConnect_SuppressesPlatformPriorityDowngradeUntilRestore(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-force-race", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	done := make(chan int, 1)
	go func() {
		done <- goTestForceConnect(id)
	}()

	deadline := time.Now().Add(250 * time.Millisecond)
	for {
		raw := goTestGetLocalState(id)
		var doc struct {
			AudioPriority AudioPriority `json:"audioPriority"`
		}
		if err := json.Unmarshal([]byte(raw), &doc); err != nil {
			t.Fatalf("json: %v raw=%q", err, raw)
		}
		if doc.AudioPriority == AudioPriorityActiveCall {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("did not observe ForceConnect boost before timeout, last priority=%d", doc.AudioPriority)
		}
		time.Sleep(5 * time.Millisecond)
	}

	goTestSendStateUpdate(id, 0, false)

	raw := goTestGetLocalState(id)
	var during struct {
		AudioPriority AudioPriority `json:"audioPriority"`
	}
	if err := json.Unmarshal([]byte(raw), &during); err != nil {
		t.Fatalf("json after platform update: %v raw=%q", err, raw)
	}
	if during.AudioPriority != AudioPriorityActiveCall {
		t.Fatalf("platform update should not clear ForceConnect boost, got %d", during.AudioPriority)
	}

	goTestSendStateUpdate(id, -1, true)

	if rc := <-done; rc != 0 {
		t.Fatalf("ForceConnect returned %d", rc)
	}

	raw = goTestGetLocalState(id)
	var restored struct {
		AudioPriority AudioPriority `json:"audioPriority"`
	}
	if err := json.Unmarshal([]byte(raw), &restored); err != nil {
		t.Fatalf("json after restore: %v raw=%q", err, raw)
	}
	if restored.AudioPriority != AudioPriorityIdle {
		t.Fatalf("priority should restore to Idle after ForceConnect, got %d", restored.AudioPriority)
	}
}

func TestBCOForceConnect_DelayedFalseThenTrueBTReportSucceeds(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-force-delayed-bt", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	done := make(chan int, 1)
	go func() {
		done <- goTestForceConnect(id)
	}()

	waitForCAPIEventType(t, id, "CONNECT_BT", time.Second)
	goTestSendStateUpdate(id, -1, false)
	goTestSendStateUpdate(id, -1, true)

	select {
	case rc := <-done:
		if rc != 0 {
			t.Fatalf("ForceConnect returned %d", rc)
		}
	case <-time.After(time.Second):
		t.Fatal("ForceConnect did not complete after delayed false/true BT reports")
	}
}

func TestBCOForceConnect_IgnoresNoisyFalseAfterBTConfirmation(t *testing.T) {
	dir := t.TempDir()
	id := goTestNewEngine("capi-force-noisy-bt", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	done := make(chan int, 1)
	go func() {
		done <- goTestForceConnect(id)
	}()

	waitForCAPIEventType(t, id, "CONNECT_BT", time.Second)
	goTestSendStateUpdate(id, -1, true)
	goTestSendStateUpdate(id, -1, false)

	select {
	case rc := <-done:
		if rc != 0 {
			t.Fatalf("ForceConnect returned %d", rc)
		}
	case <-time.After(time.Second):
		t.Fatal("ForceConnect did not complete after noisy true/false BT reports")
	}
}

func waitForCAPIEventType(t *testing.T, engineID int, eventType string, timeout time.Duration) string {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		remaining := time.Until(deadline)
		waitMs := 50
		if remaining < 50*time.Millisecond {
			waitMs = int(remaining / time.Millisecond)
			if waitMs < 1 {
				waitMs = 1
			}
		}
		raw := goTestWaitForEvent(engineID, waitMs)
		if raw == "" {
			continue
		}
		var ev struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal([]byte(raw), &ev); err != nil {
			t.Fatalf("event json: %v raw=%q", err, raw)
		}
		if ev.Type == eventType {
			return raw
		}
	}
	t.Fatalf("timed out waiting for %s", eventType)
	return ""
}

func drainCAPIEvents(t *testing.T, engineID int) {
	t.Helper()
	for {
		raw := goTestWaitForEvent(engineID, 100)
		if raw == "" {
			break
		}
	}
}

func TestBCOPauseResumeDevice(t *testing.T) {
	if rc := goTestPauseDevice(999_990, "x"); rc != -1 {
		t.Fatalf("invalid engine: %d", rc)
	}
	if msg := goTestGetLastErrorString(999_990); !strings.Contains(msg, "invalid") {
		t.Fatalf("unexpected: %q", msg)
	}

	dir := t.TempDir()
	id := goTestNewEngine("capi-pause", dir)
	if id <= 0 {
		t.Fatalf("engine: %d", id)
	}
	t.Cleanup(func() { goTestStop(id) })

	self := localDeviceID(t, id)
	if rc := goTestPauseDevice(id, "someone-else"); rc != -1 {
		t.Fatalf("wrong device: %d", rc)
	}
	if msg := goTestGetLastErrorString(id); !strings.Contains(msg, "only local device pause") {
		t.Fatalf("unexpected: %q", msg)
	}

	if rc := goTestPauseDevice(id, self); rc != 0 {
		t.Fatalf("pause self: %d err=%q", rc, goTestGetLastErrorString(id))
	}
	if rc := goTestResumeDevice(id, "someone-else"); rc != -1 {
		t.Fatalf("wrong device resume: %d", rc)
	}
	if rc := goTestResumeDevice(id, self); rc != 0 {
		t.Fatalf("resume self: %d err=%q", rc, goTestGetLastErrorString(id))
	}
}
