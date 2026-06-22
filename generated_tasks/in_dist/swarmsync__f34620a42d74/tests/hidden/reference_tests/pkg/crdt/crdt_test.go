package crdt

import (
	"sync"
	"testing"
)

// --- GCounter ---

func TestGCounter_NewIsZero(t *testing.T) {
	g := NewGCounter("n1")
	if g.Value() != 0 {
		t.Fatalf("expected 0, got %d", g.Value())
	}
}

func TestGCounter_Increment(t *testing.T) {
	g := NewGCounter("n1")
	g.Increment("n1", 5)
	if g.Value() != 5 {
		t.Fatalf("expected 5, got %d", g.Value())
	}
}

func TestGCounter_MultipleNodes(t *testing.T) {
	g := NewGCounter("n1")
	g.Increment("n1", 3)
	g.Increment("n2", 7)
	g.Increment("n3", 1)
	if g.Value() != 11 {
		t.Fatalf("expected 11, got %d", g.Value())
	}
}

func TestGCounter_Merge(t *testing.T) {
	a := NewGCounter("n1")
	a.Increment("n1", 5)
	b := NewGCounter("n2")
	b.Increment("n2", 3)
	b.Increment("n1", 2) // n2 also saw n1 at 2

	a.Merge(b)
	if a.Value() != 8 { // n1=5, n2=3
		t.Fatalf("expected 8, got %d", a.Value())
	}
}

func TestGCounter_MergeIdempotent(t *testing.T) {
	a := NewGCounter("n1")
	a.Increment("n1", 5)
	b := NewGCounter("n1")
	b.Increment("n1", 5) // same state as a
	a.Merge(b)
	if a.Value() != 5 {
		t.Fatalf("expected 5 (idempotent), got %d", a.Value())
	}
	a.Merge(b)
	if a.Value() != 5 {
		t.Fatalf("expected 5 after double merge, got %d", a.Value())
	}
}

func TestGCounter_MergeCommutative(t *testing.T) {
	a := NewGCounter("n1")
	a.Increment("n1", 3)
	b := NewGCounter("n2")
	b.Increment("n2", 7)

	a1 := NewGCounter("n1")
	a1.Increment("n1", 3)
	a1.Merge(b)

	b1 := NewGCounter("n2")
	b1.Increment("n2", 7)
	b1.Merge(a)

	if a1.Value() != b1.Value() {
		t.Fatal("merge should be commutative")
	}
}

func TestGCounter_State(t *testing.T) {
	g := NewGCounter("n1")
	g.Increment("n1", 5)
	g.Increment("n2", 3)
	s := g.State()
	if s["n1"] != 5 || s["n2"] != 3 {
		t.Fatal("state mismatch")
	}
	s["n1"] = 999
	if g.State()["n1"] != 5 {
		t.Fatal("state modification affected counter")
	}
}

func TestGCounter_ThreadSafety(t *testing.T) {
	g := NewGCounter("n1")
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			g.Increment("n1", 1)
		}()
	}
	wg.Wait()
	if g.Value() != 100 {
		t.Fatalf("expected 100, got %d", g.Value())
	}
}

// --- PNCounter ---

func TestPNCounter_NewIsZero(t *testing.T) {
	p := NewPNCounter("n1")
	if p.Value() != 0 {
		t.Fatalf("expected 0, got %d", p.Value())
	}
}

func TestPNCounter_IncrementOnly(t *testing.T) {
	p := NewPNCounter("n1")
	p.Increment("n1", 10)
	if p.Value() != 10 {
		t.Fatalf("expected 10, got %d", p.Value())
	}
}

func TestPNCounter_DecrementOnly(t *testing.T) {
	p := NewPNCounter("n1")
	p.Decrement("n1", 3)
	if p.Value() != -3 {
		t.Fatalf("expected -3, got %d", p.Value())
	}
}

func TestPNCounter_Mixed(t *testing.T) {
	p := NewPNCounter("n1")
	p.Increment("n1", 10)
	p.Decrement("n1", 3)
	if p.Value() != 7 {
		t.Fatalf("expected 7, got %d", p.Value())
	}
}

func TestPNCounter_MultipleNodes(t *testing.T) {
	p := NewPNCounter("n1")
	p.Increment("n1", 5)
	p.Increment("n2", 3)
	p.Decrement("n1", 2)
	p.Decrement("n3", 1)
	// (5+3) - (2+1) = 5
	if p.Value() != 5 {
		t.Fatalf("expected 5, got %d", p.Value())
	}
}

func TestPNCounter_Merge(t *testing.T) {
	a := NewPNCounter("n1")
	a.Increment("n1", 5)
	a.Decrement("n1", 1)

	b := NewPNCounter("n2")
	b.Increment("n2", 3)
	b.Decrement("n2", 2)

	a.Merge(b)
	// pos: n1=5, n2=3 → 8; neg: n1=1, n2=2 → 3; value = 5
	if a.Value() != 5 {
		t.Fatalf("expected 5, got %d", a.Value())
	}
}

func TestPNCounter_MergeIdempotent(t *testing.T) {
	a := NewPNCounter("n1")
	a.Increment("n1", 5)
	a.Decrement("n1", 2)
	b := NewPNCounter("n1")
	b.Increment("n1", 5)
	b.Decrement("n1", 2)
	val := a.Value()
	a.Merge(b)
	if a.Value() != val {
		t.Fatal("merge with identical state should be idempotent")
	}
}

func TestPNCounter_ThreadSafety(t *testing.T) {
	p := NewPNCounter("n1")
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(2)
		go func() {
			defer wg.Done()
			p.Increment("n1", 1)
		}()
		go func() {
			defer wg.Done()
			p.Decrement("n2", 1)
		}()
	}
	wg.Wait()
	if p.Value() != 0 {
		t.Fatalf("expected 0, got %d", p.Value())
	}
}

// --- LWWRegister ---

func TestLWWRegister_SetAndGet(t *testing.T) {
	r := NewLWWRegister("n1")
	r.Set("hello", 100, "n1")
	v, ts := r.Get()
	if v != "hello" || ts != 100 {
		t.Fatalf("expected (hello, 100), got (%v, %d)", v, ts)
	}
}

func TestLWWRegister_LaterTimestampWins(t *testing.T) {
	r := NewLWWRegister("n1")
	r.Set("old", 100, "n1")
	r.Set("new", 200, "n2")
	v, _ := r.Get()
	if v != "new" {
		t.Fatalf("expected new, got %v", v)
	}
}

func TestLWWRegister_EarlierTimestampLoses(t *testing.T) {
	r := NewLWWRegister("n1")
	r.Set("new", 200, "n1")
	updated := r.Set("old", 100, "n2")
	if updated {
		t.Fatal("older timestamp should not update")
	}
	v, _ := r.Get()
	if v != "new" {
		t.Fatalf("expected new, got %v", v)
	}
}

func TestLWWRegister_TieBreakByNodeID(t *testing.T) {
	r := NewLWWRegister("n1")
	r.Set("first", 100, "n1")
	r.Set("second", 100, "n2") // same timestamp, n2 > n1 → wins
	v, _ := r.Get()
	if v != "second" {
		t.Fatalf("expected second (n2 > n1), got %v", v)
	}
}

func TestLWWRegister_Merge(t *testing.T) {
	a := NewLWWRegister("n1")
	a.Set("a-val", 100, "n1")
	b := NewLWWRegister("n2")
	b.Set("b-val", 200, "n2")
	a.Merge(b)
	v, _ := a.Get()
	if v != "b-val" {
		t.Fatalf("expected b-val, got %v", v)
	}
}

func TestLWWRegister_Snapshot(t *testing.T) {
	r := NewLWWRegister("n1")
	r.Set("data", 42, "n1")
	v, ts, nid := r.Snapshot()
	if v != "data" || ts != 42 || nid != "n1" {
		t.Fatal("snapshot mismatch")
	}
}

// --- MVRegister ---

func TestMVRegister_SingleValue(t *testing.T) {
	mv := NewMVRegister()
	mv.Set("hello", 100, "n1", 1)
	entries := mv.Get()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].Value != "hello" {
		t.Fatalf("expected hello, got %v", entries[0].Value)
	}
}

func TestMVRegister_ConcurrentValues(t *testing.T) {
	mv := NewMVRegister()
	mv.Set("val-a", 100, "n1", 1)
	mv.Set("val-b", 100, "n2", 1) // concurrent from different nodes
	if mv.Len() != 2 {
		t.Fatalf("expected 2 concurrent values, got %d", mv.Len())
	}
}

func TestMVRegister_SupersededValue(t *testing.T) {
	mv := NewMVRegister()
	mv.Set("old", 100, "n1", 1)
	mv.Set("new", 200, "n1", 2)
	if mv.Len() != 1 {
		t.Fatalf("expected 1 value after supersede, got %d", mv.Len())
	}
	entries := mv.Get()
	if entries[0].Value != "new" {
		t.Fatalf("expected new, got %v", entries[0].Value)
	}
}

func TestMVRegister_Merge(t *testing.T) {
	a := NewMVRegister()
	a.Set("val-a", 100, "n1", 1)
	b := NewMVRegister()
	b.Set("val-b", 100, "n2", 1)
	a.Merge(b)
	if a.Len() != 2 {
		t.Fatalf("expected 2 after merge, got %d", a.Len())
	}
}

func TestMVRegister_MergeSupersede(t *testing.T) {
	a := NewMVRegister()
	a.Set("old", 100, "n1", 1)
	b := NewMVRegister()
	b.Set("new", 200, "n1", 2)
	a.Merge(b)
	if a.Len() != 1 {
		t.Fatalf("expected 1 after merge with supersede, got %d", a.Len())
	}
}

// --- GSet ---

func TestGSet_Empty(t *testing.T) {
	s := NewGSet()
	if s.Len() != 0 {
		t.Fatal("expected empty set")
	}
}

func TestGSet_Add(t *testing.T) {
	s := NewGSet()
	s.Add("apple")
	if !s.Contains("apple") {
		t.Fatal("expected to contain apple")
	}
}

func TestGSet_AddDuplicate(t *testing.T) {
	s := NewGSet()
	s.Add("apple")
	s.Add("apple")
	if s.Len() != 1 {
		t.Fatalf("expected 1, got %d", s.Len())
	}
}

func TestGSet_Contains(t *testing.T) {
	s := NewGSet()
	s.Add("x")
	if !s.Contains("x") {
		t.Fatal("should contain x")
	}
	if s.Contains("y") {
		t.Fatal("should not contain y")
	}
}

func TestGSet_Elements(t *testing.T) {
	s := NewGSet()
	s.Add("a")
	s.Add("b")
	s.Add("c")
	elems := s.Elements()
	if len(elems) != 3 {
		t.Fatalf("expected 3 elements, got %d", len(elems))
	}
}

func TestGSet_Merge(t *testing.T) {
	a := NewGSet()
	a.Add("x")
	a.Add("y")
	b := NewGSet()
	b.Add("y")
	b.Add("z")
	a.Merge(b)
	if a.Len() != 3 {
		t.Fatalf("expected 3 after merge, got %d", a.Len())
	}
	if !a.Contains("z") {
		t.Fatal("should contain z after merge")
	}
}

func TestGSet_MergeIdempotent(t *testing.T) {
	a := NewGSet()
	a.Add("x")
	b := NewGSet()
	b.Add("x")
	a.Merge(b)
	if a.Len() != 1 {
		t.Fatal("merge with identical state should be idempotent")
	}
}

func TestGSet_ThreadSafety(t *testing.T) {
	s := NewGSet()
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		i := i
		go func() {
			defer wg.Done()
			s.Add(string(rune('a' + (i % 26))))
		}()
	}
	wg.Wait()
	if s.Len() > 26 || s.Len() < 1 {
		t.Fatalf("unexpected set size: %d", s.Len())
	}
}

// --- ORSet ---

func TestORSet_Empty(t *testing.T) {
	s := NewORSet()
	if s.Len() != 0 {
		t.Fatal("expected empty")
	}
}

func TestORSet_AddContains(t *testing.T) {
	s := NewORSet()
	s.Add("apple", "n1")
	if !s.Contains("apple") {
		t.Fatal("should contain apple")
	}
}

func TestORSet_Remove(t *testing.T) {
	s := NewORSet()
	s.Add("apple", "n1")
	s.Remove("apple")
	if s.Contains("apple") {
		t.Fatal("should not contain apple after remove")
	}
}

func TestORSet_AddAfterRemove(t *testing.T) {
	s := NewORSet()
	s.Add("x", "n1")
	s.Remove("x")
	s.Add("x", "n1")
	if !s.Contains("x") {
		t.Fatal("re-add after remove should work")
	}
}

func TestORSet_ConcurrentAddRemove(t *testing.T) {
	// Simulate: n1 adds "x", n2 removes "x" having seen n1's add,
	// then n1 adds "x" again concurrently. The re-add should survive
	// because it has a new unseen tag.
	s1 := NewORSet()
	s1.Add("x", "n1")

	s2 := NewORSet()
	s2.Merge(s1) // s2 sees n1's add
	s2.Remove("x")

	s1.Add("x", "n1") // concurrent re-add with new tag

	// Merge s2's remove into s1
	// s1 still has the new tag that s2 hasn't seen
	// After merge, s1 should still have "x" with 2 tags
	// (s2 deleted its copy but s1's new tag survives)
	s1.Merge(s2)
	if !s1.Contains("x") {
		t.Fatal("concurrent add should survive remove")
	}
}

func TestORSet_Merge(t *testing.T) {
	a := NewORSet()
	a.Add("x", "n1")
	b := NewORSet()
	b.Add("y", "n2")
	a.Merge(b)
	if !a.Contains("x") || !a.Contains("y") {
		t.Fatal("merge should union elements")
	}
}

func TestORSet_MergeTags(t *testing.T) {
	a := NewORSet()
	a.Add("x", "n1")
	b := NewORSet()
	b.Add("x", "n2")
	a.Merge(b)
	tags := a.Tags("x")
	if len(tags) != 2 {
		t.Fatalf("expected 2 tags after merge, got %d", len(tags))
	}
}

func TestORSet_Elements(t *testing.T) {
	s := NewORSet()
	s.Add("a", "n1")
	s.Add("b", "n1")
	s.Add("c", "n1")
	s.Remove("b")
	elems := s.Elements()
	if len(elems) != 2 {
		t.Fatalf("expected 2 elements, got %d", len(elems))
	}
}

// --- ORMap ---

func TestORMap_PutGet(t *testing.T) {
	m := NewORMap()
	m.Put("key1", "value1", 100, "n1")
	v, ok := m.Get("key1")
	if !ok || v != "value1" {
		t.Fatalf("expected (value1, true), got (%v, %v)", v, ok)
	}
}

func TestORMap_GetMissing(t *testing.T) {
	m := NewORMap()
	_, ok := m.Get("missing")
	if ok {
		t.Fatal("expected false for missing key")
	}
}

func TestORMap_Delete(t *testing.T) {
	m := NewORMap()
	m.Put("key1", "value1", 100, "n1")
	m.Delete("key1")
	_, ok := m.Get("key1")
	if ok {
		t.Fatal("expected false after delete")
	}
}

func TestORMap_LWWSemantics(t *testing.T) {
	m := NewORMap()
	m.Put("k", "old", 100, "n1")
	m.Put("k", "new", 200, "n2")
	v, _ := m.Get("k")
	if v != "new" {
		t.Fatalf("expected new, got %v", v)
	}
}

func TestORMap_Keys(t *testing.T) {
	m := NewORMap()
	m.Put("a", 1, 100, "n1")
	m.Put("b", 2, 100, "n1")
	m.Put("c", 3, 100, "n1")
	keys := m.Keys()
	if len(keys) != 3 {
		t.Fatalf("expected 3 keys, got %d", len(keys))
	}
}

func TestORMap_Merge(t *testing.T) {
	a := NewORMap()
	a.Put("x", "from-a", 100, "n1")
	b := NewORMap()
	b.Put("y", "from-b", 200, "n2")
	a.Merge(b)
	v, ok := a.Get("y")
	if !ok || v != "from-b" {
		t.Fatal("merge should include b's entries")
	}
}

func TestORMap_MergeLWW(t *testing.T) {
	a := NewORMap()
	a.Put("k", "old", 100, "n1")
	b := NewORMap()
	b.Put("k", "new", 200, "n2")
	a.Merge(b)
	v, _ := a.Get("k")
	if v != "new" {
		t.Fatalf("expected new after merge, got %v", v)
	}
}

func TestORMap_Len(t *testing.T) {
	m := NewORMap()
	m.Put("a", 1, 100, "n1")
	m.Put("b", 2, 100, "n1")
	if m.Len() != 2 {
		t.Fatalf("expected 2, got %d", m.Len())
	}
	m.Delete("a")
	if m.Len() != 1 {
		t.Fatalf("expected 1 after delete, got %d", m.Len())
	}
}

// --- Observed-remove convergence ---

func TestORSet_RemoveConvergesAfterMerge(t *testing.T) {
	// n1 adds "x"; n2 observes the add via merge and removes "x".
	// When n1 merges n2's state, the remove must converge: "x" is gone.
	a := NewORSet()
	a.Add("x", "n1")

	b := NewORSet()
	b.Merge(a) // b observes n1's add
	b.Remove("x")

	a.Merge(b) // a learns of b's remove
	if a.Contains("x") {
		t.Fatal("remove must converge after merge: x should be absent")
	}
	if a.Len() != 0 {
		t.Fatalf("expected empty set after converged remove, got len %d", a.Len())
	}
}

func TestORSet_ConcurrentAddSurvivesRemove(t *testing.T) {
	// n1 adds "x" (tag1). n2 observes it and removes "x". n1 concurrently
	// re-adds "x" (tag2, which n2 never saw). After both replicas exchange
	// state, the concurrent add must win on both sides.
	a := NewORSet()
	a.Add("x", "n1")

	b := NewORSet()
	b.Merge(a)
	b.Remove("x")

	a.Add("x", "n1") // concurrent re-add with a fresh, unseen tag

	a.Merge(b)
	b.Merge(a)
	if !a.Contains("x") {
		t.Fatal("concurrent add must survive a remove (replica a)")
	}
	if !b.Contains("x") {
		t.Fatal("concurrent add must survive a remove (replica b)")
	}
}

func TestORMap_DeleteConvergesAfterMerge(t *testing.T) {
	a := NewORMap()
	a.Put("k", "v", 100, "n1")

	b := NewORMap()
	b.Merge(a) // b observes the key
	b.Delete("k")

	a.Merge(b) // a learns of the delete
	if _, ok := a.Get("k"); ok {
		t.Fatal("delete must converge after merge: key should be absent")
	}
}

func TestGCounter_CachedValueMatchesSum(t *testing.T) {
	g := NewGCounter("n1")
	g.Increment("n1", 10)
	g.Increment("n2", 5)
	g.Increment("n1", 3)
	if g.Value() != 18 {
		t.Fatalf("expected 18, got %d", g.Value())
	}
	other := NewGCounter("n3")
	other.Increment("n3", 7)
	g.Merge(other)
	if g.Value() != 25 {
		t.Fatalf("expected 25 after merge, got %d", g.Value())
	}
}

func TestPNCounter_CachedValueMatchesSum(t *testing.T) {
	p := NewPNCounter("n1")
	p.Increment("n1", 100)
	p.Decrement("n1", 30)
	p.Increment("n2", 5)
	if p.Value() != 75 {
		t.Fatalf("expected 75, got %d", p.Value())
	}
}
