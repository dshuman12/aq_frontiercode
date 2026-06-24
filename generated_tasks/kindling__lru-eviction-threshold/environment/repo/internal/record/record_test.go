package record_test

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/record"
)

func sample() *record.Record {
	return &record.Record{
		Timestamp: time.Date(2026, 5, 4, 12, 0, 0, 0, time.UTC),
		Level:     "info",
		Message:   "hello",
		Service:   "auth",
		Fields:    map[string]string{"user_id": "42", "method": "POST"},
	}
}

func TestHasField(t *testing.T) {
	r := sample()
	if !r.HasField("user_id") {
		t.Error("expected field")
	}
	if r.HasField("missing") {
		t.Error("unexpected field")
	}
}

func TestField(t *testing.T) {
	r := sample()
	if r.Field("user_id") != "42" {
		t.Error("wrong value")
	}
	if r.Field("missing") != "" {
		t.Error("unexpected default")
	}
}

func TestSetFieldInsertsLazyMap(t *testing.T) {
	r := &record.Record{}
	r.SetField("x", "1")
	if r.Field("x") != "1" {
		t.Error("not set")
	}
}

func TestFieldNamesSorted(t *testing.T) {
	r := sample()
	r.SetField("z", "0")
	r.SetField("a", "0")
	names := r.FieldNames()
	for i := 1; i < len(names); i++ {
		if names[i-1] > names[i] {
			t.Errorf("not sorted at %d: %v", i, names)
		}
	}
}

func TestFieldNamesEmpty(t *testing.T) {
	r := &record.Record{}
	if r.FieldNames() != nil {
		t.Error("expected nil")
	}
}

func TestMatchAll(t *testing.T) {
	r := sample()
	if !r.Match(map[string]string{"user_id": "42"}) {
		t.Error("should match")
	}
	if r.Match(map[string]string{"user_id": "99"}) {
		t.Error("should not match")
	}
}

func TestMatchPrefix(t *testing.T) {
	r := sample()
	if !r.MatchPrefix(map[string]string{"user_id": "4"}) {
		t.Error("prefix mismatch")
	}
	if r.MatchPrefix(map[string]string{"user_id": "5"}) {
		t.Error("unexpected match")
	}
}

func TestEqual(t *testing.T) {
	a := sample()
	b := sample()
	if !a.Equal(b) {
		t.Error("expected equal")
	}
	b.Message = "different"
	if a.Equal(b) {
		t.Error("unexpected equal")
	}
}
