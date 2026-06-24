package redaction

import (
	"strings"
	"testing"
)

func TestEmail(t *testing.T) {
	e := New()
	got := e.Redact("contact alice@example.com today")
	if strings.Contains(got, "alice@example.com") {
		t.Fatalf("not redacted: %s", got)
	}
}

func TestSSN(t *testing.T) {
	e := New()
	got := e.Redact("ssn=123-45-6789 ok")
	if strings.Contains(got, "123-45-6789") {
		t.Fatalf("not redacted: %s", got)
	}
}

func TestCardLuhn(t *testing.T) {
	e := New()
	good := e.Redact("4242 4242 4242 4242")
	bad := e.Redact("1111 1111 1111 1111")
	if !strings.Contains(good, "REDACTED:card") {
		t.Fatalf("expected redact %s", good)
	}
	if strings.Contains(bad, "REDACTED:card") {
		t.Fatalf("expected pass-through %s", bad)
	}
}

func TestBearer(t *testing.T) {
	e := New()
	got := e.Redact("Authorization: Bearer abcdefghij1234567890XYZ")
	if !strings.Contains(got, "REDACTED:bearer") {
		t.Fatalf("got %s", got)
	}
}

func TestPreserveIP(t *testing.T) {
	e := New()
	got := e.Redact("from 10.0.0.42")
	if !strings.HasPrefix(strings.SplitN(got, "from ", 2)[1], "10") {
		t.Fatalf("expected preserve: %s", got)
	}
}
