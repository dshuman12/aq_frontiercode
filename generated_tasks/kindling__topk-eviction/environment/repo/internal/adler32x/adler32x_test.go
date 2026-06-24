package adler32x_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/adler32x"
)

func TestKnownVectors(t *testing.T) {
	if got := adler32x.Sum(nil); got != 1 {
		t.Errorf("got %x", got)
	}
	if got := adler32x.Sum([]byte("a")); got != 0x00620062 {
		t.Errorf("got %x", got)
	}
	if got := adler32x.Sum([]byte("abc")); got != 0x024d0127 {
		t.Errorf("got %x", got)
	}
}

func TestStreaming(t *testing.T) {
	s := adler32x.New()
	s.Update([]byte("hello "))
	s.Update([]byte("world"))
	one := adler32x.Sum([]byte("hello world"))
	if s.Sum() != one {
		t.Errorf("got %x want %x", s.Sum(), one)
	}
}

func TestReset(t *testing.T) {
	s := adler32x.New()
	s.Update([]byte("x"))
	s.Reset()
	if s.Sum() != 1 {
		t.Errorf("got %x", s.Sum())
	}
}
