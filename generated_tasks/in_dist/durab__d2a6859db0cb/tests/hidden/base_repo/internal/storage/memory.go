package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)

// Memory is an in-process Store. It is safe for concurrent use. It is the
// reference implementation: every behaviour the engine relies on is
// expressed here first, and sqlite is required to match. Tests run the same
// suite against both.
type Memory struct {
	mu       sync.Mutex
	now      clock.Clock
	wf       map[wfKey]*WorkflowRecord
	history  map[wfKey][]history.Event
	tasks    map[int64]*memTask
	taskq    []int64
	timers   []DueTimer
	scheds   map[scheduleKey]*Schedule
	taskSeq  int64
}

type wfKey struct {
	ns   types.Namespace
	wfID types.WorkflowID
	run  types.RunID
}

type memTask struct {
	t         Task
	leaseTo   time.Time
	completed bool
}

func NewMemory() *Memory { return NewMemoryWithClock(clock.System{}) }

func NewMemoryWithClock(c clock.Clock) *Memory {
	return &Memory{
		now:     c,
		wf:      map[wfKey]*WorkflowRecord{},
		history: map[wfKey][]history.Event{},
		tasks:   map[int64]*memTask{},
	}
}

func (m *Memory) Close() error { return nil }

func k(r WorkflowRecord) wfKey {
	return wfKey{ns: r.Namespace, wfID: r.Execution.WorkflowID, run: r.Execution.RunID}
}

func ke(ns types.Namespace, e types.Execution) wfKey {
	return wfKey{ns: ns, wfID: e.WorkflowID, run: e.RunID}
}

// --- WorkflowStore ---

func (m *Memory) CreateWorkflow(_ context.Context, w WorkflowRecord) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.wf[k(w)]; ok {
		return fmt.Errorf("%w: %s", errs.AlreadyExists, w.Execution)
	}
	if w.Status == "" {
		w.Status = types.WorkflowRunning
	}
	if w.StartTime.IsZero() {
		w.StartTime = m.now.Now()
	}
	cp := w
	m.wf[k(w)] = &cp
	return nil
}

func (m *Memory) GetWorkflow(_ context.Context, ns types.Namespace, exec types.Execution) (WorkflowRecord, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	r, ok := m.wf[ke(ns, exec)]
	if !ok {
		return WorkflowRecord{}, fmt.Errorf("%w: %s", errs.NotFound, exec)
	}
	return *r, nil
}

func (m *Memory) UpdateWorkflowStatus(_ context.Context, ns types.Namespace, exec types.Execution, status types.WorkflowStatus, closeAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	r, ok := m.wf[ke(ns, exec)]
	if !ok {
		return fmt.Errorf("%w: %s", errs.NotFound, exec)
	}
	if r.Status.IsTerminal() && r.Status != status {
		return fmt.Errorf("%w: cannot transition from %s to %s", errs.Conflict, r.Status, status)
	}
	r.Status = status
	if status.IsTerminal() && closeAt.IsZero() {
		closeAt = m.now.Now()
	}
	r.CloseTime = closeAt
	return nil
}

func (m *Memory) ListWorkflows(_ context.Context, f WorkflowFilter) ([]WorkflowRecord, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]WorkflowRecord, 0, len(m.wf))
	for _, r := range m.wf {
		if f.Namespace != "" && r.Namespace != f.Namespace {
			continue
		}
		if f.TaskQueue != "" && r.TaskQueue != f.TaskQueue {
			continue
		}
		if f.Status != "" && r.Status != f.Status {
			continue
		}
		if !f.After.IsZero() && r.StartTime.Before(f.After) {
			continue
		}
		if !f.Before.IsZero() && !r.StartTime.Before(f.Before) {
			continue
		}
		if f.SearchAttrKey != "" {
			got, ok := r.SearchAttrs[f.SearchAttrKey]
			if !ok || !attrEqual(got, f.SearchAttrValue) {
				continue
			}
		}
		out = append(out, *r)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartTime.After(out[j].StartTime) })
	if f.Limit > 0 && len(out) > f.Limit {
		out = out[:f.Limit]
	}
	return out, nil
}

// --- HistoryStore ---

func (m *Memory) AppendEvents(_ context.Context, exec types.Execution, events []history.Event) ([]history.Event, error) {
	if len(events) == 0 {
		return nil, nil
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	// resolve ns via workflow record if present; else fall back to default.
	ns := types.DefaultNamespace
	for _, r := range m.wf {
		if r.Execution == exec {
			ns = r.Namespace
			break
		}
	}
	key := ke(ns, exec)
	prev := m.history[key]
	next := history.EventID(len(prev)) + 1
	out := make([]history.Event, len(events))
	for i, e := range events {
		e.ID = next
		next++
		if e.Time.IsZero() {
			e.Time = m.now.Now()
		}
		e.Workflow = exec
		e.Namespace = ns
		out[i] = e
	}
	m.history[key] = append(prev, out...)
	return out, nil
}

func (m *Memory) GetHistory(_ context.Context, exec types.Execution, fromID, toID history.EventID) ([]history.Event, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	// search any namespace; the engine never replays with the wrong ns.
	for key, evs := range m.history {
		if key.wfID != exec.WorkflowID || key.run != exec.RunID {
			continue
		}
		out := make([]history.Event, 0, len(evs))
		for _, e := range evs {
			if fromID > 0 && e.ID < fromID {
				continue
			}
			if toID > 0 && e.ID > toID {
				break
			}
			out = append(out, e)
		}
		return out, nil
	}
	return nil, nil
}

func (m *Memory) LastEventID(_ context.Context, exec types.Execution) (history.EventID, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for key, evs := range m.history {
		if key.wfID == exec.WorkflowID && key.run == exec.RunID {
			if len(evs) == 0 {
				return 0, nil
			}
			return evs[len(evs)-1].ID, nil
		}
	}
	return 0, nil
}

// --- TaskStore ---

func (m *Memory) EnqueueTask(_ context.Context, t Task) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.taskSeq++
	t.ID = m.taskSeq
	if t.VisibleAt.IsZero() {
		t.VisibleAt = m.now.Now()
	}
	m.tasks[t.ID] = &memTask{t: t}
	m.taskq = append(m.taskq, t.ID)
	return t.ID, nil
}

func (m *Memory) DequeueTask(_ context.Context, kind TaskKind, queue types.TaskQueue, workerID string, lease time.Duration) (Task, bool, error) {
	_ = workerID
	m.mu.Lock()
	defer m.mu.Unlock()
	now := m.now.Now()
	for i, id := range m.taskq {
		mt, ok := m.tasks[id]
		if !ok {
			continue
		}
		if mt.completed || mt.t.Kind != kind || mt.t.TaskQueue != queue {
			continue
		}
		if mt.t.VisibleAt.After(now) {
			continue
		}
		if mt.leaseTo.After(now) {
			continue
		}
		mt.leaseTo = now.Add(lease)
		mt.t.Attempts++
		m.taskq = append(m.taskq[:i], m.taskq[i+1:]...)
		m.taskq = append(m.taskq, id)
		return mt.t, true, nil
	}
	return Task{}, false, nil
}

func (m *Memory) CompleteTask(_ context.Context, id int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	mt, ok := m.tasks[id]
	if !ok {
		return fmt.Errorf("%w: task %d", errs.NotFound, id)
	}
	mt.completed = true
	delete(m.tasks, id)
	return nil
}

func (m *Memory) NackTask(_ context.Context, id int64, retryAfter time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	mt, ok := m.tasks[id]
	if !ok {
		return fmt.Errorf("%w: task %d", errs.NotFound, id)
	}
	mt.leaseTo = time.Time{}
	mt.t.VisibleAt = m.now.Now().Add(retryAfter)
	return nil
}

// --- TimerStore ---

func (m *Memory) ScheduleTimer(_ context.Context, exec types.Execution, timerID string, fireAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.timers {
		if t.Execution == exec && t.TimerID == timerID {
			return fmt.Errorf("%w: timer %s/%s", errs.AlreadyExists, exec, timerID)
		}
	}
	ns := types.DefaultNamespace
	for _, r := range m.wf {
		if r.Execution == exec {
			ns = r.Namespace
			break
		}
	}
	m.timers = append(m.timers, DueTimer{Namespace: ns, Execution: exec, TimerID: timerID, FireAt: fireAt})
	return nil
}

func (m *Memory) DueTimers(_ context.Context, now time.Time, limit int) ([]DueTimer, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	sort.Slice(m.timers, func(i, j int) bool { return m.timers[i].FireAt.Before(m.timers[j].FireAt) })
	out := make([]DueTimer, 0)
	for _, t := range m.timers {
		if t.FireAt.After(now) {
			break
		}
		out = append(out, t)
		if limit > 0 && len(out) >= limit {
			break
		}
	}
	return out, nil
}

func (m *Memory) DeleteTimer(_ context.Context, exec types.Execution, timerID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i, t := range m.timers {
		if t.Execution == exec && t.TimerID == timerID {
			m.timers = append(m.timers[:i], m.timers[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("%w: timer %s/%s", errs.NotFound, exec, timerID)
}

// attrEqual compares two search-attribute values. Strings and numbers
// compare via Go ==; anything else round-trips through JSON. JSON
// equality is good enough for the filter shape we support; richer
// queries should grow a real expression layer rather than special-case
// in here.
func attrEqual(a, b any) bool {
	if a == b {
		return true
	}
	aj, _ := jsonMarshal(a)
	bj, _ := jsonMarshal(b)
	return string(aj) == string(bj)
}

// jsonMarshal is an indirection so importing encoding/json at file top
// remains optional in trims.
var jsonMarshal = func(v any) ([]byte, error) {
	return json.Marshal(v)
}

var _ Store = (*Memory)(nil)
