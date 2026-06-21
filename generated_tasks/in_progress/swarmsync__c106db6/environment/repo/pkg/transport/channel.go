package transport

import (
	"sync"
	"sync/atomic"
)

// Channel is an in-memory message transport for testing and simulation.
// It simulates a network channel between nodes using Go channels.
type Channel struct {
	mu       sync.RWMutex
	codec    *Codec
	inboxes  map[string]chan *Envelope
	bufSize  int
	sent     atomic.Int64
	received atomic.Int64
	dropped  atomic.Int64
}

// NewChannel creates a channel transport with the given inbox buffer size.
func NewChannel(bufSize int) *Channel {
	if bufSize < 1 {
		bufSize = 64
	}
	return &Channel{
		codec:   NewCodec(),
		inboxes: make(map[string]chan *Envelope),
		bufSize: bufSize,
	}
}

// Register creates an inbox for a node.
func (c *Channel) Register(nodeID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, ok := c.inboxes[nodeID]; !ok {
		c.inboxes[nodeID] = make(chan *Envelope, c.bufSize)
	}
}

// Unregister removes a node's inbox.
func (c *Channel) Unregister(nodeID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if ch, ok := c.inboxes[nodeID]; ok {
		close(ch)
		delete(c.inboxes, nodeID)
	}
}

// Send delivers an envelope to a target node's inbox.
// Returns false if the target doesn't exist or inbox is full (dropped).
func (c *Channel) Send(target string, env *Envelope) bool {
	c.mu.RLock()
	inbox, ok := c.inboxes[target]
	c.mu.RUnlock()
	if !ok {
		c.dropped.Add(1)
		return false
	}
	select {
	case inbox <- env:
		c.sent.Add(1)
		return true
	default:
		c.dropped.Add(1)
		return false
	}
}

// Receive returns the next envelope from a node's inbox, or nil if empty.
func (c *Channel) Receive(nodeID string) *Envelope {
	c.mu.RLock()
	inbox, ok := c.inboxes[nodeID]
	c.mu.RUnlock()
	if !ok {
		return nil
	}
	select {
	case env := <-inbox:
		c.received.Add(1)
		return env
	default:
		return nil
	}
}

// Pending returns the number of messages waiting in a node's inbox.
func (c *Channel) Pending(nodeID string) int {
	c.mu.RLock()
	inbox, ok := c.inboxes[nodeID]
	c.mu.RUnlock()
	if !ok {
		return 0
	}
	return len(inbox)
}

// Stats returns send, receive, and drop counts.
func (c *Channel) Stats() (sent, received, dropped int64) {
	return c.sent.Load(), c.received.Load(), c.dropped.Load()
}

// Codec returns the underlying codec.
func (c *Channel) Codec() *Codec {
	return c.codec
}

// MakeEnvelope is a helper to create an envelope with proper header fields.
func MakeEnvelope(msgType MsgType, sender string, seqNum uint64, body []byte) *Envelope {
	return &Envelope{
		Header: Header{
			Version: protocolVersion,
			Type:    msgType,
			Sender:  sender,
			SeqNum:  seqNum,
			BodyLen: uint32(len(body)),
		},
		Body: body,
	}
}