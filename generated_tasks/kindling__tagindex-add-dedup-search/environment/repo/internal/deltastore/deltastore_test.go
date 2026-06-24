package deltastore

import (
	"testing"
	"time"
)

func TestRecordMaterialise(t *testing.T) {
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	s := New(Snapshot{Time: now, Fields: map[string]string{"a": "1"}}, 0)
	_ = s.Record(Snapshot{Time: now.Add(time.Second), Fields: map[string]string{"a": "2", "b": "3"}})
	_ = s.Record(Snapshot{Time: now.Add(2 * time.Second), Fields: map[string]string{"a": "2"}})

	mid, _ := s.Materialise(1)
	if mid.Fields["a"] != "2" || mid.Fields["b"] != "3" {
		t.Fatalf("mid %+v", mid)
	}
	last := s.Latest()
	if _, has := last.Fields["b"]; has {
		t.Fatalf("b should be unset: %+v", last)
	}
}

func TestRollBaseline(t *testing.T) {
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	s := New(Snapshot{Time: now, Fields: map[string]string{"a": "0"}}, 2)
	for i := 1; i <= 5; i++ {
		_ = s.Record(Snapshot{Time: now.Add(time.Duration(i) * time.Second), Fields: map[string]string{"a": "v" + string(rune('0'+i))}})
	}
	if s.Len() > 2 {
		t.Fatalf("len %d", s.Len())
	}
	if s.Latest().Fields["a"] == "v0" {
		t.Fatal("expected newer value")
	}
}

func TestEach(t *testing.T) {
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	s := New(Snapshot{Time: now, Fields: map[string]string{}}, 0)
	_ = s.Record(Snapshot{Time: now.Add(time.Second), Fields: map[string]string{"x": "1"}})
	count := 0
	s.Each(func(snap Snapshot) bool { count++; return true })
	if count != 2 {
		t.Fatalf("count %d", count)
	}
}

func TestRecordRequiresTime(t *testing.T) {
	s := New(Snapshot{Time: time.Now(), Fields: map[string]string{}}, 0)
	if err := s.Record(Snapshot{}); err == nil {
		t.Fatal("expected err")
	}
}

func TestMaterialiseOutOfRange(t *testing.T) {
	s := New(Snapshot{Time: time.Now(), Fields: map[string]string{}}, 0)
	if _, err := s.Materialise(99); err == nil {
		t.Fatal("expected err")
	}
}
