package levelmap

import "testing"

func TestSetGet(t *testing.T) {
	m := New(4)
	m.Set("a", 1)
	m.Set("b", 2)
	v, ok := m.Get("a")
	if !ok || v.(int) != 1 {
		t.Fatalf("a: %v %v", v, ok)
	}
}

func TestSeal(t *testing.T) {
	m := New(2)
	m.Set("a", 1)
	m.Set("b", 2)
	m.Set("c", 3)
	if m.Levels() < 1 {
		t.Fatalf("expected sealed level, got %d", m.Levels())
	}
}

func TestOverwrite(t *testing.T) {
	m := New(2)
	m.Set("k", 1)
	m.Flush()
	m.Set("k", 2)
	v, _ := m.Get("k")
	if v.(int) != 2 {
		t.Fatalf("got %v", v)
	}
}

func TestDelete(t *testing.T) {
	m := New(2)
	m.Set("k", 1)
	m.Flush()
	m.Delete("k")
	if _, ok := m.Get("k"); ok {
		t.Fatal("expected delete to hide value")
	}
}

func TestLen(t *testing.T) {
	m := New(2)
	for i := 0; i < 10; i++ {
		m.Set(string(rune('a'+i)), i)
	}
	if m.Len() < 10 {
		t.Fatalf("len %d", m.Len())
	}
}
