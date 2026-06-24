package bigtable

import "testing"

func TestLen(t *testing.T) {
	if Len() < 4000 {
		t.Fatalf("len %d", Len())
	}
}

func TestGet(t *testing.T) {
	if Get("key_000000") == nil {
		t.Fatal("expected row")
	}
	if Get("nope") != nil {
		t.Fatal("expected nil")
	}
}

func TestByTag(t *testing.T) {
	rows := ByTag("tag1")
	if len(rows) == 0 {
		t.Fatal("expected rows")
	}
}

func TestTagSet(t *testing.T) {
	if len(TagSet()) < 50 {
		t.Fatalf("got %d", len(TagSet()))
	}
}
