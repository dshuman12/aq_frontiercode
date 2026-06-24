package queryexec

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/parse"
	"github.com/dleblanc/kindling/internal/record"
)

func recs() []*record.Record {
	t0 := time.Now()
	return []*record.Record{
		{Timestamp: t0, Level: "info", Service: "auth", Message: "ok", Fields: map[string]string{"user": "alice"}},
		{Timestamp: t0, Level: "warn", Service: "auth", Message: "slow", Fields: map[string]string{"user": "bob"}},
		{Timestamp: t0, Level: "error", Service: "users", Message: "boom", Fields: map[string]string{"user": "alice"}},
	}
}

func TestExecuteEq(t *testing.T) {
	q, _ := parse.Parse("level=info")
	r, err := Execute(q, recs())
	if err != nil {
		t.Fatal(err)
	}
	if r.Stats.Matched != 1 {
		t.Fatalf("matched %d", r.Stats.Matched)
	}
}

func TestExecuteContains(t *testing.T) {
	q, _ := parse.Parse("msg:slow")
	r, _ := Execute(q, recs())
	if r.Stats.Matched != 1 {
		t.Fatalf("matched %d", r.Stats.Matched)
	}
}

func TestExecuteOr(t *testing.T) {
	q, _ := parse.Parse("level=info OR level=warn")
	r, _ := Execute(q, recs())
	if r.Stats.Matched != 2 {
		t.Fatalf("matched %d", r.Stats.Matched)
	}
}

func TestSortBy(t *testing.T) {
	rs := recs()
	SortBy(rs, "level", false)
	if rs[0].Level != "error" {
		t.Fatalf("got %s", rs[0].Level)
	}
}

func TestFirst(t *testing.T) {
	rs := recs()
	if len(First(rs, 2)) != 2 {
		t.Fatal("first")
	}
	if len(First(rs, 99)) != 3 {
		t.Fatal("first capped")
	}
}

func TestFieldFrequency(t *testing.T) {
	rs := recs()
	freq := FieldFrequency(rs, "user")
	if freq["alice"] != 2 || freq["bob"] != 1 {
		t.Fatalf("got %v", freq)
	}
}

func TestDistinct(t *testing.T) {
	rs := recs()
	d := DistinctValues(rs, "level")
	if len(d) != 3 {
		t.Fatalf("got %v", d)
	}
}

func TestNilQuery(t *testing.T) {
	if _, err := Execute(nil, recs()); err == nil {
		t.Fatal("expected err")
	}
}
