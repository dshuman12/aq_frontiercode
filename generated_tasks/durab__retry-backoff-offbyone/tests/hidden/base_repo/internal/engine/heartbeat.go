package engine

import (
	"context"
	"sync"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

type heartbeats struct {
	mu sync.Mutex

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
