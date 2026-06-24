package lz77

import (
	"bytes"
	"strings"
	"testing"
)

func TestRoundTrip(t *testing.T) {
	cases := []string{
		"",
		"a",
		"hello hello hello hello",
		strings.Repeat("kindling", 50),
	}
	for _, s := range cases {
		comp := Compress([]byte(s))
		out, err := Decompress(comp)
		if err != nil {
			t.Fatalf("%q: %v", s, err)
		}
		if !bytes.Equal(out, []byte(s)) {
			t.Fatalf("%q: got %q", s, out)
		}
	}
}

func TestCompressShrinksRepeats(t *testing.T) {
	src := []byte(strings.Repeat("ABCDEFGH", 100))
	comp := Compress(src)
	if len(comp) >= len(src) {
		t.Fatalf("expected shrink: %d vs %d", len(comp), len(src))
	}
}

func TestDecompressRejectsGarbage(t *testing.T) {
	if _, err := Decompress([]byte{0xff}); err == nil {
		t.Fatal("expected err")
	}
}
