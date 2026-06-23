package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

func newTestServer(t *testing.T) (*httptest.Server, *engine.Engine, *storage.Memory) {
	t.Helper()
	fc := clock.NewFake(time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	eng := engine.New(store, fc, log.Default)
	s := New(eng, log.Default)
	ts := httptest.NewServer(s.Handler())
	t.Cleanup(ts.Close)
	return ts, eng, store
}

func doJSON(t *testing.T, method, url string, body any) (*http.Response, []byte) {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatal(err)
		}
	}
	req, err := http.NewRequest(method, url, &buf)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	return resp, b
}

func TestHealthz(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, body := doJSON(t, "GET", ts.URL+"/healthz", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	if string(body) != "ok\n" {
		t.Fatalf("body %q", body)
	}
}

func TestStartWorkflow(t *testing.T) {
	ts, _, store := newTestServer(t)
	resp, body := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_id":   "wf1",
		"workflow_type": "Greet",
		"task_queue":    "default",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status %d body=%s", resp.StatusCode, body)
	}
	var out startResp
	if err := json.Unmarshal(body, &out); err != nil {
		t.Fatal(err)
	}
	if out.Execution.WorkflowID != "wf1" || out.Execution.RunID == "" {
		t.Fatalf("exec %+v", out.Execution)
	}
	if _, err := store.GetWorkflow(context.Background(), types.DefaultNamespace, out.Execution); err != nil {
		t.Fatal(err)
	}
}

func TestStartWorkflowValidation(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, _ := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_type": "Greet",
	})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status %d", resp.StatusCode)
	}
}

func TestDescribeNotFound(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, _ := doJSON(t, "GET", ts.URL+"/v1/workflows/missing/missing", nil)
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status %d", resp.StatusCode)
	}
}

func TestSignalWorkflow(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, body := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_id":   "wf1",
		"workflow_type": "Greet",
		"task_queue":    "default",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("start failed: %d body=%s", resp.StatusCode, body)
	}
	var out startResp
	_ = json.Unmarshal(body, &out)
	resp, _ = doJSON(t, "POST", ts.URL+"/v1/workflows/"+string(out.Execution.WorkflowID)+"/"+string(out.Execution.RunID)+"/signal/poke", map[string]any{})
	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("signal status %d", resp.StatusCode)
	}
}

func TestListWorkflowsFilter(t *testing.T) {
	ts, _, _ := newTestServer(t)
	for i, q := range []string{"a", "b", "a"} {
		_, _ = doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
			"workflow_id":   "wf-" + string(rune('1'+i)),
			"workflow_type": "Greet",
			"task_queue":    q,
		})
	}
	resp, body := doJSON(t, "GET", ts.URL+"/v1/workflows?task_queue=a", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	var out struct{ Workflows []types.Info }
	if err := json.Unmarshal(body, &out); err != nil {
		t.Fatal(err)
	}
	if len(out.Workflows) != 2 {
		t.Fatalf("expected 2 for queue=a, got %d", len(out.Workflows))
	}
}

func TestTerminateWorkflow(t *testing.T) {
	ts, _, store := newTestServer(t)
	resp, body := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_id":   "wf1",
		"workflow_type": "Greet",
		"task_queue":    "default",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("start: %s", body)
	}
	var out startResp
	_ = json.Unmarshal(body, &out)
	resp, _ = doJSON(t, "DELETE", ts.URL+"/v1/workflows/"+string(out.Execution.WorkflowID)+"/"+string(out.Execution.RunID)+"?reason=test", nil)
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("terminate status %d", resp.StatusCode)
	}
	rec, _ := store.GetWorkflow(context.Background(), types.DefaultNamespace, out.Execution)
	if rec.Status != types.WorkflowTerminated {
		t.Fatalf("status %s", rec.Status)
	}
}
