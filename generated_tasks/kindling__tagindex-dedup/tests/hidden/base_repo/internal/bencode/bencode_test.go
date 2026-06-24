package bencode_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/bencode"
)

func TestInt(t *testing.T) {
	if got := string(bencode.Encode(bencode.Int(42))); got != "i42e" {
		t.Errorf("got %q", got)
	}
}

func TestNegativeInt(t *testing.T) {
	if got := string(bencode.Encode(bencode.Int(-7))); got != "i-7e" {
		t.Errorf("got %q", got)
	}
}

func TestBytes(t *testing.T) {
	if got := string(bencode.Encode(bencode.String("foo"))); got != "3:foo" {
		t.Errorf("got %q", got)
	}
}

func TestEmptyBytes(t *testing.T) {
	if got := string(bencode.Encode(bencode.String(""))); got != "0:" {
		t.Errorf("got %q", got)
	}
}

func TestList(t *testing.T) {
	v := bencode.List(bencode.String("a"), bencode.Int(1))
	got := string(bencode.Encode(v))
	if got != "l1:ai1ee" {
		t.Errorf("got %q", got)
	}
}

func TestDictSorted(t *testing.T) {
	v := bencode.Dict(map[string]bencode.Value{
		"b": bencode.Int(2),
		"a": bencode.Int(1),
	})
	got := string(bencode.Encode(v))
	if got != "d1:ai1e1:bi2ee" {
		t.Errorf("got %q", got)
	}
}
