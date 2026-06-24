package pipeline

import (
	"errors"
	"strings"
	"testing"
)

func TestEndToEnd(t *testing.T) {
	out := []Record{}
	p := New(func(r Record) error {
		out = append(out, r)
		return nil
	})
	p.AddStage(Map(func(r Record) Record {
		r.Body = strings.ToUpper(r.Body)
		return r
	}))
	p.AddStage(Filter(func(r Record) bool {
		return !strings.Contains(r.Body, "DROP")
	}))
	for _, body := range []string{"hello", "drop me", "world"} {
		_ = p.Push(Record{Body: body})
	}
	if len(out) != 2 {
		t.Fatalf("out %d", len(out))
	}
	emitted, dropped := p.Stats()
	if emitted != 2 || dropped != 1 {
		t.Fatalf("stats %d %d", emitted, dropped)
	}
}

func TestValidateErrPropagates(t *testing.T) {
	p := New(nil)
	p.AddStage(Validate(func(r Record) error { return errors.New("bad") }))
	if err := p.Push(Record{}); err == nil {
		t.Fatal("expected err")
	}
}
