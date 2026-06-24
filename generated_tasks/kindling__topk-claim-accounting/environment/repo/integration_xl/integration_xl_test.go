package integration_xl

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/agg"
	"github.com/dleblanc/kindling/internal/anomaly"
	"github.com/dleblanc/kindling/internal/forecast"
	"github.com/dleblanc/kindling/internal/json2"
	"github.com/dleblanc/kindling/internal/labelstore"
	"github.com/dleblanc/kindling/internal/queryplanner"
	"github.com/dleblanc/kindling/internal/redaction"
	"github.com/dleblanc/kindling/internal/shipper"
	"github.com/dleblanc/kindling/internal/tagindex"
	"github.com/dleblanc/kindling/internal/topk"
)

func TestRedactAndAggregate(t *testing.T) {
	red := redaction.New()
	a, _ := agg.New(agg.Spec{GroupBy: []string{"app"}, Op: agg.OpCount})
	for _, msg := range []string{"contact alice@example.com", "contact bob@example.com", "no email here"} {
		_ = red.Redact(msg)
		a.Observe(map[string]string{"app": "frontend"}, 0)
	}
	if rows := a.Rows(); len(rows) != 1 || rows[0].Value != 3 {
		t.Fatalf("rows %+v", rows)
	}
}

func TestAnomalyOnHotPath(t *testing.T) {
	d, _ := anomaly.New(anomaly.Config{Warmup: 5, Threshold: 4})
	for i := 0; i < 50; i++ {
		d.Observe(10)
	}
	r := d.Observe(120)
	if !r.IsAnomaly {
		t.Fatal("expected anomaly")
	}
}

func TestForecastShape(t *testing.T) {
	out, err := forecast.Forecast([]float64{1, 2, 3, 4}, forecast.Config{Method: forecast.MethodSES, Horizon: 3})
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 3 {
		t.Fatalf("got %v", out)
	}
}

func TestJSONRoundTrip(t *testing.T) {
	var buf strings.Builder
	enc := json2.NewEncoder(&buf)
	_ = enc.EncodeAny(map[string]any{"name": "kindling", "ok": true})
	_ = enc.Flush()
	if !strings.Contains(buf.String(), "kindling") {
		t.Fatalf("got %s", buf.String())
	}
}

func TestQueryPlanCost(t *testing.T) {
	plan := &queryplanner.Filter{
		Pred: "msg ~ /api/", Sel: 0.5,
		Inner: &queryplanner.IndexLookup{Field: "level", Value: "info", Selectivity: 0.1, Total: 1000},
	}
	cost := queryplanner.Estimate(plan, queryplanner.DefaultCostParams())
	if cost.Rows == 0 {
		t.Fatal("zero rows estimate")
	}
}

func TestTopKHeavyHitters(t *testing.T) {
	tk := topk.New(3)
	for _, w := range []string{"a", "a", "a", "b", "c"} {
		tk.Observe(w)
	}
	if tk.Snapshot()[0].Key != "a" {
		t.Fatal("a should win")
	}
}

func TestLabelStoreDedup(t *testing.T) {
	s := labelstore.New(0)
	a, _ := s.Intern(map[string]string{"x": "1"})
	b, _ := s.Intern(map[string]string{"x": "1"})
	if a != b {
		t.Fatal("not deduped")
	}
}

func TestShipperFlushes(t *testing.T) {
	delivered := 0
	sink := func(ctx context.Context, batch [][]byte) error {
		delivered += len(batch)
		return nil
	}
	s := shipper.New(shipper.Config{BatchSize: 2}, sink)
	for i := 0; i < 5; i++ {
		_ = s.Submit(context.Background(), []byte("x"))
	}
	_ = s.Flush(context.Background())
	if delivered != 5 {
		t.Fatalf("delivered %d", delivered)
	}
}

func TestTagIndexIntersection(t *testing.T) {
	idx := tagindex.New()
	idx.Add(1, "a", "b")
	idx.Add(2, "a")
	idx.Add(3, "b")
	if got := idx.Intersect("a", "b"); len(got) != 1 || got[0] != 1 {
		t.Fatalf("got %v", got)
	}
}

func TestAnomalyOverWindow(t *testing.T) {
	_, _ = forecast.Forecast([]float64{1, 1, 1, 1}, forecast.Config{Method: forecast.MethodMean, Horizon: 1})
	_ = time.Now()
}
