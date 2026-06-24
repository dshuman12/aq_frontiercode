// Package strs holds string helpers used across kindling.
package strs

import (
	"strings"
	"unicode"
)

// Slugify turns a free-form name into [a-z0-9-].
func Slugify(s string) string {
	var b strings.Builder
	lastDash := true
	for _, r := range s {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(unicode.ToLower(r))
			lastDash = false
		case !lastDash:
			b.WriteByte('-')
			lastDash = true
		}
	}
	out := b.String()
	return strings.Trim(out, "-")
}

// Truncate cuts s at most maxRunes runes; appends "..." if truncated.
func Truncate(s string, maxRunes int) string {
	if maxRunes <= 0 {
		return ""
	}
	count := 0
	for i := range s {
		count++
		if count > maxRunes {
			return s[:i] + "..."
		}
	}
	return s
}

// Pad right-pads s with spaces to width.
func Pad(s string, width int) string {
	if len(s) >= width {
		return s
	}
	return s + strings.Repeat(" ", width-len(s))
}

// Words splits s on whitespace, returning non-empty tokens.
func Words(s string) []string {
	out := strings.Fields(s)
	if len(out) == 0 {
		return nil
	}
	return out
}

// HasAnyPrefix reports whether s starts with any of the given prefixes.
func HasAnyPrefix(s string, prefixes ...string) bool {
	for _, p := range prefixes {
		if strings.HasPrefix(s, p) {
			return true
		}
	}
	return false
}

// QuoteIfNeeded wraps s in double quotes if it contains whitespace
// or quote chars.
func QuoteIfNeeded(s string) string {
	if s == "" {
		return `""`
	}
	for _, r := range s {
		if unicode.IsSpace(r) || r == '"' || r == '\\' {
			return strconvQuote(s)
		}
	}
	return s
}

func strconvQuote(s string) string {
	var b strings.Builder
	b.WriteByte('"')
	for _, r := range s {
		switch r {
		case '"':
			b.WriteString("\\\"")
		case '\\':
			b.WriteString("\\\\")
		default:
			b.WriteRune(r)
		}
	}
	b.WriteByte('"')
	return b.String()
}
