package bloom

import (
	"fmt"
	"testing"
)

// --- Standard Filter ---

func TestFilter_Empty(t *testing.T) {
	f := NewFilter(1000, 0.01)
	if f.Count() != 0 {
		t.Fatal("expected empty")
	}
}

func TestFilter_AddContains(t *testing.T) {
	f := NewFilter(1000, 0.01)
	f.Add([]byte("hello"))
	if !f.Contains([]byte("hello")) {
		t.Fatal("should contain hello")
	}
}

func TestFilter_NotContains(t *testing.T) {
	f := NewFilter(1000, 0.01)
	f.Add([]byte("hello"))
	if f.Contains([]byte("world")) {
		t.Fatal("should not contain world (unless false positive)")
	}
}

func TestFilter_Count(t *testing.T) {
	f := NewFilter(1000, 0.01)
	for i := 0; i < 50; i++ {
		f.Add([]byte(fmt.Sprintf("item-%d", i)))
	}
	if f.Count() != 50 {
		t.Fatalf("expected 50, got %d", f.Count())
	}
}

func TestFilter_NoFalseNegatives(t *testing.T) {
	f := NewFilter(1000, 0.01)
	items := make([][]byte, 500)
	for i := range items {
		items[i] = []byte(fmt.Sprintf("element-%d", i))
		f.Add(items[i])
	}
	for _, item := range items {
		if !f.Contains(item) {
			t.Fatalf("false negative for %s", item)
		}
	}
}

func TestFilter_FPRate(t *testing.T) {
	f := NewFilter(1000, 0.01)
	for i := 0; i < 1000; i++ {
		f.Add([]byte(fmt.Sprintf("item-%d", i)))
	}
	fp := 0
	tests := 10000
	for i := 0; i < tests; i++ {
		if f.Contains([]byte(fmt.Sprintf("notitem-%d", i))) {
			fp++
		}
	}
	fpRate := float64(fp) / float64(tests)
	if fpRate > 0.05 {
		t.Fatalf("FP rate too high: %.4f (expected < 0.05)", fpRate)
	}
}

func TestFilter_Reset(t *testing.T) {
	f := NewFilter(100, 0.01)
	f.Add([]byte("x"))
	f.Reset()
	if f.Count() != 0 {
		t.Fatal("count should be 0 after reset")
	}
	if f.Contains([]byte("x")) {
		t.Fatal("should not contain after reset")
	}
}

func TestFilter_Union(t *testing.T) {
	a := NewFilterRaw(1024, 7)
	b := NewFilterRaw(1024, 7)
	a.Add([]byte("from-a"))
	b.Add([]byte("from-b"))
	if !a.Union(b) {
		t.Fatal("union should succeed")
	}
	if !a.Contains([]byte("from-a")) || !a.Contains([]byte("from-b")) {
		t.Fatal("union should contain elements from both")
	}
}

func TestFilter_UnionMismatch(t *testing.T) {
	a := NewFilterRaw(1024, 7)
	b := NewFilterRaw(2048, 7)
	if a.Union(b) {
		t.Fatal("union with different size should fail")
	}
}

func TestFilter_SizeAndHashNum(t *testing.T) {
	f := NewFilter(1000, 0.01)
	if f.Size() == 0 {
		t.Fatal("size should be positive")
	}
	if f.HashNum() == 0 {
		t.Fatal("hashNum should be positive")
	}
}

func TestFilter_TheoreticalFPRate(t *testing.T) {
	f := NewFilter(1000, 0.01)
	for i := 0; i < 500; i++ {
		f.Add([]byte(fmt.Sprintf("item-%d", i)))
	}
	fp := f.FPRate()
	if fp < 0 || fp > 1 {
		t.Fatalf("FP rate out of bounds: %f", fp)
	}
}

// --- CountingFilter ---

func TestCountingFilter_AddContains(t *testing.T) {
	cf := NewCountingFilter(1000, 0.01)
	cf.Add([]byte("x"))
	if !cf.Contains([]byte("x")) {
		t.Fatal("should contain x")
	}
}

func TestCountingFilter_Remove(t *testing.T) {
	cf := NewCountingFilter(1000, 0.01)
	cf.Add([]byte("x"))
	ok := cf.Remove([]byte("x"))
	if !ok {
		t.Fatal("remove should succeed")
	}
	if cf.Contains([]byte("x")) {
		t.Fatal("should not contain after remove")
	}
}

func TestCountingFilter_RemoveNonExistent(t *testing.T) {
	cf := NewCountingFilter(1000, 0.01)
	ok := cf.Remove([]byte("ghost"))
	if ok {
		t.Fatal("remove of non-existent should fail")
	}
}

func TestCountingFilter_AddRemoveAdd(t *testing.T) {
	cf := NewCountingFilter(1000, 0.01)
	cf.Add([]byte("x"))
	cf.Remove([]byte("x"))
	cf.Add([]byte("x"))
	if !cf.Contains([]byte("x")) {
		t.Fatal("re-add after remove should work")
	}
}

func TestCountingFilter_MultipleAdds(t *testing.T) {
	cf := NewCountingFilter(1000, 0.01)
	cf.Add([]byte("x"))
	cf.Add([]byte("x"))
	cf.Remove([]byte("x"))
	if !cf.Contains([]byte("x")) {
		t.Fatal("should still contain after 2 adds and 1 remove")
	}
	cf.Remove([]byte("x"))
	if cf.Contains([]byte("x")) {
		t.Fatal("should not contain after 2 removes")
	}
}

func TestCountingFilter_Count(t *testing.T) {
	cf := NewCountingFilter(1000, 0.01)
	cf.Add([]byte("a"))
	cf.Add([]byte("b"))
	if cf.Count() != 2 {
		t.Fatalf("expected 2, got %d", cf.Count())
	}
	cf.Remove([]byte("a"))
	if cf.Count() != 1 {
		t.Fatalf("expected 1 after remove, got %d", cf.Count())
	}
}

func TestCountingFilter_NoFalseNegatives(t *testing.T) {
	cf := NewCountingFilter(500, 0.01)
	items := make([][]byte, 200)
	for i := range items {
		items[i] = []byte(fmt.Sprintf("el-%d", i))
		cf.Add(items[i])
	}
	for _, item := range items {
		if !cf.Contains(item) {
			t.Fatalf("false negative for %s", item)
		}
	}
}

// --- ScalableFilter ---

func TestScalableFilter_AddContains(t *testing.T) {
	sf := NewScalableFilter(10, 0.01, 2)
	sf.Add([]byte("x"))
	if !sf.Contains([]byte("x")) {
		t.Fatal("should contain x")
	}
}

func TestScalableFilter_GrowsAutomatically(t *testing.T) {
	sf := NewScalableFilter(5, 0.01, 2)
	for i := 0; i < 50; i++ {
		sf.Add([]byte(fmt.Sprintf("item-%d", i)))
	}
	if sf.SliceCount() < 2 {
		t.Fatal("should have grown to at least 2 slices")
	}
}

func TestScalableFilter_NoFalseNegatives(t *testing.T) {
	sf := NewScalableFilter(10, 0.01, 2)
	items := make([][]byte, 100)
	for i := range items {
		items[i] = []byte(fmt.Sprintf("item-%d", i))
		sf.Add(items[i])
	}
	for _, item := range items {
		if !sf.Contains(item) {
			t.Fatalf("false negative for %s", item)
		}
	}
}

func TestScalableFilter_Count(t *testing.T) {
	sf := NewScalableFilter(10, 0.01, 2)
	for i := 0; i < 30; i++ {
		sf.Add([]byte(fmt.Sprintf("k%d", i)))
	}
	if sf.Count() != 30 {
		t.Fatalf("expected 30, got %d", sf.Count())
	}
}

func TestScalableFilter_EmptyContains(t *testing.T) {
	sf := NewScalableFilter(10, 0.01, 2)
	if sf.Contains([]byte("x")) {
		t.Fatal("empty filter should not contain anything")
	}
}