package validate2

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/record"
)

func TestLevelRequired(t *testing.T) {
	rule := LevelRequired{}
	if err := rule.Apply(&record.Record{}); err == nil {
		t.Fatal("expected err")
	}
	if err := rule.Apply(&record.Record{Level: "info"}); err != nil {
		t.Fatal(err)
	}
}

func TestLevelInSet(t *testing.T) {
	rule := NewLevelInSet("info", "warn", "error")
	if err := rule.Apply(&record.Record{Level: "info"}); err != nil {
		t.Fatal(err)
	}
	if err := rule.Apply(&record.Record{Level: "trace"}); err == nil {
		t.Fatal("expected err")
	}
}

func TestMessageRegex(t *testing.T) {
	rule, _ := NewMessageRegex("^login")
	if err := rule.Apply(&record.Record{Message: "login ok"}); err != nil {
		t.Fatal(err)
	}
	if err := rule.Apply(&record.Record{Message: "logout"}); err == nil {
		t.Fatal("expected err")
	}
}

func TestFieldRequired(t *testing.T) {
	rule := FieldRequired{Field: "user"}
	if err := rule.Apply(&record.Record{Fields: map[string]string{"user": "x"}}); err != nil {
		t.Fatal(err)
	}
	if err := rule.Apply(&record.Record{Fields: map[string]string{}}); err == nil {
		t.Fatal("expected err")
	}
}

func TestTimestampRecent(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	rule := TimestampRecent{D: time.Minute, Now: func() time.Time { return now }}
	if err := rule.Apply(&record.Record{Timestamp: now}); err != nil {
		t.Fatal(err)
	}
	if err := rule.Apply(&record.Record{Timestamp: now.Add(-time.Hour)}); err == nil {
		t.Fatal("expected err")
	}
}

func TestRunFailFast(t *testing.T) {
	profile := &Profile{Rules: []Rule{LevelRequired{}, FieldRequired{Field: "user"}}}
	res := Run(profile, &record.Record{}, true)
	if res.OK || len(res.Errors) != 1 {
		t.Fatalf("got %+v", res)
	}
}

func TestRunAllAccumulates(t *testing.T) {
	profile := &Profile{Rules: []Rule{LevelRequired{}}}
	res := RunAll(profile, []*record.Record{{}, {}, {}}, false)
	if res.OK || len(res.Errors) != 3 {
		t.Fatalf("got %+v", res)
	}
}

func TestRegistry(t *testing.T) {
	r := NewRegistry()
	r.Register(LevelRequired{})
	r.Register(FieldRequired{Field: "user"})
	if len(r.Names()) != 2 {
		t.Fatalf("names %v", r.Names())
	}
	p, err := r.BuildProfile("p", "level-required", "field-required:user")
	if err != nil {
		t.Fatal(err)
	}
	if len(p.Rules) != 2 {
		t.Fatalf("rules %v", p.Rules)
	}
}

func TestRegistryUnknown(t *testing.T) {
	r := NewRegistry()
	if _, err := r.BuildProfile("p", "missing"); err == nil {
		t.Fatal("expected err")
	}
}

func TestServiceMatchSet(t *testing.T) {
	rule := NewServiceMatchSet("auth", "users")
	if err := rule.Apply(&record.Record{Service: "auth"}); err != nil {
		t.Fatal(err)
	}
	if err := rule.Apply(&record.Record{Service: "billing"}); err == nil {
		t.Fatal("expected err")
	}
}
