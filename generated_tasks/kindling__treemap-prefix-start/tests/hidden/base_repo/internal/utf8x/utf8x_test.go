package utf8x_test

import (
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/dleblanc/kindling/internal/utf8x"
)

func TestValidASCII(t *testing.T) {
	if !utf8x.IsValid([]byte("hello")) {
		t.Error("ascii")
	}
}

func TestInvalidContinuation(t *testing.T) {
	if utf8x.IsValid([]byte{0xc3, 0x28}) {
		t.Error("continuation")
	}
}

func TestLossyReplacesInvalid(t *testing.T) {
	got := utf8x.Lossy([]byte{'h', 0xff, 'i'})
	if !strings.ContainsRune(got, utf8.RuneError) {
		t.Errorf("got %q", got)
	}
}

func TestTruncateShortNoOp(t *testing.T) {
	if got := utf8x.Truncate("hi", 10); got != "hi" {
		t.Errorf("got %q", got)
	}
}

func TestTruncateLongString(t *testing.T) {
	if got := utf8x.Truncate("abcdef", 3); got != "abc" {
		t.Errorf("got %q", got)
	}
}

func TestTruncateRespectsBoundary(t *testing.T) {
	s := "café"
	got := utf8x.Truncate(s, 4)
	if !utf8.ValidString(got) {
		t.Errorf("got invalid: %q", got)
	}
}

func TestTruncateZero(t *testing.T) {
	if got := utf8x.Truncate("hi", 0); got != "" {
		t.Errorf("got %q", got)
	}
}

func TestCountRunes(t *testing.T) {
	if utf8x.CountRunes("café") != 4 {
		t.Errorf("got %d", utf8x.CountRunes("café"))
	}
}
