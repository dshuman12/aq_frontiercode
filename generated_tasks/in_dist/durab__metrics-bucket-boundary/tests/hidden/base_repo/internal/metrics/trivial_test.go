package metrics

import "testing"

func TestMetricAccessors(t *testing.T) {
	r := New()
	c := r.NewCounter("c", "ch")
	if c.Name() != "c" || c.Help() != "ch" || c.Type() != "counter" {
		t.Fatalf("counter accessors: %s %s %s", c.Name(), c.Help(), c.Type())
	}
	c.Add(5)
	if c.Value() != 5 {
		t.Fatalf("Add: %d", c.Value())
	}
	g := r.NewGauge("g", "gh")
	if g.Name() != "g" || g.Help() != "gh" || g.Type() != "gauge" {
		t.Fatal("gauge accessors")
	}
	h := r.NewHistogram("h", "hh", []float64{1, 10})
	if h.Name() != "h" || h.Help() != "hh" || h.Type() != "histogram" {
		t.Fatal("hist accessors")
	}
}

func TestDefaultRegistry(t *testing.T) {
	if Default == nil {
		t.Fatal("Default registry not initialised")
	}
	Default.NewCounter("default_counter_ok", "").Inc()
}
