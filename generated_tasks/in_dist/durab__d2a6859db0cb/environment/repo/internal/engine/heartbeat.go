package engine

import (
	"context"
	"sync"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

// heartbeats tracks the last heartbeat per outstanding activity attempt.
// It lives in-process and is rebuilt from history on engine restart — the
// engine never persists per-heartbeat data.
type heartbeats struct {
	mu sync.Mutex
	// keyed by (Execution, ActivityID).
	last map[heartbeatKey]heartbeatRecord
}

type heartbeatKey struct {
	exec types.Execution
	aid  types.ActivityID
}

type heartbeatRecord struct {
	At      time.Time
	Details []byte
}

// RecordHeartbeat is called by workers when an activity emits one. It
// updates the in-memory record so subsequent ActivityHeartbeatInfo calls
// can read it.
func (e *Engine) RecordHeartbeat(_ context.Context, exec types.Execution, aid types.ActivityID, details []byte) {
	e.hbOnce.Do(func() {
		e.hb = &heartbeats{last: make(map[heartbeatKey]heartbeatRecord)}
	})
	e.hb.mu.Lock()
	defer e.hb.mu.Unlock()
	e.hb.last[heartbeatKey{exec: exec, aid: aid}] = heartbeatRecord{
		At:      e.clock.Now(),
		Details: append([]byte(nil), details...),
	}
}

// LastHeartbeat returns the most recently recorded heartbeat for an
// activity attempt. The second return is false if none have been recorded.
func (e *Engine) LastHeartbeat(exec types.Execution, aid types.ActivityID) (time.Time, []byte, bool) {
	e.hbOnce.Do(func() {
		e.hb = &heartbeats{last: make(map[heartbeatKey]heartbeatRecord)}
	})
	e.hb.mu.Lock()
	defer e.hb.mu.Unlock()
	rec, ok := e.hb.last[heartbeatKey{exec: exec, aid: aid}]
	if !ok {
		return time.Time{}, nil, false
	}
	out := make([]byte, len(rec.Details))
	copy(out, rec.Details)
	return rec.At, out, true
}
