package ring_test

import (
	"reflect"
	"testing"

	"github.com/dleblanc/kindling/internal/ring"
)

func TestEmpty(t *testing.T) {
	r := ring.New(3)
	if r.Len() != 0 {
		t.Errorf("got %d", r.Len())
	}
	if got := r.Snapshot(); len(got) != 0 {
		t.Errorf("got %v", got)
	}
}

func TestPushIncreasesLen(t *testing.T) {
	r := ring.New(3)
	r.Push(1)
	r.Push(2)
	if r.Len() != 2 {
		t.Errorf("got %d", r.Len())
	}
}

func TestRingCapsAtCapacity(t *testing.T) {
	r := ring.New(2)
	r.Push(1)
	r.Push(2)
	r.Push(3)
	if r.Len() != 2 {
		t.Errorf("got %d", r.Len())
	}
	got := r.Snapshot()
	want := []any{2, 3}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v", got)
	}
}

func TestSnapshotOldestFirst(t *testing.T) {
	r := ring.New(4)
	for i := 1; i <= 3; i++ {
		r.Push(i)
	}
	if !reflect.DeepEqual(r.Snapshot(), []any{1, 2, 3}) {
		t.Errorf("got %v", r.Snapshot())
	}
}

func TestReset(t *testing.T) {
	r := ring.New(3)
	r.Push(1)
	r.Reset()
	if r.Len() != 0 {
		t.Errorf("got %d", r.Len())
	}
}

func TestZeroCapacityFallsBackToOne(t *testing.T) {
	r := ring.New(0)
	if r.Capacity() != 1 {
		t.Errorf("got %d", r.Capacity())
	}
}
