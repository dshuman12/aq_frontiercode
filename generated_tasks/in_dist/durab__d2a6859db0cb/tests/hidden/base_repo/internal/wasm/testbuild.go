package wasm

import (
	"bytes"
	"encoding/binary"
)

// NewTestModule returns a hand-built WASM module whose
// _durab_tick export writes payload into memory at offset 0 and calls
// durab.emit_decisions(0, len(payload)). It is exposed for cross-package
// tests that need to drive the engine end-to-end without TinyGo.
//
// Production code MUST NOT depend on this function; the produced module is
// deliberately minimal (no input handling, no host-call diversity).
func NewTestModule(payload []byte) []byte { return buildEmitDecisionsModule(payload) }

func buildEmitDecisionsModule(payload []byte) []byte {
	var out bytes.Buffer
	// magic + version
	out.Write([]byte{0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00})

	// type section: () -> () (type 0), (i32,i32) -> i32 (type 1)
	typeBody := []byte{0x02, 0x60, 0x00, 0x00, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f}
	writeSection(&out, 0x01, typeBody)

	// import section: durab.emit_decisions (type 1)
	imp := &bytes.Buffer{}
	imp.WriteByte(0x01) // num imports
	writeName(imp, "durab")
	writeName(imp, "emit_decisions")
	imp.WriteByte(0x00) // kind: func
	writeULEB(imp, 1)   // type idx
	writeSection(&out, 0x02, imp.Bytes())

	// function section: func 0 has type 0
	writeSection(&out, 0x03, []byte{0x01, 0x00})

	// memory section: 1 min page, no max
	writeSection(&out, 0x05, []byte{0x01, 0x00, 0x01})

	// export section: memory(0), _durab_tick(func 1 because import is func 0)
	exp := &bytes.Buffer{}
	exp.WriteByte(0x02)
	writeName(exp, "memory")
	exp.WriteByte(0x02) // kind: memory
	writeULEB(exp, 0)
	writeName(exp, WorkflowEntry)
	exp.WriteByte(0x00) // kind: func
	writeULEB(exp, 1)
	writeSection(&out, 0x07, exp.Bytes())

	// code section: i32.const 0; i32.const len; call 0; drop; end
	code := &bytes.Buffer{}
	code.WriteByte(0x00) // 0 locals
	code.WriteByte(0x41)
	writeSLEB(code, 0)
	code.WriteByte(0x41)
	writeSLEB(code, int64(len(payload)))
	code.WriteByte(0x10)
	writeULEB(code, 0) // call func 0 (the import)
	code.WriteByte(0x1a)
	code.WriteByte(0x0b)

	codeSec := &bytes.Buffer{}
	codeSec.WriteByte(0x01) // num funcs
	writeULEB(codeSec, uint64(code.Len()))
	codeSec.Write(code.Bytes())
	writeSection(&out, 0x0a, codeSec.Bytes())

	// data section: one active segment at offset 0 with payload
	data := &bytes.Buffer{}
	data.WriteByte(0x01) // num segments
	data.WriteByte(0x00) // segment flags: active, mem 0
	data.WriteByte(0x41) // i32.const offset
	writeSLEB(data, 0)
	data.WriteByte(0x0b) // end of offset expr
	writeULEB(data, uint64(len(payload)))
	data.Write(payload)
	writeSection(&out, 0x0b, data.Bytes())

	return out.Bytes()
}

func writeSection(out *bytes.Buffer, id byte, body []byte) {
	out.WriteByte(id)
	writeULEB(out, uint64(len(body)))
	out.Write(body)
}

func writeName(out *bytes.Buffer, s string) {
	writeULEB(out, uint64(len(s)))
	out.WriteString(s)
}

func writeULEB(out *bytes.Buffer, v uint64) {
	for {
		b := byte(v & 0x7f)
		v >>= 7
		if v != 0 {
			b |= 0x80
		}
		out.WriteByte(b)
		if v == 0 {
			return
		}
	}
}

func writeSLEB(out *bytes.Buffer, v int64) {
	more := true
	for more {
		b := byte(v & 0x7f)
		v >>= 7
		sign := b & 0x40
		if (v == 0 && sign == 0) || (v == -1 && sign != 0) {
			more = false
		} else {
			b |= 0x80
		}
		out.WriteByte(b)
	}
}

// _ silences unused-import lint in case the file is later trimmed.
var _ = binary.LittleEndian
