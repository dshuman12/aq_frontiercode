// Package textproc collects small text-processing utilities used by
// kindling's loaders: word splitting that respects quotes, line
// normalisation, character-class detection, and Knuth-Morris-Pratt
// substring search for hot paths.
package textproc

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

// SplitWords splits s into whitespace-separated words while respecting
// double-quoted segments.
func SplitWords(s string) []string {
	var out []string
	var cur strings.Builder
	inQuote := false
	flush := func() {
		if cur.Len() > 0 {
			out = append(out, cur.String())
			cur.Reset()
		}
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case c == '"':
			inQuote = !inQuote
		case (c == ' ' || c == '\t') && !inQuote:
			flush()
		default:
			cur.WriteByte(c)
		}
	}
	flush()
	return out
}

// NormalizeNewlines replaces \r\n and \r with \n.
func NormalizeNewlines(s string) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	return strings.ReplaceAll(s, "\r", "\n")
}

// IsPrintable reports whether s contains only printable runes.
func IsPrintable(s string) bool {
	for _, r := range s {
		if !unicode.IsPrint(r) {
			return false
		}
	}
	return true
}

// IndexKMP returns the first index of needle in haystack using
// Knuth-Morris-Pratt; -1 if absent.
func IndexKMP(haystack, needle string) int {
	if needle == "" {
		return 0
	}
	table := computeKMPTable(needle)
	i, j := 0, 0
	for i < len(haystack) {
		if haystack[i] == needle[j] {
			i++
			j++
			if j == len(needle) {
				return i - j
			}
			continue
		}
		if j > 0 {
			j = table[j-1]
		} else {
			i++
		}
	}
	return -1
}

func computeKMPTable(needle string) []int {
	t := make([]int, len(needle))
	k := 0
	for i := 1; i < len(needle); i++ {
		for k > 0 && needle[k] != needle[i] {
			k = t[k-1]
		}
		if needle[k] == needle[i] {
			k++
		}
		t[i] = k
	}
	return t
}

// CountOccurrences returns the number of non-overlapping occurrences of
// needle in haystack.
func CountOccurrences(haystack, needle string) int {
	if needle == "" {
		return 0
	}
	count := 0
	for {
		i := IndexKMP(haystack, needle)
		if i < 0 {
			return count
		}
		count++
		haystack = haystack[i+len(needle):]
	}
}

// WrapLines wraps s into lines of at most width runes, preferring word
// boundaries.
func WrapLines(s string, width int) []string {
	if width <= 0 {
		return []string{s}
	}
	words := strings.Fields(s)
	var out []string
	var cur strings.Builder
	for _, w := range words {
		if cur.Len() == 0 {
			cur.WriteString(w)
			continue
		}
		if cur.Len()+1+len(w) > width {
			out = append(out, cur.String())
			cur.Reset()
			cur.WriteString(w)
			continue
		}
		cur.WriteByte(' ')
		cur.WriteString(w)
	}
	if cur.Len() > 0 {
		out = append(out, cur.String())
	}
	return out
}

// LongestCommonPrefix returns the longest string prefix shared by s.
func LongestCommonPrefix(s []string) string {
	if len(s) == 0 {
		return ""
	}
	prefix := s[0]
	for _, str := range s[1:] {
		i := 0
		max := len(prefix)
		if len(str) < max {
			max = len(str)
		}
		for i < max && prefix[i] == str[i] {
			i++
		}
		prefix = prefix[:i]
	}
	return prefix
}

// CharFrequencies returns the count of each rune in s, useful for
// quick fingerprinting of message templates.
func CharFrequencies(s string) map[rune]int {
	out := map[rune]int{}
	for _, r := range s {
		out[r]++
	}
	return out
}

// Truncate returns s shortened to at most n runes, appending an ellipsis
// when truncation occurs.
func Truncate(s string, n int) string {
	if n <= 0 {
		return ""
	}
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	if n <= 1 {
		return "…"
	}
	count := 0
	for i := range s {
		count++
		if count == n {
			return s[:i+1] + "…"
		}
	}
	return s
}
