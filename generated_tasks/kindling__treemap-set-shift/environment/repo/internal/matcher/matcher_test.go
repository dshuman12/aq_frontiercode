package matcher_test

import (
	"reflect"
	"testing"

	"github.com/dleblanc/kindling/internal/matcher"
)

func TestEmpty(t *testing.T) {
	m := matcher.Build(nil)
	if m.ContainsAny("anything") {
		t.Error("empty should match nothing")
	}
}

func TestContainsAny(t *testing.T) {
	m := matcher.Build([]string{"foo", "bar"})
	if !m.ContainsAny("xfooy") {
		t.Error("foo")
	}
	if !m.ContainsAny("xbary") {
		t.Error("bar")
	}
	if m.ContainsAny("nothing") {
		t.Error("no match")
	}
}

func TestFindAll(t *testing.T) {
	m := matcher.Build([]string{"foo", "bar", "baz"})
	got := m.FindAll("foobazbar")
	if !reflect.DeepEqual(got, []int{0, 1, 2}) {
		t.Errorf("got %v", got)
	}
}

func TestFindAllDedups(t *testing.T) {
	m := matcher.Build([]string{"a"})
	got := m.FindAll("aaa")
	if !reflect.DeepEqual(got, []int{0}) {
		t.Errorf("got %v", got)
	}
}

func TestLen(t *testing.T) {
	m := matcher.Build([]string{"foo", "bar"})
	if m.Len() != 2 {
		t.Errorf("got %d", m.Len())
	}
}

func TestPatternsReturnsCopy(t *testing.T) {
	src := []string{"foo"}
	m := matcher.Build(src)
	out := m.Patterns()
	out[0] = "modified"
	if m.Patterns()[0] != "foo" {
		t.Error("copy not isolated")
	}
}
