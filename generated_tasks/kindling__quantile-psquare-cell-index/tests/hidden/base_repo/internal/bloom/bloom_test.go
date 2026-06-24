package bloom_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/bloom"
)

func TestEmptyContainsNothing(t *testing.T) {
	f := bloom.New(100, 0.01)
	if f.Contains([]byte("anything")) {
		t.Error("unexpected match")
	}
}

func TestInsertedKeyIsContained(t *testing.T) {
	f := bloom.New(100, 0.01)
	f.Insert([]byte("hello"))
	if !f.Contains([]byte("hello")) {
		t.Error("inserted key missing")
	}
}

func TestNoFalseNegatives(t *testing.T) {
	f := bloom.New(1000, 0.01)
	for i := 0; i < 100; i++ {
		f.Insert([]byte{byte(i & 0xff), byte(i >> 8)})
	}
	for i := 0; i < 100; i++ {
		if !f.Contains([]byte{byte(i & 0xff), byte(i >> 8)}) {
			t.Errorf("missing %d", i)
		}
	}
}

func TestFillRatioInitiallyZero(t *testing.T) {
	f := bloom.New(100, 0.01)
	if f.FillRatio() != 0 {
		t.Errorf("got %v", f.FillRatio())
	}
}

func TestFillRatioGrows(t *testing.T) {
	f := bloom.New(100, 0.01)
	for i := 0; i < 50; i++ {
		f.Insert([]byte{byte(i)})
	}
	if f.FillRatio() == 0 {
		t.Error("fill ratio should grow")
	}
}

func TestZeroExpectedFallsBack(t *testing.T) {
	f := bloom.New(0, 0.01)
	f.Insert([]byte("x"))
	if !f.Contains([]byte("x")) {
		t.Error("unexpected miss")
	}
}
