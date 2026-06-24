// Package replicationv2 implements a leader-follower replication channel
// over an arbitrary transport. It is the spiritual successor of
// internal/replication, with explicit lag bookkeeping and configurable
// catch-up batching.
package replicationv2

import (
	"context"
	"errors"
	"sort"
	"sync"
	"time"
)

// Entry is one replicated record.
type Entry struct {
	Seq     uint64
	Time    time.Time
	Payload []byte
}

// Transport ships a batch of entries to a follower.
type Transport func(ctx context.Context, follower string, entries []Entry) error

// Leader is the producer side.
type Leader struct {
	mu        sync.Mutex
	log       []Entry
	nextSeq   uint64
	transport Transport
	now       func() time.Time
	maxBatch  int

	followers map[string]*followerState
}

type followerState struct {
	name     string
	lastSeq  uint64
	lastSync time.Time
	failures int
}

// Stats summarises a follower's catch-up state.
type Stats struct {
	Name     string
	LastSeq  uint64
	Lag      uint64
	LastSync time.Time
	Failures int
}

// NewLeader constructs a Leader.
func NewLeader(transport Transport, maxBatch int) *Leader {
	if maxBatch <= 0 {
		maxBatch = 100
	}
	return &Leader{
		transport: transport,
		maxBatch:  maxBatch,
		now:       time.Now,
		followers: map[string]*followerState{},
	}
}

// SetClock overrides the time source.
func (l *Leader) SetClock(fn func() time.Time) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.now = fn
}

// Append registers a new payload and returns its sequence.
func (l *Leader) Append(payload []byte) uint64 {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.nextSeq++
	l.log = append(l.log, Entry{Seq: l.nextSeq, Time: l.now(), Payload: payload})
	return l.nextSeq
}

// AddFollower registers a follower starting from after.
func (l *Leader) AddFollower(name string, after uint64) error {
	if name == "" {
		return errors.New("replicationv2: follower name required")
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.followers[name] = &followerState{name: name, lastSeq: after}
	return nil
}

// RemoveFollower drops a follower.
func (l *Leader) RemoveFollower(name string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.followers, name)
}

// Followers returns Stats for each follower sorted by name.
func (l *Leader) Followers() []Stats {
	l.mu.Lock()
	defer l.mu.Unlock()
	out := make([]Stats, 0, len(l.followers))
	for _, f := range l.followers {
		lag := l.nextSeq - f.lastSeq
		out = append(out, Stats{Name: f.name, LastSeq: f.lastSeq, Lag: lag, LastSync: f.lastSync, Failures: f.failures})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

// CatchUp ships pending entries to every follower.
func (l *Leader) CatchUp(ctx context.Context) error {
	l.mu.Lock()
	followers := make([]*followerState, 0, len(l.followers))
	for _, f := range l.followers {
		followers = append(followers, f)
	}
	logCopy := append([]Entry(nil), l.log...)
	maxBatch := l.maxBatch
	now := l.now
	l.mu.Unlock()

	for _, f := range followers {
		batch := pendingFor(logCopy, f.lastSeq, maxBatch)
		if len(batch) == 0 {
			continue
		}
		if err := l.transport(ctx, f.name, batch); err != nil {
			l.mu.Lock()
			f.failures++
			l.mu.Unlock()
			return err
		}
		l.mu.Lock()
		f.lastSeq = batch[len(batch)-1].Seq
		f.lastSync = now()
		l.mu.Unlock()
	}
	return nil
}

func pendingFor(entries []Entry, after uint64, max int) []Entry {
	idx := sort.Search(len(entries), func(i int) bool { return entries[i].Seq > after })
	end := idx + max
	if end > len(entries) {
		end = len(entries)
	}
	return entries[idx:end]
}

// LogLen returns the leader's log length.
func (l *Leader) LogLen() int {
	l.mu.Lock()
	defer l.mu.Unlock()
	return len(l.log)
}

// Truncate drops entries with seq <= cutoff (must be <= every follower's lastSeq).
func (l *Leader) Truncate(cutoff uint64) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	for _, f := range l.followers {
		if f.lastSeq < cutoff {
			return errors.New("replicationv2: follower behind cutoff")
		}
	}
	idx := sort.Search(len(l.log), func(i int) bool { return l.log[i].Seq > cutoff })
	l.log = append(l.log[:0], l.log[idx:]...)
	return nil
}
