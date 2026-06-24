package sampledata

import "testing"

func TestNonEmpty(t *testing.T) {
	if len(AccessLog()) == 0 {
		t.Fatal("access empty")
	}
	if len(AppLog()) == 0 {
		t.Fatal("app empty")
	}
	if len(AuditLog()) == 0 {
		t.Fatal("audit empty")
	}
}

func TestLines(t *testing.T) {
	if len(AccessLines()) < 100 {
		t.Fatalf("access lines %d", len(AccessLines()))
	}
}

func TestNames(t *testing.T) {
	if len(Names()) != 3 {
		t.Fatal("names")
	}
	if Get("access") == "" {
		t.Fatal("get")
	}
	if Get("nope") != "" {
		t.Fatal("expected empty")
	}
}

func TestTotal(t *testing.T) {
	if Total() < 10000 {
		t.Fatalf("total %d", Total())
	}
}
