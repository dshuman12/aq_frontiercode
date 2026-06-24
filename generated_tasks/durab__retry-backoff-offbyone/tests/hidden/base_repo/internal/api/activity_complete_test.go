package api

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/vishaljakhar/durab/pkg/types"
)

func TestActivityCompleteRound(t *testing.T) {
	ts, eng, store := newTestServer(t)
	_ = eng

	resp, body := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_id":   "wfac",
		"workflow_type": "T",
		"task_queue":    "default",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("start: %d", resp.StatusCode)
	}
	var st startResp
	_ = json.Unmarshal(body, &st)

	resp, body = doJSON(t, "POST", ts.URL+"/v1/tasks/decision/poll", map[string]any{
		"task_queue": "default", "worker_id": "w1",
	})
	var dp decisionPollResp
	_ = json.Unmarshal(body, &dp)
	if dp.Task == nil {
		t.Fatal("expected decision task")
	}

	resp, _ = doJSON(t, "POST", ts.URL+"/v1/tasks/decision/complete", map[string]any{
		"task_id":   dp.Task.TaskID,
		"execution": st.Execution,
		"decisions": []map[string]any{{
			"kind": "schedule_activity",
			"schedule_activity": map[string]any{
				"activity_type": "X",
				"task_queue":    "default",
			},
		}},
	})
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("decision complete: %d", resp.StatusCode)
	}

	resp, body = doJSON(t, "POST", ts.URL+"/v1/tasks/activity/poll", map[string]any{
		"task_queue": "default", "worker_id": "w1",
	})
	var ap activityPollResp
	_ = json.Unmarshal(body, &ap)
	if ap.Task == nil {
		t.Fatalf("activity poll: idle=%v body=%s", ap.Idle, body)
	}

	resp, _ = doJSON(t, "POST", ts.URL+"/v1/tasks/activity/complete", map[string]any{
		"task_id":     ap.Task.TaskID,
		"execution":   st.Execution,
		"activity_id": ap.Task.ActivityID,
		"result":      types.Payload{Encoding: "json/plain", Data: []byte(`"ok"`)},
	})
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("activity complete: %d", resp.StatusCode)
	}

	hist, _ := store.GetHistory(nil, st.Execution, 0, 0)
	var sawCompleted bool
	for _, ev := range hist {
		if ev.Kind == "ActivityCompleted" {
			sawCompleted = true
		}
	}
	if !sawCompleted {
		t.Fatal("ActivityCompleted not appended")
	}
}

func TestSignalEmptyBody(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, body := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_id":   "wfse",
		"workflow_type": "T",
		"task_queue":    "default",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("start: %d", resp.StatusCode)
	}
	var out startResp
	_ = json.Unmarshal(body, &out)

	req, _ := http.NewRequest("POST", ts.URL+"/v1/workflows/"+string(out.Execution.WorkflowID)+"/"+string(out.Execution.RunID)+"/signal/empty", nil)
	r, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Body.Close()
	if r.StatusCode != http.StatusAccepted {
		t.Fatalf("signal empty body: %d", r.StatusCode)
	}
}
