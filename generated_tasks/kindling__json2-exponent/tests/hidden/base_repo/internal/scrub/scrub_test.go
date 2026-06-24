package scrub

import (
	"strings"
	"testing"
)

func TestAsterisks(t *testing.T) {
	s := New()
	s.Add("password", "secret")
	got := s.Scrub("the password is secret")
	if !strings.Contains(got, "********") {
		t.Fatalf("got %s", got)
	}
}

func TestBracketed(t *testing.T) {
	s := New()
	s.SetMode(ModeBracketed)
	s.Add("alpha")
	got := s.Scrub("alpha bravo")
	if !strings.Contains(got, "[REDACTED]") {
		t.Fatalf("got %s", got)
	}
}

func TestRemove(t *testing.T) {
	s := New()
	s.SetMode(ModeRemove)
	s.Add("X")
	got := s.Scrub("aXbXc")
	if got != "abc" {
		t.Fatalf("got %s", got)
	}
}

func TestCaseFold(t *testing.T) {
	s := New()
	s.Add("hello")
	got := s.Scrub("HELLO world")
	if !strings.Contains(got, "*****") {
		t.Fatalf("got %s", got)
	}
	s.SetCaseFold(false)
	got = s.Scrub("HELLO world")
	if !strings.Contains(got, "HELLO") {
		t.Fatalf("expected unredacted: %s", got)
	}
}

func TestAddRemoveHas(t *testing.T) {
	s := New()
	s.Add("foo")
	if !s.Has("foo") {
		t.Fatal("should have")
	}
	s.Remove("foo")
	if s.Has("foo") {
		t.Fatal("should not have")
	}
}

func TestEmptyAddIgnored(t *testing.T) {
	s := New()
	s.Add("")
	if s.Has("") {
		t.Fatal("should ignore empty")
	}
}
