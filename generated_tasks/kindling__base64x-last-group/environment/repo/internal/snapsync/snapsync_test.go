package snapsync

import "testing"

func TestPlanCopyReplaceDelete(t *testing.T) {
	src := []File{
		{Path: "a", SHA: "x"},
		{Path: "old", SHA: "y"},
	}
	dst := []File{
		{Path: "a", SHA: "X"}, // changed
		{Path: "new", SHA: "n"},
	}
	ops := Plan(src, dst)
	if len(ops) != 3 {
		t.Fatalf("ops %+v", ops)
	}
	counts := Counts(ops)
	if counts["copy"] != 1 || counts["replace"] != 1 || counts["delete"] != 1 {
		t.Fatalf("counts %v", counts)
	}
}

func TestEstimateBytes(t *testing.T) {
	ops := []Op{
		{Action: "copy", File: File{Size: 100}},
		{Action: "replace", File: File{Size: 200}},
		{Action: "delete", File: File{Size: 999}},
	}
	if EstimateBytes(ops) != 300 {
		t.Fatal("bytes")
	}
}

func TestInverse(t *testing.T) {
	src := []File{{Path: "a", SHA: "x"}}
	dst := []File{{Path: "b", SHA: "y"}}
	if Counts(Plan(src, dst))["copy"] != Counts(Inverse(src, dst))["delete"] {
		t.Fatal("inverse")
	}
}

func TestCompactDeletes(t *testing.T) {
	ops := []Op{{Action: "copy"}, {Action: "delete"}}
	if len(CompactDeletes(ops)) != 1 {
		t.Fatal("compact")
	}
}

func TestSortByActionPath(t *testing.T) {
	ops := []Op{
		{Action: "delete", File: File{Path: "z"}},
		{Action: "copy", File: File{Path: "a"}},
	}
	sorted := SortByActionPath(ops)
	if sorted[0].Action != "copy" {
		t.Fatalf("got %s", sorted[0].Action)
	}
}
