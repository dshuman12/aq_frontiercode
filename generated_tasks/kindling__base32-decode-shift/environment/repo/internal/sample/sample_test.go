package sample_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/sample"
)

func TestEmptyCapacityFallsBack(t *testing.T) {
	r := sample.New(0, 1)
	if r.Capacity() != 1 {
		t.Errorf("got %d", r.Capacity())
	}
}

func TestRetainAllUnderCapacity(t *testing.T) {
	r := sample.New(5, 1)
	for i := 0; i < 3; i++ {
		r.Observe(i)
	}
	if len(r.Items()) != 3 {
		t.Errorf("got %d", len(r.Items()))
	}
	if r.Seen() != 3 {
		t.Errorf("got %d", r.Seen())
	}
}

func TestCapAtCapacity(t *testing.T) {
	r := sample.New(2, 1)
	for i := 0; i < 100; i++ {
		r.Observe(i)
	}
	if len(r.Items()) != 2 {
		t.Errorf("got %d", len(r.Items()))
	}
	if r.Seen() != 100 {
		t.Errorf("got %d", r.Seen())
	}
}

func TestReset(t *testing.T) {
	r := sample.New(2, 1)
	r.Observe(1)
	r.Reset()
	if r.Seen() != 0 || len(r.Items()) != 0 {
		t.Errorf("got %d items, %d seen", len(r.Items()), r.Seen())
	}
}

func TestItemsIsCopy(t *testing.T) {
	r := sample.New(2, 1)
	r.Observe(1)
	out := r.Items()
	out[0] = 999
	if r.Items()[0] != 1 {
		t.Error("internal state leaked")
	}
}
