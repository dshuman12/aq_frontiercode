package main

import "sync"

// EngineBinding ties an engine to its live network implementation (US2+).
type EngineBinding struct {
	Engine  *BCOEngine
	Network *BCONetwork
}

// HandleTable maps integer engine handles to engines (C API contract).
type HandleTable struct {
	mu       sync.Mutex
	next     int
	engines  map[int]*BCOEngine
	bindings map[int]*EngineBinding
}

// NewHandleTable creates an empty table starting at handle 1.
func NewHandleTable() *HandleTable {
	return &HandleTable{
		next:     1,
		engines:  make(map[int]*BCOEngine),
		bindings: make(map[int]*EngineBinding),
	}
}

// Add registers an engine and returns a new monotonic handle (>0).
func (t *HandleTable) Add(e *BCOEngine) int {
	return t.AddBinding(&EngineBinding{Engine: e, Network: nil})
}

// AddBinding registers an engine with optional network layer.
func (t *HandleTable) AddBinding(b *EngineBinding) int {
	t.mu.Lock()
	defer t.mu.Unlock()
	id := t.next
	t.next++
	if t.next <= 0 {
		t.next = 1
	}
	t.engines[id] = b.Engine
	t.bindings[id] = b
	return id
}

// Get returns the engine for a handle without recording an error.
func (t *HandleTable) Get(id int) (*BCOEngine, bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	e, ok := t.engines[id]
	return e, ok
}

// GetBinding returns the full binding, if any.
func (t *HandleTable) GetBinding(id int) (*EngineBinding, bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	b, ok := t.bindings[id]
	return b, ok
}

// GetEngine returns the engine or records BCOGetLastError for invalid handles.
func (t *HandleTable) GetEngine(id int) (*BCOEngine, bool) {
	e, ok := t.Get(id)
	if !ok {
		setEngineError(id, "invalid engine handle")
	}
	return e, ok
}

// Remove deletes a handle from the table.
func (t *HandleTable) Remove(id int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.engines, id)
	delete(t.bindings, id)
}
