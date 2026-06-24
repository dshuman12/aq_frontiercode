package sortedmap_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/sortedmap"
)

func TestSumByKey(t *testing.T) {
	got := sortedmap.SumByKey(map[string]uint64{"a": 5, "b": 3})
	if got["a"] != 5 || got["b"] != 3 {
		t.Errorf("got %v", got)
	}
}

func TestTopN(t *testing.T) {
	got := sortedmap.TopNByValue(map[string]uint64{"a": 1, "b": 5, "c": 3}, 2)
	if len(got) != 2 {
		t.Errorf("got %d", len(got))
	}
	if got[0].Key != "b" {
		t.Errorf("got %v", got[0])
	}
}

func TestTopNZeroReturnsAll(t *testing.T) {
	got := sortedmap.TopNByValue(map[string]uint64{"a": 1, "b": 2}, 0)
	if len(got) != 2 {
		t.Errorf("got %d", len(got))
	}
}

func TestFilter(t *testing.T) {
	got := sortedmap.Filter(map[string]uint64{"a": 1, "b": 5, "c": 10}, func(_ string, v uint64) bool {
		return v > 3
	})
	if len(got) != 2 {
		t.Errorf("got %v", got)
	}
}

func TestGroupByKey(t *testing.T) {
	got := sortedmap.GroupByKey(map[string]string{"a": "1", "b": "2"})
	if len(got["a"]) != 1 {
		t.Errorf("got %v", got)
	}
}
