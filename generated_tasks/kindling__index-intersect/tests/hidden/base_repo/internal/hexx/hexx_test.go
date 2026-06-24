package hexx_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/hexx"
)

func TestEncode(t *testing.T) {
	cases := map[string]string{
		"":       "",
		"\x00":   "00",
		"\xff":   "ff",
		"abc":    "616263",
	}
	for in, want := range cases {
		if got := hexx.Encode([]byte(in)); got != want {
			t.Errorf("Encode(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestDecode(t *testing.T) {
	out, err := hexx.Decode("616263")
	if err != nil {
		t.Fatal(err)
	}
	if string(out) != "abc" {
		t.Errorf("got %q", string(out))
	}
}

func TestDecodeOddLength(t *testing.T) {
	if _, err := hexx.Decode("abc"); err == nil {
		t.Error("expected error")
	}
}

func TestDecodeBadDigit(t *testing.T) {
	if _, err := hexx.Decode("xx"); err == nil {
		t.Error("expected error")
	}
}

func TestRoundTrip(t *testing.T) {
	for n := 0; n < 100; n++ {
		raw := make([]byte, n)
		for i := range raw {
			raw[i] = byte(i * 7)
		}
		out, err := hexx.Decode(hexx.Encode(raw))
		if err != nil {
			t.Fatalf("len %d: %v", n, err)
		}
		for i, b := range raw {
			if out[i] != b {
				t.Errorf("len %d: byte %d: got %d want %d", n, i, out[i], b)
			}
		}
	}
}

func TestEqual(t *testing.T) {
	if !hexx.Equal("ab", "AB") {
		t.Error("case-insensitive")
	}
	if hexx.Equal("ab", "cd") {
		t.Error("distinct")
	}
}
