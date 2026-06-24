package history

import (
	"fmt"

	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/pkg/types"
)

type Recorder struct {
	exec    types.Execution
	nextAct types.ActivityID
}

func NewRecorder(exec types.Execution, nextActivityID types.ActivityID) *Recorder {
	if nextActivityID == 0 {
		nextActivityID = 1
	}
	return &Recorder{exec: exec, nextAct: nextActivityID}
}

func (r *Recorder) Record(ds []decision.Decision) ([]Event, error) {
	out := make([]Event, 0, len(ds))
	for _, d := range ds {
		e, err := r.one(d)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, nil
}

func (r *Recorder) one(d decision.Decision) (Event, error) {
	switch d.Kind {
	case decision.KindScheduleActivity:
		if d.ScheduleActivity == nil {
			return Event{}, fmt.Errorf("schedule_activity decision missing payload")
		}
		sa := *d.ScheduleActivity
		if sa.ActivityID == 0 {
			sa.ActivityID = r.nextAct
			r.nextAct++
		} else if sa.ActivityID >= r.nextAct {
			r.nextAct = sa.ActivityID + 1
		}
		e := Event{Kind: ActivityScheduledKind, Workflow: r.exec}
		if err := e.Encode(&ActivityScheduledAttrs{
			ActivityID:   sa.ActivityID,
			ActivityType: sa.ActivityType,
			TaskQueue:    sa.TaskQueue,
			Input:        sa.Input,
			Options:      sa.Options,
		}); err != nil {
			return Event{}, err
		}
		return e, nil

	case decision.KindStartTimer:
		if d.StartTimer == nil {
			return Event{}, fmt.Errorf("start_timer decision missing payload")
		}
		e := Event{Kind: TimerStarted, Workflow: r.exec}
		if err := e.Encode(&TimerStartedAttrs{
			TimerID:  d.StartTimer.TimerID,
			Duration: d.StartTimer.Duration,
		}); err != nil {
			return Event{}, err
		}
		return e, nil

	case decision.KindCancelTimer:
		if d.CancelTimer == nil {
			return Event{}, fmt.Errorf("cancel_timer decision missing payload")
		}
		e := Event{Kind: TimerCanceled, Workflow: r.exec}
		if err := e.Encode(&TimerCanceledAttrs{TimerID: d.CancelTimer.TimerID}); err != nil {
			return Event{}, err
		}
		return e, nil

	case decision.KindCompleteWorkflow:
		if d.CompleteWorkflow == nil {
			return Event{}, fmt.Errorf("complete_workflow decision missing payload")
		}
		e := Event{Kind: WorkflowCompletedKind, Workflow: r.exec}
		if err := e.Encode(&WorkflowCompletedAttrs{Result: d.CompleteWorkflow.Result}); err != nil {
			return Event{}, err
		}
		return e, nil

	case decision.KindFailWorkflow:
		if d.FailWorkflow == nil {
			return Event{}, fmt.Errorf("fail_workflow decision missing payload")
		}
		e := Event{Kind: WorkflowFailedKind, Workflow: r.exec}
		if err := e.Encode(&WorkflowFailedAttrs{Failure: d.FailWorkflow.Failure}); err != nil {
			return Event{}, err
		}
		return e, nil

	case decision.KindContinueAsNew:
		if d.ContinueAsNew == nil {
			return Event{}, fmt.Errorf("continue_as_new decision missing payload")
		}
		e := Event{Kind: WorkflowContinuedAsNewKind, Workflow: r.exec}
		if err := e.Encode(&WorkflowContinuedAsNewAttrs{
			NewInput: d.ContinueAsNew.NewInput,
			Reason:   d.ContinueAsNew.Reason,
		}); err != nil {
			return Event{}, err
		}
		return e, nil

	case decision.KindStartChild:
		if d.StartChild == nil {
			return Event{}, fmt.Errorf("start_child decision missing payload")
		}
		e := Event{Kind: ChildWorkflowScheduled, Workflow: r.exec}
		if err := e.Encode(&ChildWorkflowScheduledAttrs{
			ChildID:      d.StartChild.ChildID,
			WorkflowType: d.StartChild.WorkflowType,
			Input:        d.StartChild.Input,
		}); err != nil {
			return Event{}, err
		}
		return e, nil

	case decision.KindRecordMarker:
		if d.RecordMarker == nil {
			return Event{}, fmt.Errorf("record_marker decision missing payload")
		}
		e := Event{Kind: MarkerRecorded, Workflow: r.exec}
		if err := e.Encode(&MarkerRecordedAttrs{
			Name: d.RecordMarker.Name,
			Data: d.RecordMarker.Data,
		}); err != nil {
			return Event{}, err
		}
		return e, nil
	}
	return Event{}, fmt.Errorf("unknown decision kind: %s", d.Kind)
}
