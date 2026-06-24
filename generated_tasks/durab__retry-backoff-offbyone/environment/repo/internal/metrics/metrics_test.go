package metrics

import (
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

func TestCounterConcurrentInc(t *testing.T) {
	r := New()
	c := r.NewCounter("c_total", "test counter")
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 1000; j++ {
				c.Inc()
			}
		}()
	}
	wg.Wait()
	if c.Value() != 10000 {
		t.Fatalf("counter = %d", c.Value())
	}
}

func TestGaugeAddDec(t *testing.T) {
	r := New()
	g := r.NewGauge("g", "test gauge")
	g.Set(10)
	g.Inc()
	g.Inc()
	g.Add(5)
	g.Dec()
	if g.Value() != 16 {
		t.Fatalf("gauge = %d", g.Value())
	}
}

func TestHistogramBuckets(t *testing.T) {
	r := New()
	h := r.NewHistogram("h", "test hist", []float64{0.1, 1, 10})
	for _, v := range []float64{0.05, 0.5, 5, 50} {
		h.Observe(v)
	}
	if h.total != 4 {
		t.Fatalf("total = %d", h.total)
	}
	if h.counts[0] != 1 || h.counts[1] != 1 || h.counts[2] != 1 {
		t.Fatalf("bucket distribution: %+v", h.counts)
	}
}

func TestHandlerRendersText(t *testing.T) {
	r := New()
	r.NewCounter("api_requests_total", "").Inc()
	r.NewGauge("workers_running", "").Set(3)
	r.NewHistogram("rpc_latency_seconds", "", []float64{0.1, 1}).Observe(0.5)

	req := httptest.NewRequest("GET", "/metrics", nil)
	w := httptest.NewRecorder()
	r.Handler().ServeHTTP(w, req)
	body := w.Body.String()

	if !strings.Contains(body, "api_requests_total 1\n") {
		t.Errorf("counter missing:\n%s", body)
	}
	if !strings.Contains(body, "workers_running 3\n") {
		t.Errorf("gauge missing:\n%s", body)
	}
	if !strings.Contains(body, "rpc_latency_seconds_count 1") {
		t.Errorf("histogram count missing:\n%s", body)
	}
}
