package glob_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/glob"
)

func TestLiteralMatch(t *testing.T) {
	if !glob.Matches("hello", "hello") {
		t.Error("exact match failed")
	}
	if glob.Matches("hello", "world") {
		t.Error("unexpected match")
	}
}

func TestStarMatch(t *testing.T) {
	cases := []struct {
		pattern, s string
		want       bool
	}{
		{"*.log", "kindling.log", true},
		{"*.log", "kindling.txt", false},
		{"*.*", "x.y", true},
		{"foo*", "foobar", true},
		{"*foo", "barfoo", true},
		{"f*r", "foobar", true},
		{"f*z", "foobar", false},
	}
	for _, tc := range cases {
		if got := glob.Matches(tc.pattern, tc.s); got != tc.want {
			t.Errorf("Matches(%q, %q) = %v, want %v", tc.pattern, tc.s, got, tc.want)
		}
	}
}

func TestQuestionMark(t *testing.T) {
	if !glob.Matches("a?c", "abc") {
		t.Error("?")
	}
	if glob.Matches("a?c", "ac") {
		t.Error("? matches zero")
	}
}

func TestCharClass(t *testing.T) {
	if !glob.Matches("[abc]oo", "boo") {
		t.Error("class")
	}
	if glob.Matches("[abc]oo", "doo") {
		t.Error("class miss")
	}
}

func TestRangeClass(t *testing.T) {
	if !glob.Matches("[a-z]", "f") {
		t.Error("range")
	}
	if glob.Matches("[a-z]", "F") {
		t.Error("range miss")
	}
}

func TestEmptyPattern(t *testing.T) {
	if !glob.Matches("", "") {
		t.Error("empty")
	}
	if glob.Matches("", "x") {
		t.Error("empty matched non-empty")
	}
}

func TestStarAllowsEmpty(t *testing.T) {
	if !glob.Matches("*", "") {
		t.Error("*")
	}
	if !glob.Matches("**", "anything") {
		t.Error("**")
	}
}

func TestMatchesAny(t *testing.T) {
	pats := []string{"*.log", "*.tmp"}
	if !glob.MatchesAny(pats, "kindling.log") {
		t.Error("first pattern")
	}
	if !glob.MatchesAny(pats, "kindling.tmp") {
		t.Error("second pattern")
	}
	if glob.MatchesAny(pats, "kindling.txt") {
		t.Error("no match")
	}
}
