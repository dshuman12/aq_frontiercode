package anomaly

import (
	"math"
	"testing"
)

func TestDetectorBaseline(t *testing.T) {
	d, _ := New(Config{Warmup: 5, Threshold: 3})
	for i := 0; i < 100; i++ {
		d.Observe(10)
	}
	if math.Abs(d.Mean()-10) > 0.5 {
		t.Fatalf("mean %v", d.Mean())
	}
	r := d.Observe(50)
	if !r.IsAnomaly {
		t.Fatal("expected anomaly")
	}
}

func TestNoAnomalyDuringWarmup(t *testing.T) {
	d, _ := New(Config{Warmup: 100, Threshold: 1})
	r := d.Observe(1000)
	if r.IsAnomaly {
		t.Fatal("warmup should suppress anomaly")
	}
}

func TestReset(t *testing.T) {
	d, _ := New(Config{Warmup: 0, Threshold: 1})
	for i := 0; i < 10; i++ {
		d.Observe(float64(i))
	}
	d.Reset()
	if d.Count() != 0 {
		t.Fatal("expected reset")
	}
}

func TestBadAlpha(t *testing.T) {
	if _, err := New(Config{Alpha: 5}); err == nil {
		t.Fatal("expected err")
	}
}
