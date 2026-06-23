package transport

import (
	"math"
	"testing"
)

// --- Codec tests ---

func TestCodec_EncodeDecodeRoundtrip(t *testing.T) {
	c := NewCodec()
	env := MakeEnvelope(MsgGossipPush, "node-1", 42, []byte("hello world"))
	data, err := c.Encode(env)
	if err != nil {
		t.Fatalf("encode error: %v", err)
	}
	decoded, err := c.Decode(data)
	if err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if decoded.Header.Type != MsgGossipPush {
		t.Fatal("type mismatch")
	}
	if decoded.Header.Sender != "node-1" {
		t.Fatal("sender mismatch")
	}
	if decoded.Header.SeqNum != 42 {
		t.Fatal("seqNum mismatch")
	}
	if string(decoded.Body) != "hello world" {
		t.Fatal("body mismatch")
	}
}

func TestCodec_EmptyBody(t *testing.T) {
	c := NewCodec()
	env := MakeEnvelope(MsgPing, "n1", 1, nil)
	data, err := c.Encode(env)
	if err != nil {
		t.Fatal(err)
	}
	decoded, err := c.Decode(data)
	if err != nil {
		t.Fatal(err)
	}
	if len(decoded.Body) != 0 {
		t.Fatal("body should be empty")
	}
}

func TestCodec_AllMessageTypes(t *testing.T) {
	c := NewCodec()
	types := []MsgType{
		MsgPing, MsgPingReq, MsgAck, MsgNack,
		MsgGossipPush, MsgGossipPull, MsgGossipPushPull, MsgGossipDigest,
		MsgMemberJoin, MsgMemberLeave, MsgMemberState,
		MsgMerkleDiff, MsgMerkleSync,
		MsgCRDTState, MsgCRDTDelta,
	}
	for _, mt := range types {
		env := MakeEnvelope(mt, "sender", 1, []byte("test"))
		data, err := c.Encode(env)
		if err != nil {
			t.Fatalf("encode type %d: %v", mt, err)
		}
		decoded, err := c.Decode(data)
		if err != nil {
			t.Fatalf("decode type %d: %v", mt, err)
		}
		if decoded.Header.Type != mt {
			t.Fatalf("type mismatch for %d", mt)
		}
	}
}

func TestCodec_BadChecksum(t *testing.T) {
	c := NewCodec()
	env := MakeEnvelope(MsgPing, "n1", 1, []byte("data"))
	data, _ := c.Encode(env)
	data[len(data)-1] ^= 0xFF // corrupt checksum
	_, err := c.Decode(data)
	if err != ErrBadChecksum {
		t.Fatalf("expected ErrBadChecksum, got %v", err)
	}
}

func TestCodec_ShortBuffer(t *testing.T) {
	c := NewCodec()
	_, err := c.Decode([]byte{1, 2, 3})
	if err != ErrShortBuffer {
		t.Fatalf("expected ErrShortBuffer, got %v", err)
	}
}

func TestCodec_BadVersion(t *testing.T) {
	c := NewCodec()
	env := MakeEnvelope(MsgPing, "n1", 1, []byte("data"))
	data, _ := c.Encode(env)
	data[0] = 99 // wrong version
	_, err := c.Decode(data)
	if err != ErrBadVersion {
		t.Fatalf("expected ErrBadVersion, got %v", err)
	}
}

func TestCodec_LongSender(t *testing.T) {
	c := NewCodec()
	longSender := make([]byte, 500)
	for i := range longSender {
		longSender[i] = byte('a' + i%26)
	}
	env := MakeEnvelope(MsgPing, string(longSender), 1, []byte("x"))
	data, err := c.Encode(env)
	if err != nil {
		t.Fatal(err)
	}
	decoded, err := c.Decode(data)
	if err != nil {
		t.Fatal(err)
	}
	if decoded.Header.Sender != string(longSender) {
		t.Fatal("long sender roundtrip failed")
	}
}

// --- Varint tests ---

func TestVarint_Roundtrip(t *testing.T) {
	values := []uint64{0, 1, 127, 128, 255, 256, 16383, 16384, math.MaxUint32, math.MaxUint64}
	for _, v := range values {
		encoded := EncodeVarint(v)
		decoded, n, err := DecodeVarint(encoded)
		if err != nil {
			t.Fatalf("decode error for %d: %v", v, err)
		}
		if decoded != v {
			t.Fatalf("expected %d, got %d", v, decoded)
		}
		if n != len(encoded) {
			t.Fatal("consumed bytes mismatch")
		}
	}
}

func TestVarint_SmallValuesCompact(t *testing.T) {
	if len(EncodeVarint(0)) != 1 {
		t.Fatal("0 should encode to 1 byte")
	}
	if len(EncodeVarint(127)) != 1 {
		t.Fatal("127 should encode to 1 byte")
	}
	if len(EncodeVarint(128)) != 2 {
		t.Fatal("128 should encode to 2 bytes")
	}
}

func TestDecodeVarint_ShortBuffer(t *testing.T) {
	_, _, err := DecodeVarint(nil)
	if err == nil {
		t.Fatal("expected error for empty input")
	}
}

// --- ZigZag tests ---

func TestZigZag_Roundtrip(t *testing.T) {
	values := []int64{0, 1, -1, 2, -2, 100, -100, math.MaxInt64, math.MinInt64}
	for _, v := range values {
		encoded := EncodeZigZag(v)
		decoded := DecodeZigZag(encoded)
		if decoded != v {
			t.Fatalf("expected %d, got %d", v, decoded)
		}
	}
}

func TestZigZag_SmallValues(t *testing.T) {
	if EncodeZigZag(0) != 0 {
		t.Fatal("ZigZag(0) should be 0")
	}
	if EncodeZigZag(-1) != 1 {
		t.Fatal("ZigZag(-1) should be 1")
	}
	if EncodeZigZag(1) != 2 {
		t.Fatal("ZigZag(1) should be 2")
	}
}

// --- String encoding tests ---

func TestEncodeString_Roundtrip(t *testing.T) {
	tests := []string{"", "hello", "foo bar baz", "unicode: 日本語"}
	for _, s := range tests {
		encoded := EncodeString(s)
		decoded, n, err := DecodeString(encoded)
		if err != nil {
			t.Fatalf("decode error for %q: %v", s, err)
		}
		if decoded != s {
			t.Fatalf("expected %q, got %q", s, decoded)
		}
		if n != len(encoded) {
			t.Fatal("consumed bytes mismatch")
		}
	}
}

func TestDecodeString_ShortBuffer(t *testing.T) {
	data := EncodeString("hello")
	_, _, err := DecodeString(data[:2]) // truncated
	if err == nil {
		t.Fatal("expected error for truncated string")
	}
}

// --- Bytes encoding tests ---

func TestEncodeBytes_Roundtrip(t *testing.T) {
	tests := [][]byte{nil, {}, {0x00}, {0xFF, 0xFE, 0xFD}, make([]byte, 1000)}
	for i, b := range tests {
		encoded := EncodeBytes(b)
		decoded, n, err := DecodeBytes(encoded)
		if err != nil {
			t.Fatalf("decode error for test %d: %v", i, err)
		}
		if len(decoded) != len(b) {
			t.Fatalf("test %d: length mismatch", i)
		}
		if n != len(encoded) {
			t.Fatal("consumed bytes mismatch")
		}
	}
}

// --- Channel tests ---

func TestChannel_RegisterAndSend(t *testing.T) {
	ch := NewChannel(10)
	ch.Register("n1")
	env := MakeEnvelope(MsgPing, "n2", 1, nil)
	if !ch.Send("n1", env) {
		t.Fatal("send should succeed")
	}
	if ch.Pending("n1") != 1 {
		t.Fatal("expected 1 pending")
	}
}

func TestChannel_Receive(t *testing.T) {
	ch := NewChannel(10)
	ch.Register("n1")
	env := MakeEnvelope(MsgPing, "n2", 1, []byte("hello"))
	ch.Send("n1", env)
	received := ch.Receive("n1")
	if received == nil {
		t.Fatal("expected to receive message")
	}
	if string(received.Body) != "hello" {
		t.Fatal("body mismatch")
	}
}

func TestChannel_ReceiveEmpty(t *testing.T) {
	ch := NewChannel(10)
	ch.Register("n1")
	if ch.Receive("n1") != nil {
		t.Fatal("expected nil for empty inbox")
	}
}

func TestChannel_SendToUnregistered(t *testing.T) {
	ch := NewChannel(10)
	env := MakeEnvelope(MsgPing, "n1", 1, nil)
	if ch.Send("ghost", env) {
		t.Fatal("send to unregistered should fail")
	}
}

func TestChannel_InboxFull(t *testing.T) {
	ch := NewChannel(1)
	ch.Register("n1")
	env := MakeEnvelope(MsgPing, "n2", 1, nil)
	ch.Send("n1", env)  // fills buffer
	if ch.Send("n1", env) { // should drop
		t.Fatal("send to full inbox should fail")
	}
}

func TestChannel_Unregister(t *testing.T) {
	ch := NewChannel(10)
	ch.Register("n1")
	ch.Unregister("n1")
	if ch.Receive("n1") != nil {
		t.Fatal("unregistered node should have no inbox")
	}
}

func TestChannel_Stats(t *testing.T) {
	ch := NewChannel(10)
	ch.Register("n1")
	env := MakeEnvelope(MsgPing, "n2", 1, nil)
	ch.Send("n1", env)
	ch.Send("ghost", env) // dropped
	ch.Receive("n1")

	sent, received, dropped := ch.Stats()
	if sent != 1 || received != 1 || dropped != 1 {
		t.Fatalf("expected (1,1,1), got (%d,%d,%d)", sent, received, dropped)
	}
}

// --- Address tests ---

func TestAddress_String(t *testing.T) {
	a := Address{Host: "localhost", Port: 8080}
	if a.String() != "localhost:8080" {
		t.Fatalf("expected localhost:8080, got %s", a.String())
	}
}

func TestAddress_StringZero(t *testing.T) {
	a := Address{Host: "0.0.0.0", Port: 0}
	if a.String() != "0.0.0.0:0" {
		t.Fatalf("expected 0.0.0.0:0, got %s", a.String())
	}
}
// --- Mux tests ---

func TestMux_Dispatch(t *testing.T) {
	mux := NewMux()
	called := false
	mux.Handle(MsgPing, func(env *Envelope) *Envelope {
		called = true
		return MakeEnvelope(MsgAck, "responder", env.Header.SeqNum, nil)
	})
	env := MakeEnvelope(MsgPing, "sender", 1, nil)
	resp := mux.Dispatch(env)
	if !called { t.Fatal("handler should be called") }
	if resp == nil || resp.Header.Type != MsgAck { t.Fatal("should return ack") }
}

func TestMux_Fallback(t *testing.T) {
	mux := NewMux()
	fallbackCalled := false
	mux.SetFallback(func(env *Envelope) *Envelope {
		fallbackCalled = true
		return nil
	})
	mux.Dispatch(MakeEnvelope(MsgPing, "s", 1, nil))
	if !fallbackCalled { t.Fatal("fallback should be called") }
}

func TestMux_Stats(t *testing.T) {
	mux := NewMux()
	mux.Handle(MsgPing, func(env *Envelope) *Envelope { return nil })
	mux.Dispatch(MakeEnvelope(MsgPing, "s", 1, nil))
	mux.Dispatch(MakeEnvelope(MsgPing, "s", 2, nil))
	stats := mux.Stats()
	if stats[MsgPing] != 2 { t.Fatalf("expected 2, got %d", stats[MsgPing]) }
}

func TestMux_HandlerCount(t *testing.T) {
	mux := NewMux()
	mux.Handle(MsgPing, func(env *Envelope) *Envelope { return nil })
	mux.Handle(MsgAck, func(env *Envelope) *Envelope { return nil })
	if mux.HandlerCount() != 2 { t.Fatal("expected 2") }
}

func TestMux_Remove(t *testing.T) {
	mux := NewMux()
	mux.Handle(MsgPing, func(env *Envelope) *Envelope { return nil })
	mux.Remove(MsgPing)
	if mux.HasHandler(MsgPing) { t.Fatal("should be removed") }
}

func TestMux_NoHandler(t *testing.T) {
	mux := NewMux()
	resp := mux.Dispatch(MakeEnvelope(MsgPing, "s", 1, nil))
	if resp != nil { t.Fatal("should return nil with no handler") }
}
