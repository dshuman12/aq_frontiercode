package base64x_test

import (
	"bytes"
	"testing"

	"github.com/dleblanc/kindling/internal/base64x"
)

func TestKnownVectors(t *testing.T) {
	cases := map[string]string{
		"":       "",
		"f":      "Zg==",
		"fo":     "Zm8=",
		"foo":    "Zm9v",
		"foob":   "Zm9vYg==",
		"fooba":  "Zm9vYmE=",
		"foobar": "Zm9vYmFy",
	}
	for in, want := range cases {
		if got := base64x.Encode([]byte(in)); got != want {
			t.Errorf("Encode(%q) = %q want %q", in, got, want)
		}
	}
}

func TestDecodeKnownVectors(t *testing.T) {
	cases := map[string]string{
		"Zg==":     "f",
		"Zm9v":     "foo",
		"Zm9vYmFy": "foobar",
	}
	for in, want := range cases {
		got, err := base64x.Decode(in)
		if err != nil {
			t.Fatal(err)
		}
		if string(got) != want {
			t.Errorf("Decode(%q) = %q", in, got)
		}
	}
}

func TestRoundTrip(t *testing.T) {
	for n := 0; n < 100; n++ {
		raw := make([]byte, n)
		for i := range raw {
			raw[i] = byte(i * 17)
		}
		out, err := base64x.Decode(base64x.Encode(raw))
		if err != nil {
			t.Fatalf("len %d: %v", n, err)
		}
		if !bytes.Equal(raw, out) {
			t.Errorf("len %d: differ", n)
		}
	}
}

func TestBadLength(t *testing.T) {
	if _, err := base64x.Decode("abc"); err == nil {
		t.Error("expected error")
	}
}

func TestBadChar(t *testing.T) {
	if _, err := base64x.Decode("ab*="); err == nil {
		t.Error("expected error")
	}
}
