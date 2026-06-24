package stats_test

import (
	"math"
	"testing"

	"github.com/dleblanc/kindling/internal/stats"
)

func TestEmptyCounter(t *testing.T) {
	c := stats.New()
	if c.Count != 0 || c.Sum != 0 {
		t.Errorf("got %+v", c)
	}
	if !math.IsNaN(c.Min()) || !math.IsNaN(c.Max()) {
		t.Error("min/max should be NaN")
	}
	if c.Mean() != 0 {
		t.Error("mean should be 0")
	}
}

func TestObserve(t *testing.T) {
	c := stats.New()
	for _, v := range []float64{1, 2, 3, 4, 5} {
		c.Observe(v)
	}
	if c.Count != 5 || c.Sum != 15 {
		t.Errorf("got %+v", c)
	}
	if c.Min() != 1 || c.Max() != 5 {
		t.Errorf("got min %v max %v", c.Min(), c.Max())
	}
	if c.Mean() != 3 {
		t.Errorf("got %v", c.Mean())
	}
}

func TestMerge(t *testing.T) {
	a := stats.New()
	for _, v := range []float64{1, 2, 3} {
		a.Observe(v)
	}
	b := stats.New()
	for _, v := range []float64{10, 20} {
		b.Observe(v)
	}
	a.Merge(b)
	if a.Count != 5 || a.Sum != 36 || a.Min() != 1 || a.Max() != 20 {
		t.Errorf("got %+v / min %v max %v", a, a.Min(), a.Max())
	}
}

func TestMergeEmpty(t *testing.T) {
	a := stats.New()
	a.Observe(5)
	b := stats.New()
	a.Merge(b)
	if a.Count != 1 {
		t.Error("count changed")
	}
}

func TestReset(t *testing.T) {
	c := stats.New()
	c.Observe(7)
	c.Reset()
	if c.Count != 0 || c.Sum != 0 {
		t.Errorf("got %+v", c)
	}
}

func TestQuantilesEmpty(t *testing.T) {
	got := stats.Quantiles(nil, []float64{0.5, 0.95})
	if len(got) != 2 {
		t.Errorf("got %v", got)
	}
}

func TestQuantilesSimple(t *testing.T) {
	got := stats.Quantiles([]float64{5, 1, 3, 4, 2}, []float64{0.0, 0.5, 1.0})
	if got[0] != 1 || got[1] != 3 || got[2] != 5 {
		t.Errorf("got %v", got)
	}
}

func TestObserveMaintainsMin(t *testing.T) {
	c := stats.New()
	c.Observe(10)
	c.Observe(5)
	c.Observe(20)
	if c.Min() != 5 {
		t.Errorf("got %v", c.Min())
	}
}
