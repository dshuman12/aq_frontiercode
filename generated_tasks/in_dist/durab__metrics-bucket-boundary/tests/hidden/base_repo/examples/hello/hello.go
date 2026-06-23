//go:build tinygo

package main

import "unsafe"

//go:wasmimport durab emit_decisions
func emit_decisions(ptr uint32, length uint32) int32

//go:wasmimport durab log
func host_log(level int32, ptr uint32, length uint32)

//export _durab_tick
func tick() {
	msg := []byte("hello from wasm")
	host_log(1, ptrOf(msg), uint32(len(msg)))

	decision := []byte(`[{"kind":"complete_workflow","complete_workflow":{}}]`)
	emit_decisions(ptrOf(decision), uint32(len(decision)))
}

func ptrOf(b []byte) uint32 {
	if len(b) == 0 {
		return 0
	}
	return uint32(uintptr(unsafe.Pointer(&b[0])))
}

func main() {}
