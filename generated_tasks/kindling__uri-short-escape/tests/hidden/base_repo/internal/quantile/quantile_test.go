package quantile_test

import (
	"math"
	"testing"

	"github.com/dleblanc/kindling/internal/quantile"
)

func TestEmptyValueIsNaN(t *testing.T) {
	if got := quantile.New(0.5).Value(); !math.IsNaN(got) {
		t.Errorf("got %v", got)
	}
}

func TestSmallSampleExact(t *testing.T) {
	e := quantile.New(0.5)
	for _, v := range []float64{1, 2, 3} {
		e.Observe(v)
	}
	if e.Value() != 2 {
		t.Errorf("got %v", e.Value())
	}
}

func TestQuantileMin(t *testing.T) {
	e := quantile.New(0)
	for i := 0; i < 4; i++ {
		e.Observe(float64(i))
	}
	if e.Value() != 0 {
		t.Errorf("got %v", e.Value())
	}
}

func TestCount(t *testing.T) {
	e := quantile.New(0.5)
	for i := 0; i < 7; i++ {
		e.Observe(float64(i))
	}
	if e.Count() != 7 {
		t.Errorf("got %d", e.Count())
	}
}

func TestPostBootstrapApproximate(t *testing.T) {
	e := quantile.New(0.5)
	for i := 1; i <= 100; i++ {
		e.Observe(float64(i))
	}
	v := e.Value()
	if v < 30 || v > 70 {
		t.Errorf("got %v", v)
	}
}

func TestQuantileClamp(t *testing.T) {
	e := quantile.New(-0.5)
	e.Observe(1)
	if math.IsNaN(e.Value()) {
		t.Error("nan")
	}
}
