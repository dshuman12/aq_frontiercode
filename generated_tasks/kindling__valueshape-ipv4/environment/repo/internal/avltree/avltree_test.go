package avltree

import (
	"math/rand"
	"sort"
	"testing"
)

func TestSetGet(t *testing.T) {
	tr := New()
	for _, k := range []string{"banana", "apple", "cherry"} {
		tr.Set(k, k+"!")
	}
	v, ok := tr.Get("apple")
	if !ok || v.(string) != "apple!" {
		t.Fatalf("got %v %v", v, ok)
	}
	if tr.Len() != 3 {
		t.Fatalf("len %d", tr.Len())
	}
}

func TestDelete(t *testing.T) {
	tr := New()
	for _, k := range []string{"a", "b", "c", "d", "e"} {
		tr.Set(k, k)
	}
	if !tr.Delete("c") {
		t.Fatal("expected delete")
	}
	if tr.Has("c") {
		t.Fatal("not deleted")
	}
}

func TestRange(t *testing.T) {
	tr := New()
	for _, k := range []string{"a", "b", "c", "d", "e"} {
		tr.Set(k, k)
	}
	got := []string{}
	tr.Range("b", "d", func(k string, _ any) bool {
		got = append(got, k)
		return true
	})
	if len(got) != 2 || got[0] != "b" || got[1] != "c" {
		t.Fatalf("got %v", got)
	}
}

func TestMinMax(t *testing.T) {
	tr := New()
	for _, k := range []string{"banana", "apple", "cherry"} {
		tr.Set(k, k)
	}
	mink, _, _ := tr.Min()
	maxk, _, _ := tr.Max()
	if mink != "apple" || maxk != "cherry" {
		t.Fatalf("got %s/%s", mink, maxk)
	}
}

func TestHeightBound(t *testing.T) {
	tr := New()
	r := rand.New(rand.NewSource(7))
	keys := make([]string, 1000)
	for i := range keys {
		keys[i] = randString(r, 8)
		tr.Set(keys[i], i)
	}
	if tr.Height() > 30 {
		t.Fatalf("height %d unexpectedly large", tr.Height())
	}
}

func TestKeysSorted(t *testing.T) {
	tr := New()
	r := rand.New(rand.NewSource(13))
	for i := 0; i < 100; i++ {
		tr.Set(randString(r, 6), i)
	}
	keys := tr.Keys()
	if !sort.StringsAreSorted(keys) {
		t.Fatal("keys not sorted")
	}
}

func TestUpdate(t *testing.T) {
	tr := New()
	tr.Set("k", 1)
	tr.Set("k", 2)
	v, _ := tr.Get("k")
	if v.(int) != 2 {
		t.Fatalf("got %v", v)
	}
	if tr.Len() != 1 {
		t.Fatalf("len %d", tr.Len())
	}
}

func randString(r *rand.Rand, n int) string {
	const chars = "abcdefghijklmnopqrstuvwxyz"
	b := make([]byte, n)
	for i := range b {
		b[i] = chars[r.Intn(len(chars))]
	}
	return string(b)
}
