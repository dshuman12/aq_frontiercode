// Package token implements quote-aware argv tokenization.
package token

import "strings"

// Tokenize splits input into argv-shaped tokens, respecting single
// and double quotes plus backslash escaping.
func Tokenize(input string) []string {
	var out []string
	var buf strings.Builder
	state := stateOutside
	i := 0
	for i < len(input) {
		ch := input[i]
		switch state {
		case stateOutside:
			switch ch {
			case ' ', '\t':
				if buf.Len() > 0 {
					out = append(out, buf.String())
					buf.Reset()
				}
			case '\'':
				state = stateSingle
			case '"':
				state = stateDouble
			case '\\':
				if i+1 < len(input) {
					buf.WriteByte(input[i+1])
					i++
				}
			default:
				buf.WriteByte(ch)
			}
		case stateSingle:
			if ch == '\'' {
				state = stateOutside
			} else {
				buf.WriteByte(ch)
			}
		case stateDouble:
			switch ch {
			case '"':
				state = stateOutside
			case '\\':
				if i+1 < len(input) {
					buf.WriteByte(input[i+1])
					i++
				}
			default:
				buf.WriteByte(ch)
			}
		}
		i++
	}
	if buf.Len() > 0 {
		out = append(out, buf.String())
	}
	return out
}

const (
	stateOutside = iota
	stateSingle
	stateDouble
)
