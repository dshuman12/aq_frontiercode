// Package audit2 records administrative actions to an immutable audit
// trail. Each entry is JSON-encoded with a chained SHA-256 hash so that
// tampering with prior entries breaks the chain.
package audit2

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sync"
	"time"
)

// Entry is one audit record.
type Entry struct {
	Seq    uint64            `json:"seq"`
	Time   time.Time         `json:"time"`
	Actor  string            `json:"actor"`
	Action string            `json:"action"`
	Target string            `json:"target,omitempty"`
	Meta   map[string]string `json:"meta,omitempty"`
	Prev   string            `json:"prev"`
	Hash   string            `json:"hash"`
}

// Trail is an append-only audit trail.
type Trail struct {
	mu      sync.Mutex
	entries []Entry
	now     func() time.Time
}

// NewTrail constructs an empty trail.
func NewTrail() *Trail { return &Trail{now: time.Now} }

// SetClock overrides the time source.
func (t *Trail) SetClock(fn func() time.Time) { t.now = fn }

// Append adds an entry.
func (t *Trail) Append(actor, action, target string, meta map[string]string) (Entry, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	prev := ""
	if len(t.entries) > 0 {
		prev = t.entries[len(t.entries)-1].Hash
	}
	e := Entry{
		Seq:    uint64(len(t.entries) + 1),
		Time:   t.now(),
		Actor:  actor,
		Action: action,
		Target: target,
		Meta:   meta,
		Prev:   prev,
	}
	body, err := json.Marshal(struct {
		Seq    uint64
		Time   time.Time
		Actor  string
		Action string
		Target string
		Meta   map[string]string
		Prev   string
	}{e.Seq, e.Time, e.Actor, e.Action, e.Target, e.Meta, e.Prev})
	if err != nil {
		return Entry{}, err
	}
	h := sha256.Sum256(body)
	e.Hash = hex.EncodeToString(h[:])
	t.entries = append(t.entries, e)
	return e, nil
}

// Verify walks the trail confirming each entry's hash chain.
func (t *Trail) Verify() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	prev := ""
	for i, e := range t.entries {
		if e.Prev != prev {
			return errors.New("audit2: prev hash mismatch at seq " + sprint(uint64(i+1)))
		}
		body, err := json.Marshal(struct {
			Seq    uint64
			Time   time.Time
			Actor  string
			Action string
			Target string
			Meta   map[string]string
			Prev   string
		}{e.Seq, e.Time, e.Actor, e.Action, e.Target, e.Meta, e.Prev})
		if err != nil {
			return err
		}
		h := sha256.Sum256(body)
		if hex.EncodeToString(h[:]) != e.Hash {
			return errors.New("audit2: hash mismatch at seq " + sprint(uint64(i+1)))
		}
		prev = e.Hash
	}
	return nil
}

// Snapshot returns a copy of all entries.
func (t *Trail) Snapshot() []Entry {
	t.mu.Lock()
	defer t.mu.Unlock()
	out := make([]Entry, len(t.entries))
	copy(out, t.entries)
	return out
}

// Len reports the entry count.
func (t *Trail) Len() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	return len(t.entries)
}

func sprint(v uint64) string {
	if v == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
	}
	return string(buf[i:])
}
