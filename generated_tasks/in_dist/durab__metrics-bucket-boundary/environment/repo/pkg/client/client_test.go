package client

import (
	"context"
	"errors"
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

func setup(t *testing.T) (*Client, *storage.Memory) {
	t.Helper()
	fc := clock.NewFake(time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	eng := engine.New(store, fc, log.Default)
	srv := api.New(eng, log.Default)
	ts := httptest.NewServer(srv.Handler())
	t.Cleanup(ts.Close)
	return New(ts.URL), store
}

func TestClientStartAndDescribe(t *testing.T) {
	c, _ := setup(t)
	ctx := context.Background()
	exec, err := c.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf1",
		WorkflowType: "Greet",
		TaskQueue:    "default",
	})
	if err != nil {
		t.Fatal(err)
	}
	info, err := c.DescribeWorkflow(ctx, types.DefaultNamespace, exec)
	if err != nil {
		t.Fatal(err)
	}
	if info.Status != types.WorkflowRunning {
		t.Fatalf("status %s", info.Status)
	}
}

func TestClientErrorMapping(t *testing.T) {
	c, _ := setup(t)
	ctx := context.Background()
	_, err := c.DescribeWorkflow(ctx, types.DefaultNamespace, types.Execution{WorkflowID: "x", RunID: "y"})
	if !errors.Is(err, errs.NotFound) {
		t.Fatalf("want NotFound, got %v", err)
	}
}

func TestClientSignal(t *testing.T) {
	c, store := setup(t)
	ctx := context.Background()
	exec, _ := c.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf1",
		WorkflowType: "Greet",
		TaskQueue:    "default",
	})
	in, _ := types.NewJSONPayload(map[string]any{"x": 1})
	if err := c.SignalWorkflow(ctx, types.DefaultNamespace, exec, "ping", in); err != nil {
		t.Fatal(err)
	}
	hist, _ := store.GetHistory(ctx, exec, 0, 0)
	if len(hist) != 2 {
		t.Fatalf("history len %d", len(hist))
	}
}
