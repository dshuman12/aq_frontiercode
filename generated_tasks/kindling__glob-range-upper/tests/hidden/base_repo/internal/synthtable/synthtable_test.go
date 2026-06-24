package synthtable

import "testing"

func TestLen(t *testing.T) {
	if Len() < 1000 {
		t.Fatalf("len %d", Len())
	}
}

func TestGet(t *testing.T) {
	if Get("key_00000") == "" {
		t.Fatal("expected value")
	}
	if Get("missing") != "" {
		t.Fatal("expected empty")
	}
}

func TestKeysUnique(t *testing.T) {
	keys := Keys()
	seen := map[string]struct{}{}
	for _, k := range keys {
		if _, ok := seen[k]; ok {
			t.Fatalf("dup key %s", k)
		}
		seen[k] = struct{}{}
	}
}
