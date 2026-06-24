package metrics

import "testing"

func TestCounter_Basic(t *testing.T) {
	c := NewCounter("requests")
	c.Inc()
	c.Inc()
	c.Add(3)
	if c.Value() != 5 {
		t.Fatalf("expected 5, got %d", c.Value())
	}
}

func TestCounter_Reset(t *testing.T) {
	c := NewCounter("x")
	c.Add(10)
	c.Reset()
	if c.Value() != 0 {
		t.Fatal("should be 0")
	}
}

func TestGauge_Basic(t *testing.T) {
	g := NewGauge("temp")
	g.Set(25.5)
	if g.Value() != 25.5 {
		t.Fatal("wrong value")
	}
	g.Inc()
	g.Inc()
	g.Dec()
	if g.Value() != 26.5 {
		t.Fatalf("expected 26.5, got %f", g.Value())
	}
}

func TestHistogram_Basic(t *testing.T) {
	h := NewHistogram("latency", []float64{10, 50, 100, 500})
	h.Observe(5)
	h.Observe(25)
	h.Observe(75)
	h.Observe(200)
	if h.Count() != 4 {
		t.Fatalf("expected 4, got %d", h.Count())
	}
	if h.Min() != 5 {
		t.Fatal("wrong min")
	}
	if h.Max() != 200 {
		t.Fatal("wrong max")
	}
}

func TestHistogram_Mean(t *testing.T) {
	h := NewHistogram("x", nil)
	h.Observe(10)
	h.Observe(20)
	h.Observe(30)
	if h.Mean() != 20 {
		t.Fatalf("expected 20, got %f", h.Mean())
	}
}

func TestHistogram_Snapshot(t *testing.T) {
	h := NewHistogram("x", []float64{10, 20})
	h.Observe(5)
	h.Observe(15)
	h.Observe(25)
	b, c := h.Snapshot()
	if len(b) != 2 {
		t.Fatal("wrong buckets")
	}
	total := uint64(0)
	for _, v := range c {
		total += v
	}
	if total != 3 {
		t.Fatal("should total 3")
	}
}

func TestRegistry_Counters(t *testing.T) {
	r := NewRegistry()
	c := r.Counter("ops")
	c.Inc()
	c2 := r.Counter("ops")
	if c2.Value() != 1 {
		t.Fatal("should reuse")
	}
}

func TestRegistry_Snapshot(t *testing.T) {
	r := NewRegistry()
	r.Counter("a").Add(10)
	r.Gauge("b").Set(3.14)
	snap := r.Snapshot()
	if snap["counter.a"].(int64) != 10 {
		t.Fatal("wrong")
	}
	if snap["gauge.b"].(float64) != 3.14 {
		t.Fatal("wrong")
	}
}

func TestCounter_Name(t *testing.T) {
	c := NewCounter("foo")
	if c.Name() != "foo" {
		t.Fatal("wrong name")
	}
}

func TestGauge_Name(t *testing.T) {
	g := NewGauge("bar")
	if g.Name() != "bar" {
		t.Fatal("wrong name")
	}
}

func TestGauge_Add(t *testing.T) {
	g := NewGauge("x")
	g.Add(5.5)
	if g.Value() != 5.5 {
		t.Fatal("wrong")
	}
}

func TestRegistry_CounterNames(t *testing.T) {
	r := NewRegistry()
	r.Counter("z")
	r.Counter("a")
	r.Counter("m")
	names := r.CounterNames()
	if names[0] != "a" || names[1] != "m" || names[2] != "z" {
		t.Fatalf("not sorted: %v", names)
	}
}
