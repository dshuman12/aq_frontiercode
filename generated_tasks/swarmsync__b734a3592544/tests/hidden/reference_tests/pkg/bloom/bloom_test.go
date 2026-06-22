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

// --- FNV hash tests ---

func TestFilter_FNV_NoFalseNegatives(t *testing.T) {
	f := NewFilter(10000, 0.01)
	items := make([][]byte, 5000)
	for i := range items {
		items[i] = []byte(fmt.Sprintf("fnv-item-%d", i))
		f.Add(items[i])
	}
	for _, item := range items {
		if !f.Contains(item) {
			t.Fatalf("false negative after FNV switch for %s", item)
		}
	}
}

func TestFilter_FNV_FPRateBound(t *testing.T) {
	f := NewFilter(10000, 0.01)
	for i := 0; i < 10000; i++ {
		f.Add([]byte(fmt.Sprintf("inserted-%d", i)))
	}
	fps := 0
	tests := 100000
	for i := 0; i < tests; i++ {
		if f.Contains([]byte(fmt.Sprintf("notinserted-%d", i))) {
			fps++
		}
	}
	rate := float64(fps) / float64(tests)
	if rate > 0.05 {
		t.Fatalf("FP rate too high with FNV: %.4f (expected < 0.05)", rate)
	}
}

func TestCountingFilter_FNV_AddRemove(t *testing.T) {
	cf := NewCountingFilter(1000, 0.01)
	for i := 0; i < 100; i++ {
		cf.Add([]byte(fmt.Sprintf("cfnv-%d", i)))
	}
	for i := 0; i < 50; i++ {
		if !cf.Remove([]byte(fmt.Sprintf("cfnv-%d", i))) {
			t.Fatalf("remove should succeed for cfnv-%d", i)
		}
	}
	for i := 50; i < 100; i++ {
		if !cf.Contains([]byte(fmt.Sprintf("cfnv-%d", i))) {
			t.Fatalf("should still contain cfnv-%d", i)
		}
	}
}

// --- Counting filter saturation (no false negatives) ---

func TestCountingFilter_NoFalseNegativeAfterSaturation(t *testing.T) {
	// Adding one element far more than the 4-bit counter ceiling saturates its
	// positions. Removing fewer times than it was added must leave it present:
	// a counting Bloom filter must never produce a false negative.
	cf := NewCountingFilter(100, 0.01)
	data := []byte("hot-key")
	for i := 0; i < 20; i++ {
		cf.Add(data)
	}
	for i := 0; i < 15; i++ {
		cf.Remove(data)
	}
	if !cf.Contains(data) {
		t.Fatal("saturated counters must not be driven to a false negative by Remove")
	}
}

func TestCountingFilter_SaturationDoesNotLeakToOthers(t *testing.T) {
	// A normal add/remove of a different element must still behave normally
	// even when another element has saturated some shared counters.
	cf := NewCountingFilter(100, 0.01)
	hot := []byte("hot-key")
	for i := 0; i < 20; i++ {
		cf.Add(hot)
	}
	cold := []byte("cold-key")
	cf.Add(cold)
	if !cf.Contains(cold) {
		t.Fatal("freshly added element should be present")
	}
	cf.Remove(cold)
	if !cf.Contains(hot) {
		t.Fatal("removing another element must not drop the saturated element")
	}
}

// --- FillRatio fast path ---

func TestFilter_FillRatioReflectsState(t *testing.T) {
	f := NewFilterRaw(1024, 3)
	if f.FillRatio() != 0 {
		t.Fatalf("empty filter should have fill ratio 0, got %v", f.FillRatio())
	}
	for i := 0; i < 10; i++ {
		f.Add([]byte(fmt.Sprintf("fr-%d", i)))
	}
	fr := f.FillRatio()
	if fr <= 0 || fr > 1 {
		t.Fatalf("fill ratio should be in (0,1], got %v", fr)
	}
	f.Reset()
	if f.FillRatio() != 0 {
		t.Fatalf("fill ratio should be 0 after reset, got %v", f.FillRatio())
	}
}

func TestFilter_FillRatioAfterUnion(t *testing.T) {
	a := NewFilterRaw(1024, 3)
	b := NewFilterRaw(1024, 3)
	a.Add([]byte("alpha"))
	b.Add([]byte("beta"))
	if !a.Union(b) {
		t.Fatal("union of matching filters should succeed")
	}
	if !a.Contains([]byte("alpha")) || !a.Contains([]byte("beta")) {
		t.Fatal("union should contain both elements")
	}
	fr := a.FillRatio()
	if fr <= 0 || fr > 1 {
		t.Fatalf("fill ratio should be in (0,1] after union, got %v", fr)
	}
}
