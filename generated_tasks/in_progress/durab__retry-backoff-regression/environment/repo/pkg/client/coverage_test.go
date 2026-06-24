package client

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/api"
	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

func setupSrv(t *testing.T) (*Client, *engine.Engine, *storage.Memory) {
	t.Helper()
	fc := clock.NewFake(time.Date(2026, 5, 6, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	eng := engine.New(store, fc, log.Default)
	srv := api.New(eng, log.Default)
	ts := httptest.NewServer(srv.Handler())
	t.Cleanup(ts.Close)
	return New(ts.URL), eng, store
}

func TestClientCancelAndTerminate(t *testing.T) {
	c, _, store := setupSrv(t)
	ctx := context.Background()
	exec, err := c.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf1",
		WorkflowType: "T",
		TaskQueue:    "default",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := c.CancelWorkflow(ctx, types.DefaultNamespace, exec); err != nil {
		t.Fatal(err)
	}
	hist, _ := store.GetHistory(ctx, exec, 0, 0)
	var sawCancel bool
	for _, ev := range hist {
		if ev.Kind == "SignalReceived" {
			sawCancel = true
		}
	}
	if !sawCancel {
		t.Fatal("cancel did not append signal event")
	}
	if err := c.TerminateWorkflow(ctx, types.DefaultNamespace, exec, "done"); err != nil {
		t.Fatal(err)
	}
	rec, _ := store.GetWorkflow(ctx, types.DefaultNamespace, exec)
	if rec.Status != types.WorkflowTerminated {
		t.Fatalf("status %s", rec.Status)
	}
}

func TestClientGetHistory(t *testing.T) {
	c, _, _ := setupSrv(t)
	ctx := context.Background()
	exec, err := c.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf1",
		WorkflowType: "T",
		TaskQueue:    "default",
	})
	if err != nil {
		t.Fatal(err)
	}
	hist, err := c.GetHistory(ctx, exec, 0, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(hist) < 1 {
		t.Fatalf("expected at least one event, got %d", len(hist))
	}
}

func TestClientPollAndCompleteDecision(t *testing.T) {
	c, _, _ := setupSrv(t)
	ctx := context.Background()
	exec, _ := c.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf1",
		WorkflowType: "T",
		TaskQueue:    "default",
	})
	resp, err := c.PollDecisionTask(ctx, PollDecisionRequest{
		TaskQueue: "default",
		WorkerID:  "w1",
	})
	if err != nil {
		t.Fatal(err)
	}
	if resp.Idle || resp.Task == nil {
		t.Fatalf("expected a task, got idle=%v", resp.Idle)
	}
	if err := c.CompleteDecisionTask(ctx, CompleteDecisionRequest{
		TaskID:    resp.Task.TaskID,
		Execution: exec,
	}); err != nil {
		t.Fatal(err)
	}
	resp2, _ := c.PollDecisionTask(ctx, PollDecisionRequest{TaskQueue: "default", WorkerID: "w1"})
	if !resp2.Idle {
		t.Fatal("expected idle after completion")
	}
}

func TestClientWithHTTPClientReplacesTransport(t *testing.T) {
	c, _, _ := setupSrv(t)
	hc := &http.Client{Timeout: 1 * time.Second}
	c2 := c.WithHTTPClient(hc)
	if c2 != c {
		t.Fatal("WithHTTPClient should return the same client for chaining")
	}
	if c.http != hc {
		t.Fatal("http client not replaced")
	}
}

func TestClientMapStatusCovers500(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"oh no"}`))
	}))
	t.Cleanup(ts.Close)
	c := New(ts.URL)
	err := c.SignalWorkflow(context.Background(), types.DefaultNamespace,
		types.Execution{WorkflowID: "x", RunID: "y"}, "ping", types.Payload{})
	if err == nil {
		t.Fatal("expected error")
	}
	if errors.Is(err, errs.NotFound) {
		t.Fatal("500 should not map to NotFound")
	}
}
