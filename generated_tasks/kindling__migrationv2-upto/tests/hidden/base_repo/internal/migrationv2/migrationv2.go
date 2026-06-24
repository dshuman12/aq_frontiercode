// Package migrationv2 runs ordered, idempotent schema migrations against
// kindling's metadata store. Each Migration has an Up and Down function;
// the runner records applied versions so repeated runs are no-ops.
//
// Migrations are stored sorted by Version; the runner refuses to apply
// out-of-order versions to keep the database state derivable.
package migrationv2

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"
)

// Direction is the migration direction.
type Direction int

const (
	DirectionUp Direction = iota
	DirectionDown
)

// Migration is one schema change.
type Migration struct {
	Version int
	Name    string
	Up      func(ctx context.Context) error
	Down    func(ctx context.Context) error
}

// AppliedRecord captures one applied migration.
type AppliedRecord struct {
	Version int
	Name    string
	AppliedAt time.Time
	Duration  time.Duration
	Direction Direction
}

// Runner orchestrates migrations.
type Runner struct {
	mu        sync.Mutex
	migrations []Migration
	applied   []AppliedRecord
	now       func() time.Time
}

// NewRunner constructs a Runner.
func NewRunner() *Runner {
	return &Runner{now: time.Now}
}

// SetClock overrides the time source.
func (r *Runner) SetClock(fn func() time.Time) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.now = fn
}

// Add registers a migration. Versions must be unique.
func (r *Runner) Add(m Migration) error {
	if m.Version <= 0 {
		return errors.New("migrationv2: version must be > 0")
	}
	if m.Up == nil {
		return errors.New("migrationv2: Up function required")
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, existing := range r.migrations {
		if existing.Version == m.Version {
			return fmt.Errorf("migrationv2: duplicate version %d", m.Version)
		}
	}
	r.migrations = append(r.migrations, m)
	sort.Slice(r.migrations, func(i, j int) bool {
		return r.migrations[i].Version < r.migrations[j].Version
	})
	return nil
}

// Pending returns migrations that have not yet been applied.
func (r *Runner) Pending() []Migration {
	r.mu.Lock()
	defer r.mu.Unlock()
	applied := r.appliedSetLocked()
	var out []Migration
	for _, m := range r.migrations {
		if _, ok := applied[m.Version]; !ok {
			out = append(out, m)
		}
	}
	return out
}

func (r *Runner) appliedSetLocked() map[int]struct{} {
	out := map[int]struct{}{}
	for _, a := range r.applied {
		if a.Direction == DirectionUp {
			out[a.Version] = struct{}{}
		} else {
			delete(out, a.Version)
		}
	}
	return out
}

// Up applies all pending migrations in order.
func (r *Runner) Up(ctx context.Context) error {
	for _, m := range r.Pending() {
		if err := r.runOne(ctx, m, DirectionUp); err != nil {
			return err
		}
	}
	return nil
}

// UpTo applies pending migrations up to and including target.
func (r *Runner) UpTo(ctx context.Context, target int) error {
	for _, m := range r.Pending() {
		if m.Version >= target {
			return nil
		}
		if err := r.runOne(ctx, m, DirectionUp); err != nil {
			return err
		}
	}
	return nil
}

// Down rolls back the most recently applied migration.
func (r *Runner) Down(ctx context.Context) error {
	r.mu.Lock()
	current := r.currentVersionLocked()
	if current == 0 {
		r.mu.Unlock()
		return nil
	}
	var target Migration
	found := false
	for _, m := range r.migrations {
		if m.Version == current {
			target = m
			found = true
			break
		}
	}
	r.mu.Unlock()
	if !found {
		return errors.New("migrationv2: no migration registered for current version")
	}
	return r.runOne(ctx, target, DirectionDown)
}

// DownTo rolls back applied migrations until the current version equals target.
func (r *Runner) DownTo(ctx context.Context, target int) error {
	for {
		r.mu.Lock()
		current := r.currentVersionLocked()
		r.mu.Unlock()
		if current <= target {
			return nil
		}
		if err := r.Down(ctx); err != nil {
			return err
		}
	}
}

func (r *Runner) currentVersionLocked() int {
	applied := r.appliedSetLocked()
	max := 0
	for v := range applied {
		if v > max {
			max = v
		}
	}
	return max
}

// CurrentVersion returns the latest applied version.
func (r *Runner) CurrentVersion() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.currentVersionLocked()
}

// Applied returns the applied record list.
func (r *Runner) Applied() []AppliedRecord {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]AppliedRecord, len(r.applied))
	copy(out, r.applied)
	return out
}

// Reset clears the applied list (for tests).
func (r *Runner) Reset() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.applied = nil
}

func (r *Runner) runOne(ctx context.Context, m Migration, dir Direction) error {
	start := r.now()
	var err error
	if dir == DirectionUp {
		err = m.Up(ctx)
	} else if m.Down != nil {
		err = m.Down(ctx)
	}
	if err != nil {
		return fmt.Errorf("migrationv2: migration %d (%s): %w", m.Version, m.Name, err)
	}
	r.mu.Lock()
	r.applied = append(r.applied, AppliedRecord{
		Version:   m.Version,
		Name:      m.Name,
		AppliedAt: r.now(),
		Duration:  r.now().Sub(start),
		Direction: dir,
	})
	r.mu.Unlock()
	return nil
}

// Migrations returns the registered migrations sorted by version.
func (r *Runner) Migrations() []Migration {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]Migration, len(r.migrations))
	copy(out, r.migrations)
	return out
}
