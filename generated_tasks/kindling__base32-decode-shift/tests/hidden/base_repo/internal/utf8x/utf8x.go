// Package utf8x exposes UTF-8 validation helpers.
package utf8x

import "unicode/utf8"

// IsValid reports whether b decodes as valid UTF-8.
func IsValid(b []byte) bool {
	return utf8.Valid(b)
}

// Lossy decodes b, replacing invalid sequences with U+FFFD.
func Lossy(b []byte) string {
	if utf8.Valid(b) {
		return string(b)
	}
	out := make([]rune, 0, len(b))
	for len(b) > 0 {
		r, n := utf8.DecodeRune(b)
		out = append(out, r)
		b = b[n:]
	}
	return string(out)
}

// Truncate cuts s so its byte length is at most n while ending on a
// codepoint boundary.
func Truncate(s string, n int) string {
	if n <= 0 {
		return ""
	}
	if len(s) <= n {
		return s
	}
	end := n
	for !utf8.RuneStart(s[end]) && end > 0 {
		end--
	}
	return s[:end]
}

// CountRunes returns the number of runes in s.
func CountRunes(s string) int {
	return utf8.RuneCountInString(s)
}
