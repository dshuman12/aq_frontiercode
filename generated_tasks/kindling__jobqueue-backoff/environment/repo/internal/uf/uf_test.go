package uf_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/uf"
)

func TestSingletons(t *testing.T) {
	u := uf.New(5)
	for i := 0; i < 5; i++ {
		if u.Find(i) != i {
			t.Errorf("singleton %d", i)
		}
	}
}

func TestUnion(t *testing.T) {
	u := uf.New(5)
	if !u.Union(0, 1) {
		t.Error("first union should be true")
	}
	if u.Union(0, 1) {
		t.Error("second union should be false")
	}
	if !u.Connected(0, 1) {
		t.Error("connected")
	}
}

func TestSetSize(t *testing.T) {
	u := uf.New(5)
	u.Union(0, 1)
	u.Union(1, 2)
	if u.SetSize(0) != 3 {
		t.Errorf("got %d", u.SetSize(0))
	}
}

func TestDistinctSets(t *testing.T) {
	u := uf.New(4)
	u.Union(0, 1)
	u.Union(2, 3)
	if u.Connected(0, 2) {
		t.Error("should not be connected")
	}
	if !u.Connected(1, 0) {
		t.Error("should be connected")
	}
}

func TestLen(t *testing.T) {
	u := uf.New(7)
	if u.Len() != 7 {
		t.Errorf("got %d", u.Len())
	}
}
