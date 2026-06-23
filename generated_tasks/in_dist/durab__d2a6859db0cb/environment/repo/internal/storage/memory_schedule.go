package storage

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/pkg/types"
)

// schedule lives in memory.go's Memory struct but the methods are split out
// so each storage feature lives in its own file.

type scheduleKey struct {
	ns types.Namespace
	id string
}

// schedules is added to Memory lazily via a one-time initializer to keep
// the zero value usable.
func (m *Memory) ensureSchedules() {
	if m.scheds == nil {
		m.scheds = make(map[scheduleKey]*Schedule)
	}
}

func (m *Memory) CreateSchedule(_ context.Context, sc Schedule) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ensureSchedules()
	if sc.Namespace == "" {
		sc.Namespace = types.DefaultNamespace
	}
	k := scheduleKey{ns: sc.Namespace, id: sc.ID}
	if _, ok := m.scheds[k]; ok {
		return fmt.Errorf("%w: schedule %s", errs.AlreadyExists, sc.ID)
	}
	if sc.Created.IsZero() {
		sc.Created = m.now.Now()
	}
	cp := sc
	m.scheds[k] = &cp
	return nil
}

func (m *Memory) GetSchedule(_ context.Context, ns types.Namespace, id string) (Schedule, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ensureSchedules()
	if ns == "" {
		ns = types.DefaultNamespace
	}
	sc, ok := m.scheds[scheduleKey{ns: ns, id: id}]
	if !ok {
		return Schedule{}, fmt.Errorf("%w: schedule %s", errs.NotFound, id)
	}
	return *sc, nil
}

func (m *Memory) DeleteSchedule(_ context.Context, ns types.Namespace, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ensureSchedules()
	if ns == "" {
		ns = types.DefaultNamespace
	}
	k := scheduleKey{ns: ns, id: id}
	if _, ok := m.scheds[k]; !ok {
		return fmt.Errorf("%w: schedule %s", errs.NotFound, id)
	}
	delete(m.scheds, k)
	return nil
}

func (m *Memory) UpdateScheduleRun(_ context.Context, ns types.Namespace, id string, lastRun, nextRun time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ensureSchedules()
	if ns == "" {
		ns = types.DefaultNamespace
	}
	sc, ok := m.scheds[scheduleKey{ns: ns, id: id}]
	if !ok {
		return fmt.Errorf("%w: schedule %s", errs.NotFound, id)
	}
	sc.LastRun = lastRun
	sc.NextRun = nextRun
	return nil
}

func (m *Memory) PauseSchedule(_ context.Context, ns types.Namespace, id string, paused bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ensureSchedules()
	if ns == "" {
		ns = types.DefaultNamespace
	}
	sc, ok := m.scheds[scheduleKey{ns: ns, id: id}]
	if !ok {
		return fmt.Errorf("%w: schedule %s", errs.NotFound, id)
	}
	sc.Paused = paused
	return nil
}

func (m *Memory) ListSchedules(_ context.Context, ns types.Namespace) ([]Schedule, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ensureSchedules()
	var out []Schedule
	for k, sc := range m.scheds {
		if ns != "" && k.ns != ns {
			continue
		}
		out = append(out, *sc)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out, nil
}

func (m *Memory) DueSchedules(_ context.Context, now time.Time, limit int) ([]Schedule, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ensureSchedules()
	var out []Schedule
	for _, sc := range m.scheds {
		if sc.Paused {
			continue
		}
		if sc.NextRun.IsZero() || sc.NextRun.After(now) {
			continue
		}
		out = append(out, *sc)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].NextRun.Before(out[j].NextRun) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}
