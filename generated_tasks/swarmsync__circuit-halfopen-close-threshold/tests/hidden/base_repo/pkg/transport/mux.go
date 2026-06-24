package transport

import "sync"

// Handler processes a received envelope.
type Handler func(env *Envelope) *Envelope

// Mux is a message type multiplexer that routes envelopes to registered handlers.
type Mux struct {
	mu       sync.RWMutex
	handlers map[MsgType]Handler
	fallback Handler
	stats    map[MsgType]uint64
}

// NewMux creates a message multiplexer.
func NewMux() *Mux {
	return &Mux{
		handlers: make(map[MsgType]Handler),
		stats:    make(map[MsgType]uint64),
	}
}

// Handle registers a handler for a message type.
func (m *Mux) Handle(msgType MsgType, h Handler) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.handlers[msgType] = h
}

// SetFallback sets a handler for unregistered message types.
func (m *Mux) SetFallback(h Handler) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.fallback = h
}

// Dispatch routes an envelope to the appropriate handler.
// Returns the response envelope, or nil if no handler matched.
func (m *Mux) Dispatch(env *Envelope) *Envelope {
	m.mu.RLock()
	h, ok := m.handlers[env.Header.Type]
	fb := m.fallback
	m.mu.RUnlock()

	m.mu.Lock()
	m.stats[env.Header.Type]++
	m.mu.Unlock()

	if ok {
		return h(env)
	}
	if fb != nil {
		return fb(env)
	}
	return nil
}

// Stats returns dispatch counts per message type.
func (m *Mux) Stats() map[MsgType]uint64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	cp := make(map[MsgType]uint64, len(m.stats))
	for k, v := range m.stats {
		cp[k] = v
	}
	return cp
}

// HandlerCount returns the number of registered handlers.
func (m *Mux) HandlerCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.handlers)
}

// HasHandler checks if a handler is registered for a message type.
func (m *Mux) HasHandler(msgType MsgType) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	_, ok := m.handlers[msgType]
	return ok
}

// Remove deregisters a handler.
func (m *Mux) Remove(msgType MsgType) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.handlers, msgType)
}
