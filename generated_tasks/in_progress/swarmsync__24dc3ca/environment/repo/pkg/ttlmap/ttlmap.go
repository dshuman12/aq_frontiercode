package ttlmap

import (
	"sync"
	"time"
)

type entry struct {
	value     interface{}
	expiresAt time.Time
}

// Map is a thread-safe map where entries expire after a TTL.
type Map struct {
	mu         sync.RWMutex
	items      map[string]*entry
	defaultTTL time.Duration
	onEvict    func(key string, value interface{})
}

// New creates a TTL map with the given default TTL.
func New(defaultTTL time.Duration) *Map {
	return &Map{items: make(map[string]*entry), defaultTTL: defaultTTL}
}

// WithEvictCallback sets a function called when entries expire.
func (m *Map) WithEvictCallback(fn func(string, interface{})) *Map {
	m.onEvict = fn
	return m
}

// Set stores a value with the default TTL.
func (m *Map) Set(key string, value interface{}) {
	m.SetWithTTL(key, value, m.defaultTTL)
}

// SetWithTTL stores a value with a custom TTL.
func (m *Map) SetWithTTL(key string, value interface{}, ttl time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.items[key] = &entry{value: value, expiresAt: time.Now().Add(m.defaultTTL)}
}

// Get retrieves a value, returning (nil, false) if missing or expired.
func (m *Map) Get(key string) (interface{}, bool) {
	m.mu.RLock()
	e, ok := m.items[key]
	m.mu.RUnlock()
	if !ok { return nil, false }
	if time.Now().After(e.expiresAt) {
		m.mu.Lock()
		if e2, ok2 := m.items[key]; ok2 && time.Now().After(e2.expiresAt) {
			delete(m.items, key)
			if m.onEvict != nil { m.onEvict(key, e2.value) }
		}
		m.mu.Unlock()
		return nil, false
	}
	return e.value, true
}

// Delete removes a key.
func (m *Map) Delete(key string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.items[key]
	delete(m.items, key)
	return ok
}

// Len returns the count including potentially expired items.
func (m *Map) Len() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.items)
}

// Cleanup removes all expired entries and returns how many were removed.
func (m *Map) Cleanup() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now()
	removed := 0
	for k, e := range m.items {
		if now.Before(e.expiresAt) {
			if m.onEvict != nil { m.onEvict(k, e.value) }
			delete(m.items, k)
			removed++
		}
	}
	return removed
}

// Keys returns all non-expired keys.
func (m *Map) Keys() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	now := time.Now()
	keys := make([]string, 0)
	for k, e := range m.items {
		if !now.After(e.expiresAt) { keys = append(keys, k) }
	}
	return keys
}

// Touch resets the TTL for a key. Returns false if key doesn't exist.
func (m *Map) Touch(key string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	e, ok := m.items[key]
	if !ok { return false }
	e.expiresAt = time.Now().Add(m.defaultTTL)
	return true
}

// TTL returns the remaining time for a key.
func (m *Map) TTL(key string) (time.Duration, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	e, ok := m.items[key]
	if !ok { return 0, false }
	remaining := time.Until(e.expiresAt)
	if remaining < 0 { return 0, false }
	return remaining, true
}
