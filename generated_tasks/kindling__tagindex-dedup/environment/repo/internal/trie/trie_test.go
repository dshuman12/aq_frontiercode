package trie_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/trie"
)

func build(words ...string) *trie.Trie {
	t := trie.New()
	for _, w := range words {
		t.Insert(w)
	}
	return t
}

func TestEmpty(t *testing.T) {
	tr := trie.New()
	if tr.Contains("anything") {
		t.Error("unexpected match")
	}
	if tr.Len() != 0 {
		t.Error("non-zero len")
	}
}

func TestInsertContains(t *testing.T) {
	tr := build("abc", "abd", "xyz")
	for _, w := range []string{"abc", "abd", "xyz"} {
		if !tr.Contains(w) {
			t.Errorf("missing %s", w)
		}
	}
	if tr.Contains("ab") {
		t.Error("partial should not match")
	}
}

func TestHasPrefixOf(t *testing.T) {
	tr := build("foo", "bar")
	if !tr.HasPrefixOf("foobar") {
		t.Error("foo prefix")
	}
	if tr.HasPrefixOf("baz") {
		t.Error("baz miss")
	}
}

func TestIsPrefixOfSome(t *testing.T) {
	tr := build("foobar")
	if !tr.IsPrefixOfSome("foo") {
		t.Error("foo")
	}
	if tr.IsPrefixOfSome("baz") {
		t.Error("baz miss")
	}
}

func TestLen(t *testing.T) {
	tr := build("a", "b", "abc")
	if tr.Len() != 3 {
		t.Errorf("got %d", tr.Len())
	}
}

func TestUnicodeKeys(t *testing.T) {
	tr := build("café", "cat")
	if !tr.Contains("café") {
		t.Error("unicode")
	}
}
