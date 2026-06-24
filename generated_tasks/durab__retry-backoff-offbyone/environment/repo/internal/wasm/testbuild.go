package wasm

import "bytes"

func NewTestModule(payload []byte) []byte {
	return buildCallHostModule(HostEmitDecisions, WorkflowEntry, payload)
}

func NewTestActivityModule(result []byte) []byte {
	return buildCallHostModule(HostWriteResult, ActivityEntry, result)
}

func NewMultiCallWorkflowModule() []byte {
	var out bytes.Buffer
	out.Write([]byte{0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00})

	typeBody := &bytes.Buffer{}
	typeBody.WriteByte(0x04)
	typeBody.Write([]byte{0x60, 0x00, 0x00})
	typeBody.Write([]byte{0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f})
	typeBody.Write([]byte{0x60, 0x03, 0x7f, 0x7f, 0x7f, 0x00})
	typeBody.Write([]byte{0x60, 0x00, 0x01, 0x7e})
	writeSection(&out, 0x01, typeBody.Bytes())

	imp := &bytes.Buffer{}
	imp.WriteByte(0x04)
	writeImport(imp, "durab", HostLog, 2)
	writeImport(imp, "durab", HostNow, 3)
	writeImport(imp, "durab", HostRandom, 3)
	writeImport(imp, "durab", HostEmitDecisions, 1)
	writeSection(&out, 0x02, imp.Bytes())

	writeSection(&out, 0x03, []byte{0x01, 0x00})
	writeSection(&out, 0x05, []byte{0x01, 0x00, 0x01})

	exp := &bytes.Buffer{}
	exp.WriteByte(0x02)
	writeName(exp, "memory")
	exp.WriteByte(0x02)
	writeULEB(exp, 0)
	writeName(exp, WorkflowEntry)
	exp.WriteByte(0x00)
	writeULEB(exp, 4)
	writeSection(&out, 0x07, exp.Bytes())

	code := &bytes.Buffer{}
	code.WriteByte(0x00)
	code.WriteByte(0x41)
	writeSLEB(code, int64(LogInfo))
	code.WriteByte(0x41)
	writeSLEB(code, 0)
	code.WriteByte(0x41)
	writeSLEB(code, 2)
	code.WriteByte(0x10)
	writeULEB(code, 0)
	code.WriteByte(0x10)
	writeULEB(code, 1)
	code.WriteByte(0x1a)
	code.WriteByte(0x10)
	writeULEB(code, 2)
	code.WriteByte(0x1a)
	code.WriteByte(0x41)
	writeSLEB(code, 16)
	code.WriteByte(0x41)
	writeSLEB(code, 2)
	code.WriteByte(0x10)
	writeULEB(code, 3)
	code.WriteByte(0x1a)
	code.WriteByte(0x0b)

	codeSec := &bytes.Buffer{}
	codeSec.WriteByte(0x01)
	writeULEB(codeSec, uint64(code.Len()))
	codeSec.Write(code.Bytes())
	writeSection(&out, 0x0a, codeSec.Bytes())

	data := &bytes.Buffer{}
	data.WriteByte(0x02)
	data.WriteByte(0x00)
	data.WriteByte(0x41)
	writeSLEB(data, 0)
	data.WriteByte(0x0b)
	writeULEB(data, 2)
	data.WriteString("hi")
	data.WriteByte(0x00)
	data.WriteByte(0x41)
	writeSLEB(data, 16)
	data.WriteByte(0x0b)
	writeULEB(data, 2)
	data.WriteString("[]")
	writeSection(&out, 0x0b, data.Bytes())

	return out.Bytes()
}

func writeImport(out *bytes.Buffer, module, field string, typeIdx uint64) {
	writeName(out, module)
	writeName(out, field)
	out.WriteByte(0x00)
	writeULEB(out, typeIdx)
}

func buildCallHostModule(importName, exportName string, payload []byte) []byte {
	var out bytes.Buffer

	out.Write([]byte{0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00})

	typeBody := []byte{0x02, 0x60, 0x00, 0x00, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f}
	writeSection(&out, 0x01, typeBody)

	imp := &bytes.Buffer{}
	imp.WriteByte(0x01)
	writeName(imp, "durab")
	writeName(imp, importName)
	imp.WriteByte(0x00)
	writeULEB(imp, 1)
	writeSection(&out, 0x02, imp.Bytes())

	writeSection(&out, 0x03, []byte{0x01, 0x00})

	writeSection(&out, 0x05, []byte{0x01, 0x00, 0x01})

	exp := &bytes.Buffer{}
	exp.WriteByte(0x02)
	writeName(exp, "memory")
	exp.WriteByte(0x02)
	writeULEB(exp, 0)
	writeName(exp, exportName)
	exp.WriteByte(0x00)
	writeULEB(exp, 1)
	writeSection(&out, 0x07, exp.Bytes())

	code := &bytes.Buffer{}
	code.WriteByte(0x00)
	code.WriteByte(0x41)
	writeSLEB(code, 0)
	code.WriteByte(0x41)
	writeSLEB(code, int64(len(payload)))
	code.WriteByte(0x10)
	writeULEB(code, 0)
	code.WriteByte(0x1a)
	code.WriteByte(0x0b)

	codeSec := &bytes.Buffer{}
	codeSec.WriteByte(0x01)
	writeULEB(codeSec, uint64(code.Len()))
	codeSec.Write(code.Bytes())
	writeSection(&out, 0x0a, codeSec.Bytes())

	data := &bytes.Buffer{}
	data.WriteByte(0x01)
	data.WriteByte(0x00)
	data.WriteByte(0x41)
	writeSLEB(data, 0)
	data.WriteByte(0x0b)
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


func NewReadingWorkflowModule() []byte {
	var out bytes.Buffer
	out.Write([]byte{0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00})

	typeBody := &bytes.Buffer{}
	typeBody.WriteByte(0x04)
	typeBody.Write([]byte{0x60, 0x00, 0x00})
	typeBody.Write([]byte{0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f})
	typeBody.Write([]byte{0x60, 0x01, 0x7f, 0x01, 0x7f})
	typeBody.Write([]byte{0x60, 0x00, 0x01, 0x7f})
	writeSection(&out, 0x01, typeBody.Bytes())

	imp := &bytes.Buffer{}
	imp.WriteByte(0x05)
	writeImport(imp, "durab", HostReadHistory, 1)
	writeImport(imp, "durab", HostGetInput, 1)
	writeImport(imp, "durab", HostGetInfo, 1)
	writeImport(imp, "durab", HostNewUUID, 2)
	writeImport(imp, "durab", HostReadHistory+"_size", 3)
	writeSection(&out, 0x02, imp.Bytes())

	writeSection(&out, 0x03, []byte{0x01, 0x00})
	writeSection(&out, 0x05, []byte{0x01, 0x00, 0x01})

	exp := &bytes.Buffer{}
	exp.WriteByte(0x02)
	writeName(exp, "memory")
	exp.WriteByte(0x02)
	writeULEB(exp, 0)
	writeName(exp, WorkflowEntry)
	exp.WriteByte(0x00)
	writeULEB(exp, 5)
	writeSection(&out, 0x07, exp.Bytes())

	code := &bytes.Buffer{}
	code.WriteByte(0x00)

	code.WriteByte(0x10)
	writeULEB(code, 4)
	code.WriteByte(0x1a)

	for i := uint64(0); i < 3; i++ {
		code.WriteByte(0x41)
		writeSLEB(code, int64(64*(i+1)))
		code.WriteByte(0x41)
		writeSLEB(code, 2048)
		code.WriteByte(0x10)
		writeULEB(code, i)
		code.WriteByte(0x1a)
	}

	code.WriteByte(0x41)
	writeSLEB(code, 256)
	code.WriteByte(0x10)
	writeULEB(code, 3)
	code.WriteByte(0x1a)

	code.WriteByte(0x0b)

	codeSec := &bytes.Buffer{}
	codeSec.WriteByte(0x01)
	writeULEB(codeSec, uint64(code.Len()))
	codeSec.Write(code.Bytes())
	writeSection(&out, 0x0a, codeSec.Bytes())

	return out.Bytes()
}

