package queryplanner

import (
	"strings"
	"testing"
)

func TestScanCost(t *testing.T) {
	cost := Estimate(&Scan{Source: "events", Total: 1000}, DefaultCostParams())
	if cost.Rows != 1000 || cost.CPU == 0 {
		t.Fatalf("got %+v", cost)
	}
}

func TestIndexEstRows(t *testing.T) {
	idx := &IndexLookup{Field: "level", Value: "info", Selectivity: 0.1, Total: 1000}
	if idx.EstRows() != 100 {
		t.Fatalf("got %d", idx.EstRows())
	}
}

func TestFilterChain(t *testing.T) {
	plan := &Filter{
		Pred:  "msg ~ /api/",
		Sel:   0.5,
		Inner: &IndexLookup{Field: "level", Value: "info", Selectivity: 0.1, Total: 1000},
	}
	cost := Estimate(plan, DefaultCostParams())
	if cost.Rows != 50 {
		t.Fatalf("got %d", cost.Rows)
	}
}

func TestIntersect(t *testing.T) {
	plan := &Intersect{Inputs: []Node{
		&IndexLookup{Field: "a", Value: "1", Selectivity: 0.5, Total: 100},
		&IndexLookup{Field: "b", Value: "2", Selectivity: 0.1, Total: 100},
	}}
	if plan.EstRows() != 10 {
		t.Fatalf("got %d", plan.EstRows())
	}
}

func TestRender(t *testing.T) {
	plan := &Limit{N: 5, Inner: &Scan{Source: "x", Total: 100}}
	out := plan.Render(0)
	if !strings.Contains(out, "Limit(5)") || !strings.Contains(out, "Scan") {
		t.Fatalf("got %s", out)
	}
}

func TestSuggest(t *testing.T) {
	plan := &Filter{Pred: "level=info", Sel: 0.99, Inner: &Scan{Source: "x", Total: 1_000_000}}
	hints := Suggest(plan, DefaultCostParams())
	if len(hints) < 2 {
		t.Fatalf("got %v", hints)
	}
}
