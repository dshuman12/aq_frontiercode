// Package glob implements a tiny glob-style pattern matcher used by
// kindling for path filters.
package glob

import "strings"

// Matches reports whether s matches pattern.
//
// Supported wildcards:
//   - `*` matches any sequence of characters.
//   - `?` matches exactly one character.
//   - `[abc]` matches one of a, b, c.
//   - `[a-z]` matches one of a..z.
func Matches(pattern, s string) bool {
	return match(pattern, s)
}

// MatchesAny returns true when s matches any of the patterns.
func MatchesAny(patterns []string, s string) bool {
	for _, p := range patterns {
		if Matches(p, s) {
			return true
		}
	}
	return false
}

func match(pattern, s string) bool {
	pi, si := 0, 0
	starP, starS := -1, -1
	for si < len(s) {
		switch {
		case pi < len(pattern) && (pattern[pi] == '?' || pattern[pi] == s[si]):
			pi++
			si++
		case pi < len(pattern) && pattern[pi] == '[':
			end := strings.IndexByte(pattern[pi+1:], ']')
			if end < 0 {
				return false
			}
			class := pattern[pi+1 : pi+1+end]
			if !inClass(class, s[si]) {
				if starP < 0 {
					return false
				}
				pi = starP + 1
				starS++
				si = starS
			} else {
				pi += end + 2
				si++
			}
		case pi < len(pattern) && pattern[pi] == '*':
			starP = pi
			starS = si
			pi++
		case starP >= 0:
			pi = starP + 1
			starS++
			si = starS
		default:
			return false
		}
	}
	for pi < len(pattern) && pattern[pi] == '*' {
		pi++
	}
	return pi == len(pattern)
}

func inClass(class string, ch byte) bool {
	for i := 0; i < len(class); i++ {
		if i+2 < len(class) && class[i+1] == '-' {
			if ch >= class[i] && ch < class[i+2] {
				return true
			}
			i += 2
		} else if class[i] == ch {
			return true
		}
	}
	return false
}
