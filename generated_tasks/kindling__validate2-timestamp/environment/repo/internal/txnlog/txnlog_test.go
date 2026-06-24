package txnlog

import "testing"

func TestCommit(t *testing.T) {
	l := New()
	_ = l.Begin()
	for i := 0; i < 3; i++ {
		_, _ = l.Append(i)
	}
	if l.Len() != 0 {
		t.Fatal("should be empty before commit")
	}
	if err := l.Commit(); err != nil {
		t.Fatal(err)
	}
	if l.Len() != 3 {
		t.Fatalf("got %d", l.Len())
	}
}

func TestRollback(t *testing.T) {
	l := New()
	_ = l.Begin()
	_, _ = l.Append("x")
	_ = l.Rollback()
	if l.Len() != 0 || l.PendingLen() != 0 {
		t.Fatal("rollback failed")
	}
}

func TestNestedBeginRejected(t *testing.T) {
	l := New()
	_ = l.Begin()
	if err := l.Begin(); err != ErrTxnInProgress {
		t.Fatal("expected err")
	}
}

func TestAppendOutsideTxn(t *testing.T) {
	l := New()
	if _, err := l.Append("x"); err != ErrNoTxn {
		t.Fatal("expected err")
	}
}

func TestLookup(t *testing.T) {
	l := New()
	_ = l.Begin()
	id, _ := l.Append(42)
	_ = l.Commit()
	r, ok := l.Lookup(id)
	if !ok || r.Value.(int) != 42 {
		t.Fatalf("got %+v %v", r, ok)
	}
	if _, ok := l.Lookup(999); ok {
		t.Fatal("expected miss")
	}
}

func TestTruncate(t *testing.T) {
	l := New()
	_ = l.Begin()
	for i := 0; i < 5; i++ {
		_, _ = l.Append(i)
	}
	_ = l.Commit()
	if l.Truncate(2) != 2 {
		t.Fatal("expected 2 removed")
	}
	if l.Len() != 3 {
		t.Fatalf("got %d", l.Len())
	}
}

func TestSnapshotIsCopy(t *testing.T) {
	l := New()
	_ = l.Begin()
	_, _ = l.Append("x")
	_ = l.Commit()
	snap := l.Snapshot()
	snap.Records[0].Value = "tampered"
	r, _ := l.Lookup(1)
	if r.Value.(string) == "tampered" {
		t.Fatal("snapshot should be a copy")
	}
}
