package msg

import (
	"bytes"
	"io"
	"testing"
)

func TestRoundTrip(t *testing.T) {
	var buf bytes.Buffer
	w := NewWriter(&buf)
	for i := 0; i < 5; i++ {
		if err := w.Write(byte(i), []byte("hello")); err != nil {
			t.Fatal(err)
		}
	}
	r := NewReader(&buf)
	for i := 0; i < 5; i++ {
		m, err := r.Read()
		if err != nil {
			t.Fatal(err)
		}
		if m.Tag != byte(i) {
			t.Fatalf("tag %d != %d", m.Tag, i)
		}
		if string(m.Payload) != "hello" {
			t.Fatalf("payload %q", m.Payload)
		}
	}
	if _, err := r.Read(); err != io.EOF {
		t.Fatalf("expected EOF, got %v", err)
	}
}

func TestOversize(t *testing.T) {
	var buf bytes.Buffer
	buf.Write([]byte{0xFF, 0xFF, 0xFF, 0xFF})
	if _, err := NewReader(&buf).Read(); err == nil {
		t.Fatal("expected error")
	}
}

func TestCountFrames(t *testing.T) {
	var buf bytes.Buffer
	w := NewWriter(&buf)
	for i := 0; i < 7; i++ {
		_ = w.Write(1, []byte{byte(i)})
	}
	n, err := CountFrames(&buf)
	if err != nil {
		t.Fatal(err)
	}
	if n != 7 {
		t.Fatalf("got %d", n)
	}
}
