package goldens

import "testing"

func TestKnown(t *testing.T) {
	v, err := Get("sample00")
	if err != nil {
		t.Fatal(err)
	}
	if len(v) < 1024 {
		t.Fatalf("len %d", len(v))
	}
}

func TestUnknown(t *testing.T) {
	if _, err := Get("nope"); err == nil {
		t.Fatal("expected err")
	}
}

func TestSet(t *testing.T) {
	Set("custom", "hi")
	v, _ := Get("custom")
	if v != "hi" {
		t.Fatalf("got %q", v)
	}
}

func TestNamesSorted(t *testing.T) {
	names := Names()
	for i := 1; i < len(names); i++ {
		if names[i-1] > names[i] {
			t.Fatalf("not sorted: %v", names)
		}
	}
}

func TestTotal(t *testing.T) {
	if Total() < 100000 {
		t.Fatalf("total %d", Total())
	}
}
