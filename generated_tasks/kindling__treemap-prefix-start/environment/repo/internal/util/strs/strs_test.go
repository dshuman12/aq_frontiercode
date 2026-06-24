package strs_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/util/strs"
)

func TestSlugify(t *testing.T) {
	cases := map[string]string{
		"Hello World":  "hello-world",
		"  spaces  ":   "spaces",
		"a/b/c":        "a-b-c",
		"UPPER_case":   "upper-case",
		"":             "",
		"already-ok":   "already-ok",
	}
	for in, want := range cases {
		if got := strs.Slugify(in); got != want {
			t.Errorf("Slugify(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestTruncate(t *testing.T) {
	if got := strs.Truncate("hello", 10); got != "hello" {
		t.Errorf("short string truncated: %q", got)
	}
	if got := strs.Truncate("hello world", 5); got != "hello..." {
		t.Errorf("got %q", got)
	}
	if got := strs.Truncate("anything", 0); got != "" {
		t.Errorf("zero len: %q", got)
	}
}

func TestPad(t *testing.T) {
	if got := strs.Pad("a", 4); got != "a   " {
		t.Errorf("got %q", got)
	}
	if got := strs.Pad("abcdef", 3); got != "abcdef" {
		t.Errorf("overlong shrunk: %q", got)
	}
}

func TestWords(t *testing.T) {
	if got := strs.Words("  a  b  c "); len(got) != 3 {
		t.Fatalf("got %v", got)
	}
	if got := strs.Words(""); got != nil {
		t.Errorf("empty input not nil: %v", got)
	}
}

func TestHasAnyPrefix(t *testing.T) {
	if !strs.HasAnyPrefix("hello", "foo", "hel") {
		t.Errorf("expected match")
	}
	if strs.HasAnyPrefix("hello", "foo", "bar") {
		t.Errorf("unexpected match")
	}
}

func TestQuoteIfNeeded(t *testing.T) {
	if got := strs.QuoteIfNeeded("plain"); got != "plain" {
		t.Errorf("unexpected quoting: %q", got)
	}
	if got := strs.QuoteIfNeeded("with space"); got[0] != '"' {
		t.Errorf("expected quote: %q", got)
	}
	if got := strs.QuoteIfNeeded(""); got != `""` {
		t.Errorf("empty quoting: %q", got)
	}
}
