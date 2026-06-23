package wasm

// testTickModuleEmpty is a minimal hand-crafted WASM module that calls
// emit_decisions with the bytes "[]" — i.e. an empty decision list — and
// returns. The module exports `_durab_tick` and `memory`. It is the
// smallest module that exercises the workflow host ABI end-to-end.
//
// The bytes were derived by writing the corresponding WebAssembly Text
// (WAT) module out and translating section-by-section; see
// docs/abi.md (TODO) for the source WAT.
var testTickModuleEmpty = []byte{
	0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
	// type section: () -> () and (i32,i32) -> i32
	0x01, 0x0a, 0x02, 0x60, 0x00, 0x00, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
	// import durab.emit_decisions (type 1)
	0x02, 0x18, 0x01,
	0x05, 'd', 'u', 'r', 'a', 'b',
	0x0e, 'e', 'm', 'i', 't', '_', 'd', 'e', 'c', 'i', 's', 'i', 'o', 'n', 's',
	0x00, 0x01,
	// function section: func 0 has type 0
	0x03, 0x02, 0x01, 0x00,
	// memory section: 1 min page
	0x05, 0x03, 0x01, 0x00, 0x01,
	// export section: memory(0), _durab_tick(func 1)
	0x07, 0x18, 0x02,
	0x06, 'm', 'e', 'm', 'o', 'r', 'y', 0x02, 0x00,
	0x0b, '_', 'd', 'u', 'r', 'a', 'b', '_', 't', 'i', 'c', 'k', 0x00, 0x01,
	// code section: function body
	0x0a, 0x0b, 0x01, 0x09, 0x00,
	0x41, 0x00, // i32.const 0
	0x41, 0x02, // i32.const 2
	0x10, 0x00, // call 0
	0x1a,       // drop
	0x0b,       // end
	// data section: write "[]" at offset 0
	0x0b, 0x08, 0x01, 0x00, 0x41, 0x00, 0x0b, 0x02, '[', ']',
}
