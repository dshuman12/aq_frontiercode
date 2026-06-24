package worker

import (
	"context"
	"sync"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/wasm"
	"github.com/vishaljakhar/durab/pkg/types"
)

type Worker struct {
	id      string
	eng     *engine.Engine
	runtime *wasm.Runtime
	clock   clock.Clock
	log     *log.Logger

	mu         sync.RWMutex
	workflows  map[string]string
	activities map[string]string
}

type Options struct {
	ID    string
	Clock clock.Clock
	Log   *log.Logger
}

func New(eng *engine.Engine, runtime *wasm.Runtime, opts Options) *Worker {
	if opts.Clock == nil {
		opts.Clock = clock.System{}
	}
	if opts.Log == nil {
		opts.Log = log.Default
	}
	if opts.ID == "" {
		opts.ID = "w-" + time.Now().UTC().Format("150405.000")
	}
	return &Worker{
		id:         opts.ID,
		eng:        eng,
		runtime:    runtime,
		clock:      opts.Clock,
		log:        opts.Log,
		workflows:  map[string]string{},
		activities: map[string]string{},
	}
}

func (w *Worker) RegisterWorkflow(ctx context.Context, workflowType string, moduleBytes []byte) error {
	name := "wf:" + workflowType
	if err := w.runtime.Compile(ctx, name, moduleBytes); err != nil {
		return err
	}
	w.mu.Lock()
	w.workflows[workflowType] = name
	w.mu.Unlock()
	return nil
}

func (w *Worker) RegisterActivity(ctx context.Context, activityType string, moduleBytes []byte) error {
	name := "act:" + activityType
	if err := w.runtime.Compile(ctx, name, moduleBytes); err != nil {
		return err
	}
	w.mu.Lock()
	w.activities[activityType] = name
	w.mu.Unlock()
	return nil
}

func (w *Worker) RunOne(ctx context.Context, queue types.TaskQueue) (bool, error) {
	if did, err := w.runOneDecision(ctx, queue); err != nil {
		return did, err
	} else if did {
		return true, nil
	}
	return w.runOneActivity(ctx, queue)
}

func (w *Worker) Run(ctx context.Context, queue types.TaskQueue, interval time.Duration) error {
	return w.RunPool(ctx, queue, 1, interval)
}

func (w *Worker) RunPool(ctx context.Context, queue types.TaskQueue, n int, interval time.Duration) error {
	if n <= 0 {
		n = 1
	}
	if interval <= 0 {
		interval = 100 * time.Millisecond
	}
	errs := make(chan error, n)
	for i := 0; i < n; i++ {
		go func() {
			errs <- w.poll(ctx, queue, interval)
		}()
	}
	var firstErr error
	for i := 0; i < n; i++ {
		if err := <-errs; err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

func (w *Worker) poll(ctx context.Context, queue types.TaskQueue, interval time.Duration) error {
	t := w.clock.NewTimer(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		did, err := w.RunOne(ctx, queue)
		if err != nil {
			w.log.Warn(ctx, "worker iteration", "err", err)
		}
		if !did {
			t.Reset(interval)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-t.C():
			}
		}
	}
}

func (w *Worker) runOneDecision(ctx context.Context, queue types.TaskQueue) (bool, error) {
	task, ok, err := w.eng.PollDecisionTask(ctx, queue, w.id, 30*time.Second)
	if err != nil || !ok {
		return false, err
	}
	w.mu.RLock()
	moduleName, registered := w.workflows[task.WorkflowType]
	w.mu.RUnlock()
	if !registered {
		w.log.Warn(ctx, "no workflow registered", "type", task.WorkflowType)
		return true, w.eng.CompleteDecisionTask(ctx, task.TaskID, task.Execution, []decision.Decision{{
			Kind: decision.KindFailWorkflow,
			FailWorkflow: &decision.FailWorkflow{Failure: &types.Failure{
				Type: types.FailureServer, Message: "no workflow type registered: " + task.WorkflowType,
			}},
		}})
	}

	info := types.Info{
		Execution:     task.Execution,
		Namespace:     task.Namespace,
		TaskQueue:     task.TaskQueue,
		WorkflowType:  task.WorkflowType,
		HistoryLength: len(task.History),
		Attempt:       task.Attempt,
	}
	state, err := wasm.NewWorkflowState(info, types.Payload{}, task.History, w.clock.Now())
	if err != nil {
		return true, err
	}
	state.Logger = w.log
	if err := w.runtime.InvokeWorkflow(ctx, moduleName, state, wasm.DefaultWorkflow()); err != nil {
		w.log.Error(ctx, "workflow tick failed", "wf", task.Execution.String(), "err", err)
		return true, w.eng.CompleteDecisionTask(ctx, task.TaskID, task.Execution, []decision.Decision{{
			Kind: decision.KindFailWorkflow,
			FailWorkflow: &decision.FailWorkflow{Failure: &types.Failure{
				Type: types.FailurePanic, Message: err.Error(),
			}},
		}})
	}
	return true, w.eng.CompleteDecisionTask(ctx, task.TaskID, task.Execution, state.Decisions)
}

func (w *Worker) runOneActivity(ctx context.Context, queue types.TaskQueue) (bool, error) {
	task, ok, err := w.eng.PollActivityTask(ctx, queue, w.id, 30*time.Second)
	if err != nil || !ok {
		return false, err
	}
	w.mu.RLock()
	moduleName, registered := w.activities[task.ActivityType]
	w.mu.RUnlock()
	if !registered {
		fail := &types.Failure{Type: types.FailureServer, Message: "no activity type registered: " + task.ActivityType}
		return true, w.eng.CompleteActivityTask(ctx, task.TaskID, task.Execution, task.ActivityID, types.Payload{}, fail)
	}
	state := &wasm.ActivityState{
		Info: wasm.ActivityInfo{
			Execution:  task.Execution,
			ActivityID: task.ActivityID,
			TaskQueue:  task.TaskQueue,
			Attempt:    task.Attempt,
			StartedAt:  w.clock.Now(),
		},
		Input:  task.Input,
		Logger: w.log,
	}
	if err := w.runtime.InvokeActivity(ctx, moduleName, state, wasm.DefaultActivity()); err != nil {
		fail := &types.Failure{Type: types.FailurePanic, Message: err.Error()}
		return true, w.eng.CompleteActivityTask(ctx, task.TaskID, task.Execution, task.ActivityID, types.Payload{}, fail)
	}
	if state.Failure != nil {
		return true, w.eng.CompleteActivityTask(ctx, task.TaskID, task.Execution, task.ActivityID, types.Payload{}, state.Failure)
	}
	if len(state.Result.Data) == 0 {

		state.Result = types.Payload{Encoding: "json/plain", Data: []byte("null")}
	}
	return true, w.eng.CompleteActivityTask(ctx, task.TaskID, task.Execution, task.ActivityID, state.Result, nil)
}

func (w *Worker) DescribeID() string { return w.id }

func (w *Worker) DescribeRegistered() (workflows, activities []string) {
	w.mu.RLock()
	defer w.mu.RUnlock()
	for k := range w.workflows {
		workflows = append(workflows, k)
	}
	for k := range w.activities {
		activities = append(activities, k)
	}
	return
}

