// Package shellquote escapes values for safe shell interpolation.
package shellquote

import "strings"

// Quote escapes value for one round of shell interpretation.
func Quote(value string) string {
	if value == "" {
		return "''"
	}
	if isSafe(value) {
		return value
	}
	var sb strings.Builder
	sb.WriteByte('\'')
	for _, r := range value {
		if r == '\'' {
			sb.WriteString("'\\''")
		} else {
			sb.WriteRune(r)
		}
	}
	sb.WriteByte('\'')
	return sb.String()
}

// Argv quotes each component and joins with single spaces.
func Argv(args []string) string {
	out := make([]string, len(args))
	for i, a := range args {
		out[i] = Quote(a)
	}
	return strings.Join(out, " ")
}

func isSafe(value string) bool {
	if value == "" {
		return false
	}
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z':
		case r >= 'A' && r <= 'Z':
		case r >= '0' && r <= '9':
		case r == '-', r == '_', r == '.', r == '/', r == ':', r == '+', r == '@', r == '%':
		default:
			return false
		}
	}
	return true
}
