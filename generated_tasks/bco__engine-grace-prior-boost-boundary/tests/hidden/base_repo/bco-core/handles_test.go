package main

import (
	"math"
	"testing"
)

func TestNewHandleTable_emptyStartsAtOne(t *testing.T) {
	ht := NewHandleTable()
	if ht == nil {
		t.Fatal("NewHandleTable returned nil")
	}
	if _, ok := ht.Get(1); ok {
		t.Fatal("expected no engine at handle 1")
	}
}

func TestHandleTable_Add_monotonicHandles(t *testing.T) {
	ht := NewHandleTable()
	e1, e2 := &BCOEngine{}, &BCOEngine{}
	if id1 := ht.Add(e1); id1 != 1 {
		t.Fatalf("first Add: got handle %d want 1", id1)
	}
	if id2 := ht.Add(e2); id2 != 2 {
		t.Fatalf("second Add: got handle %d want 2", id2)
	}
}

func TestHandleTable_Add_registersNilNetworkBinding(t *testing.T) {
	ht := NewHandleTable()
	e := &BCOEngine{}
	id := ht.Add(e)
	b, ok := ht.GetBinding(id)
	if !ok {
		t.Fatal("GetBinding: expected ok")
	}
	if b.Engine != e || b.Network != nil {
		t.Fatalf("binding: %+v want Engine=%p Network=nil", b, e)
	}
}

func TestHandleTable_AddBinding_nextOverflowResets(t *testing.T) {
	ht := NewHandleTable()
	e := &BCOEngine{}
	ht.next = math.MaxInt
	id := ht.AddBinding(&EngineBinding{Engine: e, Network: nil})
	if id != math.MaxInt {
		t.Fatalf("expected id %d, got %d", math.MaxInt, id)
	}
	if ht.next != 1 {
		t.Fatalf("after int overflow next should reset to 1, got %d", ht.next)
	}
}

func TestHandleTable_AddBinding_withNetwork(t *testing.T) {
	ht := NewHandleTable()
	e := &BCOEngine{}
	net := &BCONetwork{}
	id := ht.AddBinding(&EngineBinding{Engine: e, Network: net})
	if id != 1 {
		t.Fatalf("handle: got %d want 1", id)
	}
	b, ok := ht.GetBinding(id)
	if !ok || b.Engine != e {
		t.Fatalf("GetBinding: ok=%v engine=%p", ok, b.Engine)
	}
	if b.Network != net {
		t.Fatalf("GetBinding Network: got %p want %p", b.Network, net)
	}
}

func TestHandleTable_Get_and_GetBinding(t *testing.T) {
	ht := NewHandleTable()
	e := &BCOEngine{}
	id := ht.Add(e)

	got, ok := ht.Get(id)
	if !ok || got != e {
		t.Fatalf("Get(valid): ok=%v got=%p want %p", ok, got, e)
	}
	b, ok := ht.GetBinding(id)
	if !ok || b.Engine != e {
		t.Fatalf("GetBinding(valid): ok=%v", ok)
	}

	if _, ok := ht.Get(999); ok {
		t.Fatal("Get(missing): expected !ok")
	}
	if _, ok := ht.GetBinding(999); ok {
		t.Fatal("GetBinding(missing): expected !ok")
	}
}

func TestHandleTable_GetEngine_validDoesNotSetError(t *testing.T) {
	ht := NewHandleTable()
	e := &BCOEngine{}
	id := ht.Add(e)

	got, ok := ht.GetEngine(id)
	if !ok || got != e {
		t.Fatalf("GetEngine(valid): ok=%v", ok)
	}
	if msg := PeekEngineError(id); msg != "" {
		t.Fatalf("unexpected engine error for valid handle: %q", msg)
	}
}

func TestHandleTable_GetEngine_invalidSetsEngineError(t *testing.T) {
	ht := NewHandleTable()
	const badID = 424242
	t.Cleanup(func() { TakeEngineError(badID) })

	got, ok := ht.GetEngine(badID)
	if ok || got != nil {
		t.Fatalf("GetEngine(invalid): ok=%v got=%v", ok, got)
	}
	if msg := PeekEngineError(badID); msg != "invalid engine handle" {
		t.Fatalf("PeekEngineError: got %q want invalid engine handle", msg)
	}
}

func TestHandleTable_Remove_idempotentAndMissing(t *testing.T) {
	ht := NewHandleTable()
	e := &BCOEngine{}
	id := ht.Add(e)

	ht.Remove(id)
	if _, ok := ht.Get(id); ok {
		t.Fatal("expected handle removed")
	}

	// Idempotent: second remove must not panic.
	ht.Remove(id)

	// Missing id: no panic.
	ht.Remove(99999)
}

func TestHandleTable_Remove_otherHandlesUnaffected(t *testing.T) {
	ht := NewHandleTable()
	e1, e2 := &BCOEngine{}, &BCOEngine{}
	id1 := ht.Add(e1)
	id2 := ht.Add(e2)
	ht.Remove(id1)

	if _, ok := ht.Get(id1); ok {
		t.Fatal("id1 should be gone")
	}
	got, ok := ht.Get(id2)
	if !ok || got != e2 {
		t.Fatal("id2 should remain")
	}
}
