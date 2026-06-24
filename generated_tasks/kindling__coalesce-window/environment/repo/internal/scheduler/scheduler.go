// Package scheduler runs periodic tasks with optional jitter.
//
// The scheduler is intentionally cooperative: callers provide a Run
// method that blocks for the duration of one tick. Long-running ticks
// stretch the schedule rather than queueing up overlapping invocations.
package scheduler

import (
	"context"
	"math/rand"
	"sync"
	"time"
)

// Task is one scheduled job.
type Task struct {
	Name     string
	Interval time.Duration
	Jitter   time.Duration
	Run      func(ctx context.Context) error
	OnError  func(error)
}

// Scheduler runs a set of Tasks until ctx is cancelled.
type Scheduler struct {
	mu    sync.Mutex
	tasks []Task
	now   func() time.Time
	rng   *rand.Rand
}

// New constructs a Scheduler.
func New(seed int64) *Scheduler {
	return &Scheduler{
		now: time.Now,
		rng: rand.New(rand.NewSource(seed)),
	}
}

// SetClock overrides the time source.
func (s *Scheduler) SetClock(fn func() time.Time) { s.now = fn }

// Add registers a task.
func (s *Scheduler) Add(t Task) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tasks = append(s.tasks, t)
}

// Run runs the scheduler until ctx is cancelled. Each task runs in its
// own goroutine; the function returns when all tasks have stopped.
func (s *Scheduler) Run(ctx context.Context) {
	s.mu.Lock()
	tasks := append([]Task(nil), s.tasks...)
	s.mu.Unlock()
	var wg sync.WaitGroup
	for _, t := range tasks {
		wg.Add(1)
		go func(task Task) {
			defer wg.Done()
			s.loop(ctx, task)
		}(t)
	}
	wg.Wait()
}

func (s *Scheduler) loop(ctx context.Context, t Task) {
	for {
		next := t.Interval
		if t.Jitter > 0 {
			s.mu.Lock()
			j := time.Duration(s.rng.Int63n(int64(t.Jitter)))
			s.mu.Unlock()
			next += j - t.Jitter/2
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(next):
		}
		if err := t.Run(ctx); err != nil && t.OnError != nil {
			t.OnError(err)
		}
	}
}

// Names lists registered task names.
func (s *Scheduler) Names() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]string, len(s.tasks))
	for i, t := range s.tasks {
		out[i] = t.Name
	}
	return out
}
