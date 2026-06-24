package binprot

import (
	"bytes"
	"testing"
)

func TestVarintRoundTrip(t *testing.T) {
	for _, v := range []uint64{0, 1, 127, 128, 1 << 30, 1<<63 - 1} {
		var buf [MaxVarintLen64]byte
		n := PutVarint(buf[:], v)
		got, _, err := ReadVarint(bytes.NewReader(buf[:n]))
		if err != nil || got != v {
			t.Fatalf("%d: got %d err %v", v, got, err)
		}
	}
}

func TestZigZag(t *testing.T) {
	for _, v := range []int64{0, 1, -1, 1000, -1000, 1<<62 - 1} {
		if UnZigZag(ZigZag(v)) != v {
			t.Fatalf("rt %d", v)
		}
	}
}

func TestTaggedRoundTrip(t *testing.T) {
	var buf bytes.Buffer
	w := NewWriter(&buf)
	if err := w.PutVarint(1, 42); err != nil {
		t.Fatal(err)
	}
	if err := w.PutString(2, "hello"); err != nil {
		t.Fatal(err)
	}
	if err := w.PutFloat64(3, 3.14); err != nil {
		t.Fatal(err)
	}
	r := NewReader(bytes.NewReader(buf.Bytes()))
	for i := 0; i < 3; i++ {
		field, wt, err := r.NextTag()
		if err != nil {
			t.Fatal(err)
		}
		switch field {
		case 1:
			if wt != WireVarint {
				t.Fatal("expected varint")
			}
			v, _ := r.ReadVarint()
			if v != 42 {
				t.Fatalf("got %d", v)
			}
		case 2:
			if wt != WireBytes {
				t.Fatal("expected bytes")
			}
			b, _ := r.ReadBytes()
			if string(b) != "hello" {
				t.Fatalf("got %s", b)
			}
		case 3:
			if wt != WireFixed64 {
				t.Fatal("expected fixed64")
			}
			f, _ := r.ReadFloat64()
			if f != 3.14 {
				t.Fatalf("got %v", f)
			}
		}
	}
}

func TestEncodeDecodeTag(t *testing.T) {
	tag := EncodeTag(7, WireBytes)
	f, w := DecodeTag(tag)
	if f != 7 || w != WireBytes {
		t.Fatalf("got %d %d", f, w)
	}
}
