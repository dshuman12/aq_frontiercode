package skiplist

import "testing"

func TestSkipList_RangeIncludesLowerBound(t *testing.T) {
	sl := New(42)
	sl.Insert("a", 1)
	sl.Insert("b", 2)
	sl.Insert("c", 3)
	sl.Insert("d", 4)

	result := sl.Range("b", "c")
	if len(result) != 2 {
		t.Fatalf("expected 2 results for Range(b,c), got %d", len(result))
	}
	if result[0].Key != "b" {
		t.Errorf("expected first key 'b', got %q", result[0].Key)
	}
}

func TestSkipList_RangeIncludesUpperBound(t *testing.T) {
	sl := New(42)
	sl.Insert("a", 1)
	sl.Insert("b", 2)
	sl.Insert("c", 3)

	result := sl.Range("a", "c")
	if len(result) != 3 {
		t.Fatalf("expected 3 results for Range(a,c), got %d: %v", len(result), result)
	}
	if result[2].Key != "c" {
		t.Errorf("expected last key 'c', got %q", result[2].Key)
	}
}

func TestSkipList_RangeSingleKey(t *testing.T) {
	sl := New(42)
	sl.Insert("exact", 99)
	result := sl.Range("exact", "exact")
	if len(result) != 1 {
		t.Fatalf("Range(exact,exact) should return 1 result, got %d", len(result))
	}
}
