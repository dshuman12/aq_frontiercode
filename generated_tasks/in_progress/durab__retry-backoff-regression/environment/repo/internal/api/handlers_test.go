package api

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestTaskPollIdleWhenEmpty(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, body := doJSON(t, "POST", ts.URL+"/v1/tasks/decision/poll", map[string]any{
		"task_queue": "default",
		"worker_id":  "w1",
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	var out decisionPollResp
	if err := json.Unmarshal(body, &out); err != nil {
		t.Fatal(err)
	}
	if !out.Idle {
		t.Fatalf("expected idle, got task=%+v", out.Task)
	}
}

func TestDecisionPollAndComplete(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, body := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_id":   "wfp",
		"workflow_type": "T",
		"task_queue":    "default",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("start: %d body=%s", resp.StatusCode, body)
	}
	var out startResp
	_ = json.Unmarshal(body, &out)

	resp, body = doJSON(t, "POST", ts.URL+"/v1/tasks/decision/poll", map[string]any{
		"task_queue": "default",
		"worker_id":  "w1",
	})
	var pr decisionPollResp
	_ = json.Unmarshal(body, &pr)
	if pr.Idle || pr.Task == nil {
		t.Fatalf("expected task, got %s", body)
	}

	resp, _ = doJSON(t, "POST", ts.URL+"/v1/tasks/decision/complete", map[string]any{
		"task_id":   pr.Task.TaskID,
		"execution": out.Execution,
		"decisions": []map[string]any{{
			"kind":              "complete_workflow",
			"complete_workflow": map[string]any{},
		}},
	})
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("complete: %d", resp.StatusCode)
	}
}

func TestActivityPollIdle(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, body := doJSON(t, "POST", ts.URL+"/v1/tasks/activity/poll", map[string]any{
		"task_queue": "default",
		"worker_id":  "w1",
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	var out activityPollResp
	_ = json.Unmarshal(body, &out)
	if !out.Idle {
		t.Fatalf("expected idle, got %s", body)
	}
}

func TestCancelEndpoint(t *testing.T) {
	ts, _, _ := newTestServer(t)
	_, body := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_id":   "wfc",
		"workflow_type": "T",
		"task_queue":    "default",
	})
	var out startResp
	_ = json.Unmarshal(body, &out)

	resp, _ := doJSON(t, "POST", ts.URL+"/v1/workflows/"+string(out.Execution.WorkflowID)+"/"+string(out.Execution.RunID)+"/cancel", nil)
	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("cancel: %d", resp.StatusCode)
	}
}

func TestHistoryEndpoint(t *testing.T) {
	ts, _, _ := newTestServer(t)
	_, body := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_id":   "wfh",
		"workflow_type": "T",
		"task_queue":    "default",
	})
	var out startResp
	_ = json.Unmarshal(body, &out)

	resp, hbody := doJSON(t, "POST", ts.URL+"/v1/workflows/"+string(out.Execution.WorkflowID)+"/"+string(out.Execution.RunID)+"/history", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("history: %d body=%s", resp.StatusCode, hbody)
	}
	var got struct {
		History []map[string]any `json:"history"`
	}
	_ = json.Unmarshal(hbody, &got)
	if len(got.History) < 1 {
		t.Fatalf("history empty")
	}
}

func TestResultEndpointRunning(t *testing.T) {
	ts, _, _ := newTestServer(t)
	_, body := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_id":   "wfr",
		"workflow_type": "T",
		"task_queue":    "default",
	})
	var out startResp
	_ = json.Unmarshal(body, &out)

	resp, rbody := doJSON(t, "GET", ts.URL+"/v1/workflows/"+string(out.Execution.WorkflowID)+"/"+string(out.Execution.RunID)+"/result", nil)
	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("result: %d", resp.StatusCode)
	}
	var got map[string]any
	_ = json.Unmarshal(rbody, &got)
	if got["terminated"] != false {
		t.Fatalf("running run should have terminated=false")
	}
}

func TestScheduleCreateListPauseDelete(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, _ := doJSON(t, "POST", ts.URL+"/v1/schedules", map[string]any{
		"id":            "sched-1",
		"spec":          "*/5 * * * *",
		"workflow_id":   "wf-sched",
		"workflow_type": "T",
		"task_queue":    "default",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create: %d", resp.StatusCode)
	}

	resp, body := doJSON(t, "GET", ts.URL+"/v1/schedules", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("list: %d body=%s", resp.StatusCode, body)
	}
	var out struct {
		Schedules []map[string]any `json:"schedules"`
	}
	_ = json.Unmarshal(body, &out)
	if len(out.Schedules) != 1 {
		t.Fatalf("schedules: %d", len(out.Schedules))
	}

	resp, _ = doJSON(t, "POST", ts.URL+"/v1/schedules/sched-1/pause?paused=true", nil)
	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("pause: %d", resp.StatusCode)
	}

	resp, _ = doJSON(t, "DELETE", ts.URL+"/v1/schedules/sched-1", nil)
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("delete: %d", resp.StatusCode)
	}
}

func TestListLimitParam(t *testing.T) {
	ts, _, _ := newTestServer(t)
	for i := 0; i < 4; i++ {
		_, _ = doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
			"workflow_id":   "wf-" + string(rune('a'+i)),
			"workflow_type": "T",
			"task_queue":    "default",
		})
	}
	resp, body := doJSON(t, "GET", ts.URL+"/v1/workflows?limit=2", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	var out struct {
		Workflows []map[string]any `json:"workflows"`
	}
	_ = json.Unmarshal(body, &out)
	if len(out.Workflows) != 2 {
		t.Fatalf("expected 2, got %d", len(out.Workflows))
	}
}

func TestListBadLimitRejected(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, _ := doJSON(t, "GET", ts.URL+"/v1/workflows?limit=abc", nil)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status %d", resp.StatusCode)
	}
}
