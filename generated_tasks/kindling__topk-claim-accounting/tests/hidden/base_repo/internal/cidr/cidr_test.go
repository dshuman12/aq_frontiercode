package cidr

import "testing"

func TestLookup(t *testing.T) {
	s := New()
	_ = s.Add("10.0.0.0/8", "office")
	_ = s.Add("10.0.1.0/24", "lab")
	tag, ok := s.Lookup("10.0.1.42")
	if !ok || tag != "lab" {
		t.Fatalf("got %q %v", tag, ok)
	}
	tag, ok = s.Lookup("10.0.5.1")
	if !ok || tag != "office" {
		t.Fatalf("got %q %v", tag, ok)
	}
}

func TestNoMatch(t *testing.T) {
	s := New()
	_ = s.Add("10.0.0.0/8", "x")
	if _, ok := s.Lookup("8.8.8.8"); ok {
		t.Fatal("unexpected match")
	}
}

func TestBad(t *testing.T) {
	s := New()
	if err := s.Add("not-a-cidr", "x"); err == nil {
		t.Fatal("expected err")
	}
	if err := s.Add("", "x"); err == nil {
		t.Fatal("expected err")
	}
	if _, ok := s.Lookup("nope"); ok {
		t.Fatal("expected no match")
	}
}

func TestTags(t *testing.T) {
	s := New()
	_ = s.Add("10.0.0.0/8", "office")
	_ = s.Add("192.168.0.0/16", "home")
	tags := s.Tags()
	if len(tags) != 2 {
		t.Fatalf("tags %v", tags)
	}
}
