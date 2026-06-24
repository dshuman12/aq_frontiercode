package blocklist

import (
	"strings"
	"testing"
)

func TestExact(t *testing.T) {
	l := New()
	l.AddExact("alpha", "beta")
	if l.Allowed("alpha") {
		t.Fatal("alpha should be blocked")
	}
	if l.Blocked("gamma") {
		t.Fatal("gamma should be allowed")
	}
}

func TestGlob(t *testing.T) {
	l := New()
	if err := l.AddGlob("temp_*"); err != nil {
		t.Fatal(err)
	}
	if !l.Blocked("temp_file") {
		t.Fatal("glob should block")
	}
}

func TestRegex(t *testing.T) {
	l := New()
	if err := l.AddRegex(`^secret_`); err != nil {
		t.Fatal(err)
	}
	if !l.Blocked("secret_token") {
		t.Fatal("regex should block")
	}
}

func TestCache(t *testing.T) {
	l := New()
	l.AddExact("x")
	for i := 0; i < 100; i++ {
		_ = l.Blocked("x")
	}
}

func TestReset(t *testing.T) {
	l := New()
	l.AddExact("x")
	l.Reset()
	if l.Blocked("x") {
		t.Fatal("expected reset")
	}
}

func TestDescribe(t *testing.T) {
	l := New()
	_ = l.AddRegex("^foo")
	out := l.Describe()
	if !strings.Contains(out, "regex:^foo") {
		t.Fatalf("got %s", out)
	}
}

func TestAddRule(t *testing.T) {
	l := New()
	if err := l.AddRule("regex", "^x"); err != nil {
		t.Fatal(err)
	}
	if err := l.AddRule("nope", "x"); err != ErrUnknownKind {
		t.Fatal("expected unknown")
	}
}
