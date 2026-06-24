package crc32x_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/crc32x"
)

func TestKnownVectors(t *testing.T) {
	if got := crc32x.Sum(nil); got != 0 {
		t.Errorf("got %x", got)
	}
	if got := crc32x.Sum([]byte("123456789")); got != 0xcbf43926 {
		t.Errorf("got %x", got)
	}
}

func TestStreaming(t *testing.T) {
	s := crc32x.New()
	s.Update([]byte("hello "))
	s.Update([]byte("world"))
	one := crc32x.Sum([]byte("hello world"))
	if s.Sum() != one {
		t.Errorf("streamed=%x one=%x", s.Sum(), one)
	}
}

func TestReset(t *testing.T) {
	s := crc32x.New()
	s.Update([]byte("x"))
	s.Reset()
	if s.Sum() != 0 {
		t.Errorf("got %x", s.Sum())
	}
}

func TestDistinctInputs(t *testing.T) {
	if crc32x.Sum([]byte("abc")) == crc32x.Sum([]byte("abd")) {
		t.Error("expected distinct")
	}
}
