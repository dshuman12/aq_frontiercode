package main

/*
#include <stdlib.h>
*/
import "C"

import "unsafe"

// Go forbids import "C" in *_test.go; these hooks let capi_test.go exercise the C API.

func goTestNewEngine(deviceName, storagePath string) int {
	dn := C.CString(deviceName)
	defer C.free(unsafe.Pointer(dn))
	sp := C.CString(storagePath)
	defer C.free(unsafe.Pointer(sp))
	return int(BCONewEngine(dn, sp))
}

func goTestStop(engineID int) {
	BCOStop(C.int(engineID))
}

// goTestCloseEngineEventsChannel calls Engine.Stop (closes events channel) without BCOStop / handle removal.
func goTestCloseEngineEventsChannel(engineID int) bool {
	eng, ok := globalHandles.GetEngine(engineID)
	if !ok {
		return false
	}
	eng.Stop()
	return true
}

func goTestSendStateUpdate(engineID int, priority int, hasBT bool) {
	bt := C.int(0)
	if hasBT {
		bt = 1
	}
	BCOSendStateUpdate(C.int(engineID), C.int(priority), bt, nil)
}

func goTestGetLastErrorString(engineID int) string {
	p := BCOGetLastError(C.int(engineID))
	if p == nil {
		return ""
	}
	defer BCOFreeString(p)
	return C.GoString(p)
}

func goTestBCOFreeStringNil() {
	BCOFreeString(nil)
}

// goTestBCOFreeStringNonNil allocates a C string and frees it via the test hook wrapper
// so capi_testhooks.go:goTestBCOFreeString is exercised with a non-nil pointer.
func goTestBCOFreeStringNonNil() {
	p := C.CString("cover-free")
	goTestBCOFreeString(p)
}

// goTestGoStringNil exercises capi.go goString(nil).
func goTestGoStringNil() string {
	return goString(nil)
}

// goTestBCONewEngineNilPointers calls BCONewEngine with nil *C.char (goString → "").
func goTestBCONewEngineNilPointers() int {
	return int(BCONewEngine((*C.char)(nil), (*C.char)(nil)))
}

func goTestBCOGetLastErrorRaw(engineID int) *C.char {
	return BCOGetLastError(C.int(engineID))
}

func goTestBCOFreeString(p *C.char) {
	BCOFreeString(p)
}

func goTestReportBTProgress(engineID, status int) int {
	return int(BCOReportBTProgress(C.int(engineID), C.int(status)))
}

// goTestWaitForEvent returns JSON from BCOWaitForEvent or empty string if nil.
func goTestWaitForEvent(engineID, timeoutMs int) string {
	p := BCOWaitForEvent(C.int(engineID), C.int(timeoutMs))
	if p == nil {
		return ""
	}
	defer BCOFreeString(p)
	return C.GoString(p)
}

func goTestSetLogLevel(engineID, level int) {
	BCOSetLogLevel(C.int(engineID), C.int(level))
}

func goTestGetPeerStates(engineID int) string {
	p := BCOGetPeerStates(C.int(engineID))
	if p == nil {
		return ""
	}
	defer BCOFreeString(p)
	return C.GoString(p)
}

func goTestGetLocalState(engineID int) string {
	p := BCOGetLocalState(C.int(engineID))
	if p == nil {
		return ""
	}
	defer BCOFreeString(p)
	return C.GoString(p)
}

func goTestGetLocalMultiaddr(engineID int) string {
	p := BCOGetLocalMultiaddr(C.int(engineID))
	if p == nil {
		return ""
	}
	defer BCOFreeString(p)
	return C.GoString(p)
}

func goTestTriggerNetworkRefresh(engineID int) {
	BCOTriggerNetworkRefresh(C.int(engineID))
}

func goTestConnectPeer(engineID int, multiaddr string) int {
	cs := C.CString(multiaddr)
	defer C.free(unsafe.Pointer(cs))
	return int(BCOConnectPeer(C.int(engineID), cs))
}

func goTestApprovePeer(engineID int, peerID string) {
	ps := C.CString(peerID)
	defer C.free(unsafe.Pointer(ps))
	BCOApprovePeer(C.int(engineID), ps)
}

func goTestDenyPeer(engineID int, peerID string) {
	ps := C.CString(peerID)
	defer C.free(unsafe.Pointer(ps))
	BCODenyPeer(C.int(engineID), ps)
}

func goTestRemovePeer(engineID int, peerID string) int {
	ps := C.CString(peerID)
	defer C.free(unsafe.Pointer(ps))
	return int(BCORemovePeer(C.int(engineID), ps))
}

func goTestPauseDevice(engineID int, deviceID string) int {
	ds := C.CString(deviceID)
	defer C.free(unsafe.Pointer(ds))
	return int(BCOPauseDevice(C.int(engineID), ds))
}

func goTestPauseDeviceNilDeviceCString(engineID int) int {
	return int(BCOPauseDevice(C.int(engineID), (*C.char)(nil)))
}

func goTestResumeDeviceNilDeviceCString(engineID int) int {
	return int(BCOResumeDevice(C.int(engineID), (*C.char)(nil)))
}

func goTestApprovePeerNilPeerCString(engineID int) {
	BCOApprovePeer(C.int(engineID), (*C.char)(nil))
}

func goTestGetSwitchHistory(engineID int) string {
	p := BCOGetSwitchHistory(C.int(engineID))
	if p == nil {
		return ""
	}
	defer BCOFreeString(p)
	return C.GoString(p)
}

func goTestGetActivityFeed(engineID int, maxEvents int) string {
	p := BCOGetActivityFeed(C.int(engineID), C.int(maxEvents))
	if p == nil {
		return ""
	}
	defer BCOFreeString(p)
	return C.GoString(p)
}

func goTestForceConnect(engineID int) int {
	return int(BCOForceConnect(C.int(engineID)))
}

func goTestResumeDevice(engineID int, deviceID string) int {
	ds := C.CString(deviceID)
	defer C.free(unsafe.Pointer(ds))
	return int(BCOResumeDevice(C.int(engineID), ds))
}
