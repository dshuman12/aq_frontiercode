package token_test

import (
	"reflect"
	"testing"

	"github.com/dleblanc/kindling/internal/token"
)

func TestSimple(t *testing.T) {
	if got := token.Tokenize("a b c"); !reflect.DeepEqual(got, []string{"a", "b", "c"}) {
		t.Errorf("got %v", got)
	}
}

func TestDoubleQuoted(t *testing.T) {
	got := token.Tokenize(`hello "world wide"`)
	if !reflect.DeepEqual(got, []string{"hello", "world wide"}) {
		t.Errorf("got %v", got)
	}
}

func TestSingleQuoted(t *testing.T) {
	got := token.Tokenize("'a b' c")
	if !reflect.DeepEqual(got, []string{"a b", "c"}) {
		t.Errorf("got %v", got)
	}
}

func TestEscapeOutside(t *testing.T) {
	got := token.Tokenize(`a\ b c`)
	if !reflect.DeepEqual(got, []string{"a b", "c"}) {
		t.Errorf("got %v", got)
	}
}

func TestEmpty(t *testing.T) {
	if got := token.Tokenize(""); len(got) != 0 {
		t.Errorf("got %v", got)
	}
}

func TestTrailingWhitespaceNoEmpty(t *testing.T) {
	got := token.Tokenize("a   ")
	if !reflect.DeepEqual(got, []string{"a"}) {
		t.Errorf("got %v", got)
	}
}

func TestNestedQuoteStyles(t *testing.T) {
	got := token.Tokenize(`"a 'b' c"`)
	if !reflect.DeepEqual(got, []string{"a 'b' c"}) {
		t.Errorf("got %v", got)
	}
}

func TestEscapeInsideDoubleQuotes(t *testing.T) {
	got := token.Tokenize(`"a\"b"`)
	if !reflect.DeepEqual(got, []string{`a"b`}) {
		t.Errorf("got %v", got)
	}
}
