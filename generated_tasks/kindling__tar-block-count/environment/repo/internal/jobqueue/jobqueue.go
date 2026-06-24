// Package jobqueue implements an in-memory durable job queue used by
// kindling's background workers. Jobs flow through enqueued -> running
// -> done | failed states with bounded retries and visibility timeouts
// so a crashed worker's job becomes available again.
package jobqueue

import (
	"errors"
	"sort"
	"sync"
	"time"
)

// State of a job.
type State int

const (
	StateEnqueued State = iota
	StateRunning
	StateDone
	StateFailed
)

func (s State) String() string {
	switch s {
	case StateEnqueued:
		return "enqueued"
	case StateRunning:
		return "running"
	case StateDone:
		return "done"
	case StateFailed:
		return "failed"
	}
	return "unknown"
}

// Job is one unit of work.
type Job struct {
	ID          uint64
	Kind        string
	Payload     []byte
	State       State
	Attempts    int
	MaxAttempts int
	EnqueuedAt  time.Time
	StartedAt   time.Time
	FinishedAt  time.Time
	NextAfter   time.Time
	LastError   string
}

// Queue is the in-memory queue.
type Queue struct {
	mu     sync.Mutex
	jobs   map[uint64]*Job
	nextID uint64
	now    func() time.Time
}

// New constructs an empty Queue.
func New() *Queue {
	return &Queue{jobs: map[uint64]*Job{}, now: time.Now}
}

// SetClock overrides the time source.
func (q *Queue) SetClock(fn func() time.Time) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.now = fn
}

// Enqueue registers a job for kind and returns its id.
func (q *Queue) Enqueue(kind string, payload []byte, maxAttempts int) uint64 {
	if maxAttempts <= 0 {
		maxAttempts = 3
	}
	q.mu.Lock()
	defer q.mu.Unlock()
	q.nextID++
	id := q.nextID
	now := q.now()
	q.jobs[id] = &Job{
		ID:          id,
		Kind:        kind,
		Payload:     payload,
		State:       StateEnqueued,
		MaxAttempts: maxAttempts,
		EnqueuedAt:  now,
		NextAfter:   now,
	}
	return id
}

// Take returns a runnable job for kind, or ErrEmpty.
func (q *Queue) Take(kind string, visibility time.Duration) (*Job, error) {
	q.mu.Lock()
	defer q.mu.Unlock()
	now := q.now()
	keys := q.sortedKeysLocked()
	for _, k := range keys {
		j := q.jobs[k]
		if j.Kind != kind {
			continue
		}
		switch j.State {
		case StateEnqueued:
			if !j.NextAfter.After(now) {
				j.State = StateRunning
				j.StartedAt = now
				j.NextAfter = now.Add(visibility)
				j.Attempts++
				return j, nil
			}
		case StateRunning:
			if j.NextAfter.Before(now) {
				// visibility expired; reclaim
				j.StartedAt = now
				j.NextAfter = now.Add(visibility)
				j.Attempts++
				return j, nil
			}
		}
	}
	return nil, ErrEmpty
}

// ErrEmpty is returned when there is no eligible job.
var ErrEmpty = errors.New("jobqueue: empty")

// Complete marks the job as done.
func (q *Queue) Complete(id uint64) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	j, ok := q.jobs[id]
	if !ok {
		return errors.New("jobqueue: unknown job")
	}
	j.State = StateDone
	j.FinishedAt = q.now()
	return nil
}

// Fail marks the job as failed; if attempts remain it requeues with
// backoff = base * 2^(attempts-1).
func (q *Queue) Fail(id uint64, err error, base time.Duration) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	j, ok := q.jobs[id]
	if !ok {
		return errors.New("jobqueue: unknown job")
	}
	j.LastError = err.Error()
	if j.Attempts >= j.MaxAttempts {
		j.State = StateFailed
		j.FinishedAt = q.now()
		return nil
	}
	delay := base
	for i := 1; i < j.Attempts; i++ {
		delay *= 2
	}
	j.State = StateEnqueued
	j.NextAfter = q.now().Add(delay)
	return nil
}

// Get returns the job by id.
func (q *Queue) Get(id uint64) (*Job, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	j, ok := q.jobs[id]
	if !ok {
		return nil, false
	}
	out := *j
	return &out, true
}

// Stats summarises counts by state.
type Stats struct {
	Enqueued, Running, Done, Failed int
}

// Stats reports counts.
func (q *Queue) Stats() Stats {
	q.mu.Lock()
	defer q.mu.Unlock()
	var s Stats
	for _, j := range q.jobs {
		switch j.State {
		case StateEnqueued:
			s.Enqueued++
		case StateRunning:
			s.Running++
		case StateDone:
			s.Done++
		case StateFailed:
			s.Failed++
		}
	}
	return s
}

func (q *Queue) sortedKeysLocked() []uint64 {
	keys := make([]uint64, 0, len(q.jobs))
	for k := range q.jobs {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool { return keys[i] < keys[j] })
	return keys
}
