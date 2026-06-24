package api

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestStatsEndpoint(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, _ := doJSON(t, "POST", ts.URL+"/v1/workflows", map[string]any{
		"workflow_id":   "wf-stats",
		"workflow_type": "T",
		"task_queue":    "default",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("start: %d", resp.StatusCode)
	}
	resp, body := doJSON(t, "GET", ts.URL+"/v1/admin/stats", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("stats: %d", resp.StatusCode)
	}
	var out map[string]any
	if err := json.Unmarshal(body, &out); err != nil {
		t.Fatal(err)
	}
	if out["running"] == nil {
		t.Fatalf("missing running count: %s", body)
	}
}
