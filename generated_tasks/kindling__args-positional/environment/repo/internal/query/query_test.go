package query_test

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/parse"
	"github.com/dleblanc/kindling/internal/query"
	"github.com/dleblanc/kindling/internal/record"
)

func r(level, service, msg string, fields map[string]string) *record.Record {
	rec := &record.Record{
		Timestamp: time.Now(),
		Level:     level,
		Service:   service,
		Message:   msg,
		Fields:    map[string]string{},
	}
	for k, v := range fields {
		rec.Fields[k] = v
	}
	return rec
}

func mustParse(t *testing.T, s string) *parse.Query {
	t.Helper()
	q, err := parse.Parse(s)
	if err != nil {
		t.Fatal(err)
	}
	return q
}

func TestEqMatch(t *testing.T) {
	q := mustParse(t, "level=info")
	if !query.Eval(q, r("info", "auth", "x", nil)) {
		t.Error("should match")
	}
	if query.Eval(q, r("warn", "auth", "x", nil)) {
		t.Error("should not match")
	}
}

func TestContainsMatch(t *testing.T) {
	q := mustParse(t, "msg:hello")
	if !query.Eval(q, r("info", "x", "say hello world", nil)) {
		t.Error("should match")
	}
	if query.Eval(q, r("info", "x", "no greeting", nil)) {
		t.Error("should not match")
	}
}

func TestRegex(t *testing.T) {
	q := mustParse(t, "service~^(auth|users)$")
	if !query.Eval(q, r("info", "auth", "x", nil)) {
		t.Error("should match auth")
	}
	if !query.Eval(q, r("info", "users", "x", nil)) {
		t.Error("should match users")
	}
	if query.Eval(q, r("info", "billing", "x", nil)) {
		t.Error("should not match billing")
	}
}

func TestNumericComparison(t *testing.T) {
	q := mustParse(t, "size>1024")
	if !query.Eval(q, r("info", "x", "y", map[string]string{"size": "2048"})) {
		t.Error("should match")
	}
	if query.Eval(q, r("info", "x", "y", map[string]string{"size": "512"})) {
		t.Error("should not match")
	}
}

func TestAndConjunction(t *testing.T) {
	q := mustParse(t, "level=info AND service=auth")
	if !query.Eval(q, r("info", "auth", "x", nil)) {
		t.Error("should match")
	}
	if query.Eval(q, r("info", "users", "x", nil)) {
		t.Error("should not match")
	}
}

func TestOrDisjunction(t *testing.T) {
	q := mustParse(t, "level=warn OR level=error")
	if !query.Eval(q, r("warn", "x", "y", nil)) {
		t.Error("should match warn")
	}
	if !query.Eval(q, r("error", "x", "y", nil)) {
		t.Error("should match error")
	}
	if query.Eval(q, r("info", "x", "y", nil)) {
		t.Error("should not match")
	}
}

func TestFilterReturnsSubset(t *testing.T) {
	q := mustParse(t, "level=warn")
	in := []*record.Record{
		r("info", "x", "y", nil),
		r("warn", "x", "y", nil),
		r("error", "x", "y", nil),
		r("warn", "y", "z", nil),
	}
	out := query.Filter(q, in)
	if len(out) != 2 {
		t.Errorf("got %d", len(out))
	}
}

func TestRegexCacheReuse(t *testing.T) {
	q := mustParse(t, "msg~test.*")
	for i := 0; i < 100; i++ {
		query.Eval(q, r("info", "x", "test_"+string(rune('a'+i%26)), nil))
	}
}

func TestNotEqual(t *testing.T) {
	q, _ := parse.Parse("level!=info")
	if query.Eval(q, r("info", "x", "y", nil)) {
		t.Error("should not match info")
	}
	if !query.Eval(q, r("warn", "x", "y", nil)) {
		t.Error("should match warn")
	}
}
