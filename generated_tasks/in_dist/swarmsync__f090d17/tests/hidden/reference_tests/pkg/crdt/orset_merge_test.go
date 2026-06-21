package crdt

import "testing"

func TestORSet_MergePreservesLocalTags(t *testing.T) {
	s1 := NewORSet()
	s2 := NewORSet()

	s1.Add("elem", "node1") // s1 has tag {node1, 1}
	s2.Add("elem", "node2") // s2 has tag {node2, 1}

	// Merge s2 into s1: s1 should have both tags
	s1.Merge(s2)

	if len(s1.Tags("elem")) != 2 {
		t.Fatalf("after merge, elem should have 2 tags (one per add), got %d", len(s1.Tags("elem")))
	}
	if !s1.Contains("elem") {
		t.Fatal("elem should be present after merge of two adds")
	}
}

func TestORSet_MergeAddWinsOverConcurrentRemove(t *testing.T) {
	s1 := NewORSet()
	s2 := NewORSet()

	// Concurrent: s1 adds, s2 also adds then removes
	s1.Add("x", "n1") // tag {n1, 1}
	s2.Add("x", "n2") // tag {n2, 1}
	s2.Remove("x")    // removes n2's tag

	// s1 merges s2: x should still be present due to s1's tag
	s1.Merge(s2)
	if !s1.Contains("x") {
		t.Fatal("x should survive: s1's add tag was not affected by s2's remove")
	}
}
