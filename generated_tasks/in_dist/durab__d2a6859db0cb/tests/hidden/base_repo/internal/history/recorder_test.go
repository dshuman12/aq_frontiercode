package history

import (
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestRecorderAssignsActivityIDs(t *testing.T) {
	r := NewRecorder(types.Execution{WorkflowID: "wf", RunID: "r"}, 1)
	in := []decision.Decision{
		{Kind: decision.KindScheduleActivity, ScheduleActivity: &decision.ScheduleActivity{ActivityType: "a"}},
		{Kind: decision.KindScheduleActivity, ScheduleActivity: &decision.ScheduleActivity{ActivityType: "b"}},
	}
	out, err := r.Record(in)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 2 {
		t.Fatalf("events: %d", len(out))
	}
	a, _ := out[0].Decode()
	b, _ := out[1].Decode()
	if a.(*ActivityScheduledAttrs).ActivityID != 1 || b.(*ActivityScheduledAttrs).ActivityID != 2 {
		t.Fatalf("activity ids: %v %v", a, b)
	}
}

func TestRecorderRespectsCallerActivityID(t *testing.T) {
	r := NewRecorder(types.Execution{WorkflowID: "wf", RunID: "r"}, 1)
	in := []decision.Decision{
		{Kind: decision.KindScheduleActivity, ScheduleActivity: &decision.ScheduleActivity{ActivityID: 5, ActivityType: "a"}},
		{Kind: decision.KindScheduleActivity, ScheduleActivity: &decision.ScheduleActivity{ActivityType: "b"}},
	}
	out, _ := r.Record(in)
	a, _ := out[0].Decode()
	b, _ := out[1].Decode()
	if a.(*ActivityScheduledAttrs).ActivityID != 5 {
		t.Fatalf("expected user-supplied id, got %d", a.(*ActivityScheduledAttrs).ActivityID)
	}
	if b.(*ActivityScheduledAttrs).ActivityID != 6 {
		t.Fatalf("expected counter to advance past 5, got %d", b.(*ActivityScheduledAttrs).ActivityID)
	}
}

func TestRecorderTimerAndCancel(t *testing.T) {
	r := NewRecorder(types.Execution{WorkflowID: "wf", RunID: "r"}, 1)
	out, err := r.Record([]decision.Decision{
		{Kind: decision.KindStartTimer, StartTimer: &decision.StartTimer{TimerID: "t1", Duration: 5 * time.Second}},
		{Kind: decision.KindCancelTimer, CancelTimer: &decision.CancelTimer{TimerID: "t1"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if out[0].Kind != TimerStarted || out[1].Kind != TimerCanceled {
		t.Fatalf("kinds: %v %v", out[0].Kind, out[1].Kind)
	}
	ca, _ := out[1].Decode()
	if ca.(*TimerCanceledAttrs).TimerID != "t1" {
		t.Fatalf("cancel id: %+v", ca)
	}
}

func TestRecorderRejectsMalformed(t *testing.T) {
	r := NewRecorder(types.Execution{WorkflowID: "wf", RunID: "r"}, 1)
	_, err := r.Record([]decision.Decision{{Kind: decision.KindScheduleActivity}})
	if err == nil {
		t.Fatal("expected error on missing payload")
	}
}

func TestRecorderRejectsUnknownKind(t *testing.T) {
	r := NewRecorder(types.Execution{WorkflowID: "wf", RunID: "r"}, 1)
	_, err := r.Record([]decision.Decision{{Kind: "made_up"}})
	if err == nil {
		t.Fatal("expected error on unknown kind")
	}
}
