package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/vishaljakhar/durab/internal/decision"
)

func TestMalformedStartReturns400(t *testing.T) {
	ts, _, _ := newTestServer(t)
	req, _ := http.NewRequest("POST", ts.URL+"/v1/workflows", bytes.NewReader([]byte(`{not json`)))
	req.Header.Set("Content-Type", "application/json")
	r, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Body.Close()
	if r.StatusCode != http.StatusBadRequest {
		t.Fatalf("status %d", r.StatusCode)
	}
}

func TestUnknownFieldsRejected(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, _ := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_id":   "x",
		"workflow_type": "T",
		"task_queue":    "default",
		"extra":         "field",
	})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("unknown field: %d", resp.StatusCode)
	}
}

func TestListBadAfterRejected(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, _ := doJSON(t, "GET", ts.URL+"/v1/workflows?after=not-a-date", nil)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status %d", resp.StatusCode)
	}
}

func TestCancelUnknownReturns404(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, _ := doJSON(t, "POST", ts.URL+"/v1/workflows/wfx/runy/cancel", nil)
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status %d", resp.StatusCode)
	}
}

func TestTerminateUnknownReturns404(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, _ := doJSON(t, "DELETE", ts.URL+"/v1/workflows/wfx/runy?reason=t", nil)
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status %d", resp.StatusCode)
	}
}

func TestResultTerminatedShape(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, body := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_id":   "wfr2",
		"workflow_type": "T",
		"task_queue":    "default",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("start: %d", resp.StatusCode)
	}
	var st startResp
	_ = json.Unmarshal(body, &st)

	pollResp, body := doJSON(t, "POST", ts.URL+"/v1/tasks/decision/poll", map[string]any{
		"task_queue": "default", "worker_id": "w1",
	})
	_ = pollResp
	var dp decisionPollResp
	_ = json.Unmarshal(body, &dp)

	resp, _ = doJSON(t, "POST", ts.URL+"/v1/tasks/decision/complete", map[string]any{
		"task_id":   dp.Task.TaskID,
		"execution": st.Execution,
		"decisions": []map[string]any{{
			"kind":              string(decision.KindCompleteWorkflow),
			"complete_workflow": map[string]any{},
		}},
	})
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("complete: %d", resp.StatusCode)
	}

	resp, rbody := doJSON(t, "GET", ts.URL+"/v1/workflows/"+string(st.Execution.WorkflowID)+"/"+string(st.Execution.RunID)+"/result", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("result: %d", resp.StatusCode)
	}
	var got map[string]any
	_ = json.Unmarshal(rbody, &got)
	if got["terminated"] != true {
		t.Fatalf("terminated should be true: %s", rbody)
	}
	if got["result"] == nil {
		t.Fatalf("result attrs missing: %s", rbody)
	}
}

func TestScheduleBadSpecRejected(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, _ := doJSON(t, "POST", ts.URL+"/v1/schedules", map[string]any{
		"id":            "bad",
		"spec":          "nonsense",
		"workflow_id":   "x",
		"workflow_type": "T",
	})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status %d", resp.StatusCode)
	}
}
