// Package engine is the coordinator. It does NOT run WASM; it manages the
// state machine of every workflow (start, history append, task scheduling,
// timer firing, completion) and exposes that state to workers and to the
// public API.
//
// Concurrency model: callers run engine methods from goroutines. The engine
// uses a per-run lock (sharded by Execution) to serialise state changes for
// a single run; cross-run operations are lock-free.
package engine

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/ids"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

// Engine is the durable state machine for all workflows in this server.
type Engine struct {
	store storage.Store
	clock clock.Clock
	log   *log.Logger

	mu    sync.Mutex
	locks map[types.Execution]*sync.Mutex

	met       metricsHooks
	idemCache *IdempotencyCache

	hbOnce sync.Once
	hb     *heartbeats
}

// metricsHooks gathers all counters/gauges/histograms the engine emits.
// They are nil-safe so production code can call them without a guard; the
// nil receivers below absorb the call.
type metricsHooks struct {
	wfStarted     interface{ Inc() }
	wfCompleted   interface{ Inc() }
	wfFailed      interface{ Inc() }
	signalsTotal  interface{ Inc() }
	tasksEnqueued interface{ Inc() }
	tasksLeased   interface{ Inc() }
	tasksRetried  interface{ Inc() }
}

// MetricsHooks lets callers wire counters in. The engine treats every field
// as optional.
type MetricsHooks struct {
	WorkflowsStarted   interface{ Inc() }
	WorkflowsCompleted interface{ Inc() }
	WorkflowsFailed    interface{ Inc() }
	SignalsTotal       interface{ Inc() }
	TasksEnqueued      interface{ Inc() }
	TasksLeased        interface{ Inc() }
	TasksRetried       interface{ Inc() }
}

// SetIdempotencyCache installs an idempotency cache for StartWorkflow.
// Pass nil to disable.
func (e *Engine) SetIdempotencyCache(c *IdempotencyCache) { e.idemCache = c }

// SetMetrics installs metric hooks. Nil fields disable the corresponding
// metric.
func (e *Engine) SetMetrics(h MetricsHooks) {
	e.met = metricsHooks{
		wfStarted:     h.WorkflowsStarted,
		wfCompleted:   h.WorkflowsCompleted,
		wfFailed:      h.WorkflowsFailed,
		signalsTotal:  h.SignalsTotal,
		tasksEnqueued: h.TasksEnqueued,
		tasksLeased:   h.TasksLeased,
		tasksRetried:  h.TasksRetried,
	}
}

func (m metricsHooks) inc(c interface{ Inc() }) {
	if c != nil {
		c.Inc()
	}
}

// New returns an Engine backed by store. clk is used for all time-based
// decisions; pass clock.System{} in production.
func New(store storage.Store, clk clock.Clock, lg *log.Logger) *Engine {
	if lg == nil {
		lg = log.Default
	}
	if clk == nil {
		clk = clock.System{}
	}
	return &Engine{
		store: store,
		clock: clk,
		log:   lg,
		locks: make(map[types.Execution]*sync.Mutex),
	}
}

// lockFor returns the per-Execution mutex, creating it on first use.
// Callers MUST defer Unlock; the engine never holds two run-locks at once.
func (e *Engine) lockFor(exec types.Execution) *sync.Mutex {
	e.mu.Lock()
	l, ok := e.locks[exec]
	if !ok {
		l = &sync.Mutex{}
		e.locks[exec] = l
	}
	e.mu.Unlock()
	return l
}

// StartRequest is the input to StartWorkflow.
type StartRequest struct {
	Namespace      types.Namespace
	WorkflowID     types.WorkflowID
	WorkflowType   string
	TaskQueue      types.TaskQueue
	Input          types.Payload
	Options        types.WorkflowOptions
	// IdempotencyKey, when non-empty, dedupes repeated start requests for
	// the same (namespace, workflow_id, key). The previously-assigned
	// Execution is returned without creating a new run.
	IdempotencyKey string
}

// StartWorkflow creates a new run and enqueues the initial decision task.
// Returns the assigned Execution (workflow id + new run id).
func (e *Engine) StartWorkflow(ctx context.Context, req StartRequest) (types.Execution, error) {
	if req.WorkflowID == "" {
		return types.Execution{}, fmt.Errorf("%w: workflow_id is required", errs.Invalid)
	}
	if req.WorkflowType == "" {
		return types.Execution{}, fmt.Errorf("%w: workflow_type is required", errs.Invalid)
	}
	if req.Namespace == "" {
		req.Namespace = types.DefaultNamespace
	}
	if req.TaskQueue == "" {
		req.TaskQueue = "default"
	}

	if e.idemCache != nil {
		if exec, ok := e.idemCache.Lookup(req.Namespace, req.WorkflowID, req.IdempotencyKey); ok {
			return exec, nil
		}
	}

	exec := types.Execution{
		WorkflowID: req.WorkflowID,
		RunID:      types.RunID(ids.NewRun()),
	}
	mu := e.lockFor(exec)
	mu.Lock()
	defer mu.Unlock()

	rec := storage.WorkflowRecord{
		Namespace:    req.Namespace,
		Execution:    exec,
		WorkflowType: req.WorkflowType,
		TaskQueue:    req.TaskQueue,
		Status:       types.WorkflowRunning,
		StartTime:    e.clock.Now(),
		SearchAttrs:  req.Options.SearchAttrs,
		Memo:         req.Options.Memo,
	}
	if err := e.store.CreateWorkflow(ctx, rec); err != nil {
		return types.Execution{}, err
	}

	startEv := history.Event{Kind: history.WorkflowStarted, Workflow: exec, Namespace: req.Namespace, Time: e.clock.Now()}
	if err := startEv.Encode(&history.WorkflowStartedAttrs{
		WorkflowType: req.WorkflowType,
		TaskQueue:    req.TaskQueue,
		Input:        req.Input,
		Retry:        req.Options.Retry,
		RunTimeout:   req.Options.RunTimeout,
		SearchAttrs:  req.Options.SearchAttrs,
		Memo:         req.Options.Memo,
	}); err != nil {
		return types.Execution{}, err
	}
	if _, err := e.store.AppendEvents(ctx, exec, []history.Event{startEv}); err != nil {
		return types.Execution{}, err
	}

	if _, err := e.store.EnqueueTask(ctx, storage.Task{
		Kind:      storage.TaskDecision,
		Namespace: req.Namespace,
		TaskQueue: req.TaskQueue,
		Execution: exec,
	}); err != nil {
		return types.Execution{}, err
	}
	e.met.inc(e.met.wfStarted)
	e.met.inc(e.met.tasksEnqueued)
	if e.idemCache != nil {
		e.idemCache.Remember(req.Namespace, req.WorkflowID, req.IdempotencyKey, exec)
	}
	e.log.Info(ctx, "workflow started", "exec", exec.String(), "type", req.WorkflowType)
	return exec, nil
}

// DescribeWorkflow returns the latest state of a run.
func (e *Engine) DescribeWorkflow(ctx context.Context, ns types.Namespace, exec types.Execution) (types.Info, error) {
	r, err := e.store.GetWorkflow(ctx, ns, exec)
	if err != nil {
		return types.Info{}, err
	}
	last, _ := e.store.LastEventID(ctx, exec)
	return types.Info{
		Execution:     exec,
		Namespace:     ns,
		TaskQueue:     r.TaskQueue,
		WorkflowType:  r.WorkflowType,
		StartTime:     r.StartTime,
		CloseTime:     r.CloseTime,
		Status:        r.Status,
		HistoryLength: int(last),
		Attempt:       r.Attempt,
		ParentExec:    r.Parent,
	}, nil
}

// SignalWorkflow appends a SignalReceived event and enqueues a decision task.
func (e *Engine) SignalWorkflow(ctx context.Context, ns types.Namespace, exec types.Execution, name string, input types.Payload) error {
	mu := e.lockFor(exec)
	mu.Lock()
	defer mu.Unlock()
	rec, err := e.store.GetWorkflow(ctx, ns, exec)
	if err != nil {
		return err
	}
	if rec.Status.IsTerminal() {
		return fmt.Errorf("%w: workflow %s is %s", errs.Conflict, exec, rec.Status)
	}
	ev := history.Event{Kind: history.SignalReceived, Workflow: exec, Namespace: ns, Time: e.clock.Now()}
	if err := ev.Encode(&history.SignalReceivedAttrs{Name: name, Input: input}); err != nil {
		return err
	}
	if _, err := e.store.AppendEvents(ctx, exec, []history.Event{ev}); err != nil {
		return err
	}
	_, err = e.store.EnqueueTask(ctx, storage.Task{
		Kind:      storage.TaskDecision,
		Namespace: ns,
		TaskQueue: rec.TaskQueue,
		Execution: exec,
	})
	if err == nil {
		e.met.inc(e.met.signalsTotal)
		e.met.inc(e.met.tasksEnqueued)
	}
	return err
}

// CancelWorkflow records a cancellation request. The workflow itself
// decides how to react (typically by completing with a cancel result).
func (e *Engine) CancelWorkflow(ctx context.Context, ns types.Namespace, exec types.Execution) error {
	return e.SignalWorkflow(ctx, ns, exec, "__cancel__", types.Payload{})
}

// TerminateWorkflow forcibly closes the run. No more events will be
// recorded; in-flight activity results are discarded on receipt.
func (e *Engine) TerminateWorkflow(ctx context.Context, ns types.Namespace, exec types.Execution, reason string) error {
	mu := e.lockFor(exec)
	mu.Lock()
	defer mu.Unlock()
	rec, err := e.store.GetWorkflow(ctx, ns, exec)
	if err != nil {
		return err
	}
	if rec.Status.IsTerminal() {
		return nil
	}
	ev := history.Event{Kind: history.WorkflowCanceledKind, Workflow: exec, Namespace: ns, Time: e.clock.Now()}
	if err := ev.Encode(&history.WorkflowFailedAttrs{Failure: &types.Failure{
		Type: types.FailureTerminated, Message: reason,
	}}); err != nil {
		return err
	}
	if _, err := e.store.AppendEvents(ctx, exec, []history.Event{ev}); err != nil {
		return err
	}
	return e.store.UpdateWorkflowStatus(ctx, ns, exec, types.WorkflowTerminated, e.clock.Now())
}

// GetHistory returns the events for exec within (fromID, toID]. Zero
// values mean "from beginning" / "until end".
func (e *Engine) GetHistory(ctx context.Context, exec types.Execution, fromID, toID int64) ([]history.Event, error) {
	return e.store.GetHistory(ctx, exec, history.EventID(fromID), history.EventID(toID))
}

// ListWorkflows is a thin pass-through with filter validation.
func (e *Engine) ListWorkflows(ctx context.Context, f storage.WorkflowFilter) ([]types.Info, error) {
	rs, err := e.store.ListWorkflows(ctx, f)
	if err != nil {
		return nil, err
	}
	out := make([]types.Info, 0, len(rs))
	for _, r := range rs {
		out = append(out, types.Info{
			Execution:    r.Execution,
			Namespace:    r.Namespace,
			TaskQueue:    r.TaskQueue,
			WorkflowType: r.WorkflowType,
			StartTime:    r.StartTime,
			CloseTime:    r.CloseTime,
			Status:       r.Status,
			Attempt:      r.Attempt,
			ParentExec:   r.Parent,
		})
	}
	return out, nil
}

var _ = decision.KindCompleteWorkflow
var _ = time.Second
