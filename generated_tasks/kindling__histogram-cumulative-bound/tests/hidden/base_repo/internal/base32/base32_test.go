package base32_test

import (
	"bytes"
	"testing"

	"github.com/dleblanc/kindling/internal/base32"
)

func TestEmpty(t *testing.T) {
	if got := base32.Encode(nil); got != "" {
		t.Errorf("got %q", got)
	}
}

func TestSingleByte(t *testing.T) {
	got := base32.Encode([]byte("f"))
	if got != "MY======" {
		t.Errorf("got %q", got)
	}
}

func TestRoundTrip(t *testing.T) {
	for n := 0; n < 50; n++ {
		raw := make([]byte, n)
		for i := range raw {
			raw[i] = byte(i * 31)
		}
		out, err := base32.Decode(base32.Encode(raw))
		if err != nil {
			t.Fatalf("len %d: %v", n, err)
		}
		if !bytes.Equal(raw, out) {
			t.Errorf("len %d: differ", n)
		}
	}
}

func TestDecodeBadLength(t *testing.T) {
	if _, err := base32.Decode("ABC"); err == nil {
		t.Error("expected error")
	}
}

func TestDecodeBadChar(t *testing.T) {
	if _, err := base32.Decode("ABCDEFG!"); err == nil {
		t.Error("expected error")
	}
}
