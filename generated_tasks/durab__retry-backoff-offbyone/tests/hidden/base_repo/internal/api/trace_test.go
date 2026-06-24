package api

import (
	"net/http"
	"testing"

	"github.com/vishaljakhar/durab/internal/trace"
)

func TestTraceHeaderEchoed(t *testing.T) {
	ts, _, _ := newTestServer(t)
	req, _ := http.NewRequest("GET", ts.URL+"/healthz", nil)
	req.Header.Set(trace.Header, "request-1234")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if got := resp.Header.Get(trace.Header); got != "request-1234" {
		t.Fatalf("trace echoed = %q", got)
	}
}

func TestTraceHeaderGenerated(t *testing.T) {
	ts, _, _ := newTestServer(t)
	resp, err := http.Get(ts.URL + "/healthz")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.Header.Get(trace.Header) == "" {
		t.Fatal("missing trace header on response")
	}
}
