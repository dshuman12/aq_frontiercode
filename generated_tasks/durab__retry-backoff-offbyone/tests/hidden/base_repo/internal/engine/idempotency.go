package engine

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"sync"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

type IdempotencyCache struct {
	mu      sync.Mutex
	entries map[string]idempotencyEntry
	ttl     time.Duration
	clock   func() time.Time
}

type idempotencyEntry struct {
	exec    types.Execution
	expires time.Time
}

func NewIdempotencyCache(ttl time.Duration) *IdempotencyCache {
	return &IdempotencyCache{
		entries: make(map[string]idempotencyEntry),
		ttl:     ttl,
		clock:   time.Now,
	}
}

func (c *IdempotencyCache) Lookup(ns types.Namespace, wfID types.WorkflowID, key string) (types.Execution, bool) {
	if key == "" {
		return types.Execution{}, false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.entries[c.key(ns, wfID, key)]
	if !ok {
		return types.Execution{}, false
	}
	if c.ttl > 0 && c.clock().After(e.expires) {
		delete(c.entries, c.key(ns, wfID, key))
		return types.Execution{}, false
	}
	return e.exec, true
}

func (c *IdempotencyCache) Remember(ns types.Namespace, wfID types.WorkflowID, key string, exec types.Execution) {
	if key == "" {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	exp := time.Time{}
	if c.ttl > 0 {
		exp = c.clock().Add(c.ttl)
	}
	c.entries[c.key(ns, wfID, key)] = idempotencyEntry{exec: exec, expires: exp}
}

func (c *IdempotencyCache) Sweep(ctx context.Context) {
	if c.ttl == 0 {
		return
	}
	now := c.clock()
	c.mu.Lock()
	defer c.mu.Unlock()
	for k, v := range c.entries {
		if v.expires.Before(now) {
			delete(c.entries, k)
		}
	}
}

func (c *IdempotencyCache) key(ns types.Namespace, wfID types.WorkflowID, key string) string {
	h := sha256.New()
	h.Write([]byte(ns))
	h.Write([]byte{0})
	h.Write([]byte(wfID))
	h.Write([]byte{0})
	h.Write([]byte(key))
	return hex.EncodeToString(h.Sum(nil))
}
