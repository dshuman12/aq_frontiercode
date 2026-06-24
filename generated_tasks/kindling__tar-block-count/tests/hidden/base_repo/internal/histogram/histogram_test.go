package histogram_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/histogram"
)

func bins() *histogram.Histogram {
	return histogram.New([]uint64{10, 100, 1000, 10000})
}

func TestObserveDistributes(t *testing.T) {
	h := bins()
	for _, v := range []uint64{5, 50, 500, 5000, 50000} {
		h.Observe(v)
	}
	counts, overflow := h.Buckets()
	want := []uint64{1, 1, 1, 1}
	for i, c := range counts {
		if c != want[i] {
			t.Errorf("[%d] got %d want %d", i, c, want[i])
		}
	}
	if overflow != 1 {
		t.Errorf("got %d", overflow)
	}
}

func TestCount(t *testing.T) {
	h := bins()
	for i := 0; i < 5; i++ {
		h.Observe(99999)
	}
	if h.Count() != 5 {
		t.Errorf("got %d", h.Count())
	}
}

func TestSum(t *testing.T) {
	h := bins()
	h.Observe(10)
	h.Observe(100)
	if h.Sum() != 110 {
		t.Errorf("got %d", h.Sum())
	}
}

func TestCumulativeBelow(t *testing.T) {
	h := bins()
	h.Observe(5)
	h.Observe(50)
	h.Observe(500)
	if h.CumulativeBelow(10) != 1 {
		t.Errorf("got %d", h.CumulativeBelow(10))
	}
	if h.CumulativeBelow(100) != 2 {
		t.Errorf("got %d", h.CumulativeBelow(100))
	}
}

func TestEmpty(t *testing.T) {
	h := bins()
	if h.Count() != 0 || h.Sum() != 0 {
		t.Errorf("got count=%d sum=%d", h.Count(), h.Sum())
	}
}
