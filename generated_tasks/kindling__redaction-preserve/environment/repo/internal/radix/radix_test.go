package radix_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/radix"
)

func TestEmpty(t *testing.T) {
	r := radix.New()
	if r.Total() != 0 {
		t.Errorf("got %d", r.Total())
	}
}

func TestInsertAndCount(t *testing.T) {
	r := radix.New()
	r.Insert([]byte("foo"))
	r.Insert([]byte("foobar"))
	r.Insert([]byte("bar"))
	if got := r.CountWithPrefix([]byte("foo")); got != 2 {
		t.Errorf("got %d", got)
	}
	if got := r.CountWithPrefix([]byte("ba")); got != 1 {
		t.Errorf("got %d", got)
	}
	if got := r.CountWithPrefix(nil); got != 3 {
		t.Errorf("got %d", got)
	}
}

func TestHasPrefix(t *testing.T) {
	r := radix.New()
	r.Insert([]byte("hello"))
	if !r.HasPrefix([]byte("hel")) {
		t.Error("hel")
	}
	if r.HasPrefix([]byte("helx")) {
		t.Error("helx")
	}
}

func TestDuplicatesIncrement(t *testing.T) {
	r := radix.New()
	r.Insert([]byte("x"))
	r.Insert([]byte("x"))
	if r.CountWithPrefix([]byte("x")) != 2 {
		t.Errorf("got %d", r.CountWithPrefix([]byte("x")))
	}
}

func TestMissingPrefix(t *testing.T) {
	r := radix.New()
	r.Insert([]byte("hello"))
	if r.CountWithPrefix([]byte("missing")) != 0 {
		t.Error("expected zero")
	}
}
