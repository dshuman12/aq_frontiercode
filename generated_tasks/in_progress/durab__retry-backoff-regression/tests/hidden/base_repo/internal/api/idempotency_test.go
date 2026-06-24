package api

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/internal/log"
)

func TestStartWorkflowIdempotent(t *testing.T) {
	ts, eng, _ := newTestServer(t)
	eng.SetIdempotencyCache(engine.NewIdempotencyCache(0))
	_ = log.Default

	body := map[string]any{
		"workflow_id":     "wf1",
		"workflow_type":   "T",
		"task_queue":      "default",
		"idempotency_key": "abc",
	}
	resp, b1 := doJSON(t, "POST", ts.URL+"/v1/workflows", body)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("first start: %d %s", resp.StatusCode, b1)
	}
	var r1 startResp
	_ = json.Unmarshal(b1, &r1)

	body["workflow_id"] = "wf2"
	resp, _ = doJSON(t, "POST", ts.URL+"/v1/workflows", body)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("different wf same key: %d", resp.StatusCode)
	}

	body["workflow_id"] = "wf1"
	resp, b2 := doJSON(t, "POST", ts.URL+"/v1/workflows", body)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("second start: %d %s", resp.StatusCode, b2)
	}
	var r2 startResp
	_ = json.Unmarshal(b2, &r2)
	if r2.Execution.RunID != r1.Execution.RunID {
		t.Fatalf("idempotent start returned new run: %v vs %v", r1, r2)
	}
}
