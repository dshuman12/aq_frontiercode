package clock

import (
	"sync"
	"testing"
)

// --- VectorTimestamp tests ---

func TestVectorTimestamp_NewIsEmpty(t *testing.T) {
	vt := NewVectorTimestamp()
	if len(vt.Entries) != 0 {
		t.Fatalf("expected empty entries, got %d", len(vt.Entries))
	}
}

func TestVectorTimestamp_GetDefault(t *testing.T) {
	vt := NewVectorTimestamp()
	if vt.Get("node-1") != 0 {
		t.Fatalf("expected 0 for unseen node, got %d", vt.Get("node-1"))
	}
}

func TestVectorTimestamp_SetAndGet(t *testing.T) {
	vt := NewVectorTimestamp()
	vt.Set("node-1", 42)
	if vt.Get("node-1") != 42 {
		t.Fatalf("expected 42, got %d", vt.Get("node-1"))
	}
}

func TestVectorTimestamp_Increment(t *testing.T) {
	vt := NewVectorTimestamp()
	v := vt.Increment("a")
	if v != 1 {
		t.Fatalf("expected 1, got %d", v)
	}
	v = vt.Increment("a")
	if v != 2 {
		t.Fatalf("expected 2, got %d", v)
	}
}

func TestVectorTimestamp_Clone(t *testing.T) {
	vt := NewVectorTimestamp()
	vt.Set("a", 3)
	vt.Set("b", 7)
	c := vt.Clone()
	if c.Get("a") != 3 || c.Get("b") != 7 {
		t.Fatal("clone values mismatch")
	}
	c.Set("a", 99)
	if vt.Get("a") != 3 {
		t.Fatal("clone modified original")
	}
}

func TestVectorTimestamp_Merge(t *testing.T) {
	a := NewVectorTimestamp()
	a.Set("x", 5)
	a.Set("y", 2)
	b := NewVectorTimestamp()
	b.Set("x", 3)
	b.Set("y", 8)
	b.Set("z", 1)

	a.Merge(b)
	if a.Get("x") != 5 {
		t.Fatalf("expected x=5, got %d", a.Get("x"))
	}
	if a.Get("y") != 8 {
		t.Fatalf("expected y=8, got %d", a.Get("y"))
	}
	if a.Get("z") != 1 {
		t.Fatalf("expected z=1, got %d", a.Get("z"))
	}
}

func TestVectorTimestamp_Compare_Equal(t *testing.T) {
	a := NewVectorTimestamp()
	a.Set("x", 1)
	b := NewVectorTimestamp()
	b.Set("x", 1)
	if a.Compare(b) != Equal {
		t.Fatalf("expected Equal, got %d", a.Compare(b))
	}
}

func TestVectorTimestamp_Compare_Before(t *testing.T) {
	a := NewVectorTimestamp()
	a.Set("x", 1)
	a.Set("y", 2)
	b := NewVectorTimestamp()
	b.Set("x", 2)
	b.Set("y", 3)
	if a.Compare(b) != Before {
		t.Fatalf("expected Before, got %d", a.Compare(b))
	}
}

func TestVectorTimestamp_Compare_After(t *testing.T) {
	a := NewVectorTimestamp()
	a.Set("x", 5)
	a.Set("y", 5)
	b := NewVectorTimestamp()
	b.Set("x", 3)
	b.Set("y", 4)
	if a.Compare(b) != After {
		t.Fatalf("expected After, got %d", a.Compare(b))
	}
}

func TestVectorTimestamp_Compare_Concurrent(t *testing.T) {
	a := NewVectorTimestamp()
	a.Set("x", 5)
	a.Set("y", 2)
	b := NewVectorTimestamp()
	b.Set("x", 3)
	b.Set("y", 8)
	if a.Compare(b) != Concurrent {
		t.Fatalf("expected Concurrent, got %d", a.Compare(b))
	}
}

func TestVectorTimestamp_Compare_EmptyVsNonEmpty(t *testing.T) {
	a := NewVectorTimestamp()
	b := NewVectorTimestamp()
	b.Set("x", 1)
	if a.Compare(b) != Before {
		t.Fatalf("expected Before, got %d", a.Compare(b))
	}
	if b.Compare(a) != After {
		t.Fatalf("expected After, got %d", b.Compare(a))
	}
}

func TestVectorTimestamp_Compare_BothEmpty(t *testing.T) {
	a := NewVectorTimestamp()
	b := NewVectorTimestamp()
	if a.Compare(b) != Equal {
		t.Fatalf("expected Equal, got %d", a.Compare(b))
	}
}

func TestVectorTimestamp_Compare_DisjointKeys(t *testing.T) {
	a := NewVectorTimestamp()
	a.Set("x", 1)
	b := NewVectorTimestamp()
	b.Set("y", 1)
	if a.Compare(b) != Concurrent {
		t.Fatalf("expected Concurrent, got %d", a.Compare(b))
	}
}

func TestVectorTimestamp_Bytes_Roundtrip(t *testing.T) {
	vt := NewVectorTimestamp()
	vt.Set("alpha", 100)
	vt.Set("beta", 200)
	vt.Set("gamma", 300)

	data := vt.Bytes()
	parsed, err := ParseVectorTimestamp(data)
	if err != nil {
		t.Fatalf("parse error: %v", err)
	}
	if parsed.Get("alpha") != 100 || parsed.Get("beta") != 200 || parsed.Get("gamma") != 300 {
		t.Fatal("roundtrip values mismatch")
	}
}

func TestVectorTimestamp_Bytes_Empty(t *testing.T) {
	vt := NewVectorTimestamp()
	data := vt.Bytes()
	parsed, err := ParseVectorTimestamp(data)
	if err != nil {
		t.Fatalf("parse error: %v", err)
	}
	if len(parsed.Entries) != 0 {
		t.Fatal("expected empty after roundtrip")
	}
}

func TestVectorTimestamp_Bytes_Deterministic(t *testing.T) {
	vt := NewVectorTimestamp()
	vt.Set("c", 3)
	vt.Set("a", 1)
	vt.Set("b", 2)
	d1 := vt.Bytes()
	d2 := vt.Bytes()
	if len(d1) != len(d2) {
		t.Fatal("non-deterministic serialization")
	}
	for i := range d1 {
		if d1[i] != d2[i] {
			t.Fatal("non-deterministic serialization at byte", i)
		}
	}
}

func TestParseVectorTimestamp_ShortData(t *testing.T) {
	_, err := ParseVectorTimestamp([]byte{0, 1})
	if err == nil {
		t.Fatal("expected error for short data")
	}
}

func TestParseVectorTimestamp_TruncatedEntry(t *testing.T) {
	vt := NewVectorTimestamp()
	vt.Set("hello", 42)
	data := vt.Bytes()
	_, err := ParseVectorTimestamp(data[:len(data)-3])
	if err == nil {
		t.Fatal("expected error for truncated entry")
	}
}

// --- VectorClock tests ---

func TestVectorClock_Tick(t *testing.T) {
	vc := NewVectorClock("node-1")
	ts := vc.Tick("node-1")
	vt := ts.(*VectorTimestamp)
	if vt.Get("node-1") != 1 {
		t.Fatalf("expected 1 after tick, got %d", vt.Get("node-1"))
	}
}

func TestVectorClock_MultipleTicks(t *testing.T) {
	vc := NewVectorClock("n1")
	vc.Tick("n1")
	vc.Tick("n1")
	ts := vc.Tick("n1")
	vt := ts.(*VectorTimestamp)
	if vt.Get("n1") != 3 {
		t.Fatalf("expected 3 after 3 ticks, got %d", vt.Get("n1"))
	}
}

func TestVectorClock_Witness(t *testing.T) {
	vc1 := NewVectorClock("n1")
	vc2 := NewVectorClock("n2")

	ts1 := vc1.Tick("n1")
	vc1.Tick("n1")

	ts3 := vc2.Witness("n2", ts1)
	vt := ts3.(*VectorTimestamp)
	if vt.Get("n1") != 1 {
		t.Fatalf("expected n1=1 in witness result, got %d", vt.Get("n1"))
	}
	if vt.Get("n2") != 1 {
		t.Fatalf("expected n2=1 in witness result, got %d", vt.Get("n2"))
	}
}

func TestVectorClock_Now_DoesNotAdvance(t *testing.T) {
	vc := NewVectorClock("n1")
	vc.Tick("n1")
	ts1 := vc.Now()
	ts2 := vc.Now()
	if ts1.Compare(ts2) != Equal {
		t.Fatal("Now() should return same timestamp without advancing")
	}
}

func TestVectorClock_CausalOrdering(t *testing.T) {
	vc1 := NewVectorClock("n1")
	vc2 := NewVectorClock("n2")

	// n1 does some work
	a := vc1.Tick("n1")
	b := vc1.Tick("n1")

	// n1 sends b to n2; n2 witnesses it
	c := vc2.Witness("n2", b)

	// a should be Before b
	if a.Compare(b) != Before {
		t.Fatal("a should be before b")
	}
	// b should be Before c (b happened-before c because c witnessed b)
	if b.Compare(c) != Before {
		t.Fatal("b should be before c")
	}
	// a should be Before c (transitivity)
	if a.Compare(c) != Before {
		t.Fatal("a should be before c")
	}
}

func TestVectorClock_ConcurrentEvents(t *testing.T) {
	vc1 := NewVectorClock("n1")
	vc2 := NewVectorClock("n2")

	a := vc1.Tick("n1")
	b := vc2.Tick("n2")

	if a.Compare(b) != Concurrent {
		t.Fatal("independent events should be concurrent")
	}
}

func TestVectorClock_Snapshot(t *testing.T) {
	vc := NewVectorClock("n1")
	vc.Tick("n1")
	vc.Tick("n1")
	snap := vc.Snapshot()
	if snap.Get("n1") != 2 {
		t.Fatalf("snapshot expected 2, got %d", snap.Get("n1"))
	}
	snap.Set("n1", 999)
	current := vc.Snapshot()
	if current.Get("n1") != 2 {
		t.Fatal("snapshot modification affected clock")
	}
}

func TestVectorClock_ThreadSafety(t *testing.T) {
	vc := NewVectorClock("n1")
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			vc.Tick("n1")
		}()
	}
	wg.Wait()
	snap := vc.Snapshot()
	if snap.Get("n1") != 100 {
		t.Fatalf("expected 100 after concurrent ticks, got %d", snap.Get("n1"))
	}
}

// --- HLC tests ---

func TestHLC_Tick_BasicAdvance(t *testing.T) {
	wall := int64(1000)
	hlc := NewHybridLogicalClock("n1").WithPhysicalClock(func() int64 { return wall })
	ts := hlc.Tick("n1").(*HLCTimestamp)
	if ts.WallTime != 1000 {
		t.Fatalf("expected wall=1000, got %d", ts.WallTime)
	}
	if ts.Logical != 0 {
		t.Fatalf("expected logical=0, got %d", ts.Logical)
	}
}

func TestHLC_Tick_SameWallTime_IncrementsLogical(t *testing.T) {
	wall := int64(1000)
	hlc := NewHybridLogicalClock("n1").WithPhysicalClock(func() int64 { return wall })
	hlc.Tick("n1")
	ts := hlc.Tick("n1").(*HLCTimestamp)
	if ts.Logical != 1 {
		t.Fatalf("expected logical=1, got %d", ts.Logical)
	}
	ts = hlc.Tick("n1").(*HLCTimestamp)
	if ts.Logical != 2 {
		t.Fatalf("expected logical=2, got %d", ts.Logical)
	}
}

func TestHLC_Tick_AdvancingWall_ResetsLogical(t *testing.T) {
	wall := int64(1000)
	hlc := NewHybridLogicalClock("n1").WithPhysicalClock(func() int64 { return wall })
	hlc.Tick("n1")
	hlc.Tick("n1") // logical = 1
	wall = 2000
	ts := hlc.Tick("n1").(*HLCTimestamp)
	if ts.WallTime != 2000 {
		t.Fatalf("expected wall=2000, got %d", ts.WallTime)
	}
	if ts.Logical != 0 {
		t.Fatalf("expected logical=0 after wall advance, got %d", ts.Logical)
	}
}

func TestHLC_Tick_BackwardWall_KeepsForward(t *testing.T) {
	wall := int64(5000)
	hlc := NewHybridLogicalClock("n1").WithPhysicalClock(func() int64 { return wall })
	hlc.Tick("n1")
	wall = 3000 // clock goes backward
	ts := hlc.Tick("n1").(*HLCTimestamp)
	if ts.WallTime != 5000 {
		t.Fatal("HLC should not go backward in wall time")
	}
	if ts.Logical != 1 {
		t.Fatalf("expected logical=1, got %d", ts.Logical)
	}
}

func TestHLC_Witness_RemoteAhead(t *testing.T) {
	wall := int64(1000)
	hlc := NewHybridLogicalClock("n1").WithPhysicalClock(func() int64 { return wall })
	hlc.Tick("n1")

	remote := &HLCTimestamp{WallTime: 5000, Logical: 3, NodeID: "n2"}
	ts := hlc.Witness("n1", remote).(*HLCTimestamp)
	if ts.WallTime != 5000 {
		t.Fatalf("expected wall=5000, got %d", ts.WallTime)
	}
	if ts.Logical != 4 {
		t.Fatalf("expected logical=4, got %d", ts.Logical)
	}
}

func TestHLC_Witness_LocalAhead(t *testing.T) {
	wall := int64(8000)
	hlc := NewHybridLogicalClock("n1").WithPhysicalClock(func() int64 { return wall })
	hlc.Tick("n1")

	remote := &HLCTimestamp{WallTime: 3000, Logical: 10, NodeID: "n2"}
	ts := hlc.Witness("n1", remote).(*HLCTimestamp)
	if ts.WallTime != 8000 {
		t.Fatalf("expected wall=8000, got %d", ts.WallTime)
	}
	if ts.Logical != 1 {
		t.Fatalf("expected logical=1, got %d", ts.Logical)
	}
}

func TestHLC_Witness_SameWallTime(t *testing.T) {
	wall := int64(5000)
	hlc := NewHybridLogicalClock("n1").WithPhysicalClock(func() int64 { return wall })
	hlc.Tick("n1") // wall=5000, logical=0

	remote := &HLCTimestamp{WallTime: 5000, Logical: 7, NodeID: "n2"}
	ts := hlc.Witness("n1", remote).(*HLCTimestamp)
	if ts.WallTime != 5000 {
		t.Fatalf("expected wall=5000, got %d", ts.WallTime)
	}
	// max(0, 7) + 1 = 8
	if ts.Logical != 8 {
		t.Fatalf("expected logical=8, got %d", ts.Logical)
	}
}

func TestHLC_CausalOrdering(t *testing.T) {
	wall1 := int64(1000)
	wall2 := int64(1000)
	hlc1 := NewHybridLogicalClock("n1").WithPhysicalClock(func() int64 { return wall1 })
	hlc2 := NewHybridLogicalClock("n2").WithPhysicalClock(func() int64 { return wall2 })

	a := hlc1.Tick("n1")
	b := hlc2.Witness("n2", a)
	c := hlc1.Witness("n1", b)

	if a.Compare(b) != Before {
		t.Fatal("a should be before b")
	}
	if b.Compare(c) != Before {
		t.Fatal("b should be before c")
	}
	if a.Compare(c) != Before {
		t.Fatal("a should be before c")
	}
}

func TestHLC_Now_DoesNotAdvance(t *testing.T) {
	hlc := NewHybridLogicalClock("n1").WithPhysicalClock(func() int64 { return 1000 })
	hlc.Tick("n1")
	ts1 := hlc.Now().(*HLCTimestamp)
	ts2 := hlc.Now().(*HLCTimestamp)
	if ts1.WallTime != ts2.WallTime || ts1.Logical != ts2.Logical {
		t.Fatal("Now() should not advance clock")
	}
}

func TestHLCTimestamp_Compare_Equal(t *testing.T) {
	a := &HLCTimestamp{WallTime: 100, Logical: 5, NodeID: "n1"}
	b := &HLCTimestamp{WallTime: 100, Logical: 5, NodeID: "n1"}
	if a.Compare(b) != Equal {
		t.Fatal("identical timestamps should be Equal")
	}
}

func TestHLCTimestamp_Compare_DifferentNode(t *testing.T) {
	a := &HLCTimestamp{WallTime: 100, Logical: 5, NodeID: "n1"}
	b := &HLCTimestamp{WallTime: 100, Logical: 5, NodeID: "n2"}
	ord := a.Compare(b)
	if ord != Before {
		t.Fatalf("n1 < n2 lexicographically, expected Before, got %d", ord)
	}
}

func TestHLCTimestamp_Bytes_Roundtrip(t *testing.T) {
	orig := &HLCTimestamp{WallTime: 123456789, Logical: 42, NodeID: "test-node-007"}
	data := orig.Bytes()
	parsed, err := ParseHLCTimestamp(data)
	if err != nil {
		t.Fatalf("parse error: %v", err)
	}
	if parsed.WallTime != orig.WallTime || parsed.Logical != orig.Logical || parsed.NodeID != orig.NodeID {
		t.Fatal("roundtrip mismatch")
	}
}

func TestParseHLCTimestamp_ShortData(t *testing.T) {
	_, err := ParseHLCTimestamp([]byte{0, 1, 2})
	if err == nil {
		t.Fatal("expected error for short data")
	}
}

func TestHLC_ThreadSafety(t *testing.T) {
	wall := int64(1000)
	hlc := NewHybridLogicalClock("n1").WithPhysicalClock(func() int64 { return wall })
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			hlc.Tick("n1")
		}()
	}
	wg.Wait()
	ts := hlc.Now().(*HLCTimestamp)
	if ts.Logical != 99 {
		t.Fatalf("expected logical=99 after 100 concurrent ticks at same wall time, got %d", ts.Logical)
	}
}

func TestVectorTimestamp_MergeIdempotent(t *testing.T) {
	a := NewVectorTimestamp()
	a.Set("x", 5)
	b := a.Clone()
	a.Merge(b)
	if a.Get("x") != 5 {
		t.Fatal("merge with self should be idempotent")
	}
}

func TestVectorTimestamp_MergeCommutative(t *testing.T) {
	a := NewVectorTimestamp()
	a.Set("x", 3)
	a.Set("y", 7)
	b := NewVectorTimestamp()
	b.Set("x", 5)
	b.Set("z", 2)

	a1 := a.Clone()
	a1.Merge(b)

	b1 := b.Clone()
	b1.Merge(a)

	if a1.Compare(b1) != Equal {
		t.Fatal("merge should be commutative")
	}
}

func TestVectorTimestamp_MergeAssociative(t *testing.T) {
	a := NewVectorTimestamp()
	a.Set("x", 1)
	b := NewVectorTimestamp()
	b.Set("y", 2)
	c := NewVectorTimestamp()
	c.Set("z", 3)

	// (a merge b) merge c
	ab := a.Clone()
	ab.Merge(b)
	ab.Merge(c)

	// a merge (b merge c)
	bc := b.Clone()
	bc.Merge(c)
	abc := a.Clone()
	abc.Merge(bc)

	if ab.Compare(abc) != Equal {
		t.Fatal("merge should be associative")
	}
}