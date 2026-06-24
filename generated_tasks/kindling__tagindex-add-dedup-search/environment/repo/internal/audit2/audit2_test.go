package audit2

import "testing"

func TestChain(t *testing.T) {
	tr := NewTrail()
	for i := 0; i < 5; i++ {
		_, err := tr.Append("alice", "edit", "doc", nil)
		if err != nil {
			t.Fatal(err)
		}
	}
	if err := tr.Verify(); err != nil {
		t.Fatal(err)
	}
}

func TestVerifyAfterTamper(t *testing.T) {
	tr := NewTrail()
	_, _ = tr.Append("a", "x", "", nil)
	_, _ = tr.Append("a", "y", "", nil)
	snap := tr.Snapshot()
	if len(snap) != 2 {
		t.Fatalf("len %d", len(snap))
	}
	tr.entries[0].Action = "evil"
	if err := tr.Verify(); err == nil {
		t.Fatal("expected verify to fail")
	}
}
