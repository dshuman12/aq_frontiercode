package textproc

import "testing"

func TestSplitWords(t *testing.T) {
	got := SplitWords(`alpha "beta gamma"  delta`)
	if len(got) != 3 || got[1] != "beta gamma" {
		t.Fatalf("got %v", got)
	}
}

func TestNormalizeNewlines(t *testing.T) {
	if NormalizeNewlines("a\r\nb\rc") != "a\nb\nc" {
		t.Fatal("normalise")
	}
}

func TestIndexKMP(t *testing.T) {
	if IndexKMP("abxabcabcaby", "abcaby") != 6 {
		t.Fatal("kmp")
	}
	if IndexKMP("hello", "world") != -1 {
		t.Fatal("kmp negative")
	}
}

func TestCountOccurrences(t *testing.T) {
	if CountOccurrences("aaaaa", "aa") != 2 {
		t.Fatal("count")
	}
}

func TestWrapLines(t *testing.T) {
	out := WrapLines("the quick brown fox jumps over the lazy dog", 12)
	if len(out) < 4 {
		t.Fatalf("lines %v", out)
	}
}

func TestLongestCommonPrefix(t *testing.T) {
	if got := LongestCommonPrefix([]string{"flower", "flow", "flight"}); got != "fl" {
		t.Fatalf("got %q", got)
	}
}

func TestCharFrequencies(t *testing.T) {
	f := CharFrequencies("aabbc")
	if f['a'] != 2 || f['b'] != 2 || f['c'] != 1 {
		t.Fatalf("freq %v", f)
	}
}

func TestTruncate(t *testing.T) {
	if Truncate("hello world", 5) != "hell…" {
		t.Fatalf("got %q", Truncate("hello world", 5))
	}
	if Truncate("short", 100) != "short" {
		t.Fatal("short")
	}
}

func TestIsPrintable(t *testing.T) {
	if !IsPrintable("Hello") {
		t.Fatal("printable")
	}
	if IsPrintable("a\x00b") {
		t.Fatal("nonprintable")
	}
}
