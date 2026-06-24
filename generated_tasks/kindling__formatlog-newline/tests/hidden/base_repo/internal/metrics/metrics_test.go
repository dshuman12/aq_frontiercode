package metrics_test

import (
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/metrics"
)

func TestEmptyRender(t *testing.T) {
	r := metrics.New()
	if got := r.Render(); got != "" {
		t.Errorf("got %q", got)
	}
}

func TestCounterInc(t *testing.T) {
	r := metrics.New()
	r.CounterInc("kindling_records_total", "records seen", nil, 1)
	r.CounterInc("kindling_records_total", "records seen", nil, 4)
	out := r.Render()
	if !strings.Contains(out, "kindling_records_total 5") {
		t.Errorf("got %q", out)
	}
}

func TestCounterNegativeIgnored(t *testing.T) {
	r := metrics.New()
	r.CounterInc("x", "h", nil, -1)
	if got := r.Render(); got != "" {
		t.Errorf("got %q", got)
	}
}

func TestCounterWithLabels(t *testing.T) {
	r := metrics.New()
	r.CounterInc("kindling_imports_total", "h", map[string]string{"source": "csv"}, 2)
	r.CounterInc("kindling_imports_total", "h", map[string]string{"source": "csv"}, 3)
	r.CounterInc("kindling_imports_total", "h", map[string]string{"source": "json"}, 1)
	out := r.Render()
	if !strings.Contains(out, `kindling_imports_total{source="csv"} 5`) {
		t.Errorf("got %q", out)
	}
	if !strings.Contains(out, `kindling_imports_total{source="json"} 1`) {
		t.Errorf("got %q", out)
	}
}

func TestGaugeSet(t *testing.T) {
	r := metrics.New()
	r.GaugeSet("kindling_lock_wait_seconds", "h", nil, 0.5)
	r.GaugeSet("kindling_lock_wait_seconds", "h", nil, 0.7)
	if !strings.Contains(r.Render(), "kindling_lock_wait_seconds 0.7") {
		t.Errorf("got %q", r.Render())
	}
}

func TestKindMismatchSilent(t *testing.T) {
	r := metrics.New()
	r.CounterInc("x", "h", nil, 1)
	r.GaugeSet("x", "h", nil, 1)
	if strings.Contains(r.Render(), "TYPE x gauge") {
		t.Errorf("got %q", r.Render())
	}
}

func TestReset(t *testing.T) {
	r := metrics.New()
	r.CounterInc("x", "h", nil, 1)
	r.Reset()
	if r.Render() != "" {
		t.Errorf("got %q", r.Render())
	}
}

func TestSortedOutput(t *testing.T) {
	r := metrics.New()
	r.CounterInc("z", "h", nil, 1)
	r.CounterInc("a", "h", nil, 1)
	out := r.Render()
	a := strings.Index(out, "a 1")
	z := strings.Index(out, "z 1")
	if a < 0 || z < 0 || a > z {
		t.Errorf("not sorted: %q", out)
	}
}
