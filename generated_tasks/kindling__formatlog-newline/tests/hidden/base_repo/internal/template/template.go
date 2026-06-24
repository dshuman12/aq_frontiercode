// Package template is a tiny mustache-lite template engine.
package template

import (
	"fmt"
	"strings"
)

// Vars is a variable bag.
type Vars map[string]Value

// Kind tags variant types.
type Kind int

const (
	KStr Kind = iota
	KBool
	KList
)

// Value is one variable value.
type Value struct {
	Kind Kind
	Str  string
	Bool bool
	List []Vars
}

// Render renders template with vars.
func Render(template string, vars Vars) (string, error) {
	tokens, err := lex(template)
	if err != nil {
		return "", err
	}
	var sb strings.Builder
	idx := 0
	if err := renderBlock(tokens, &idx, vars, &sb); err != nil {
		return "", err
	}
	return sb.String(), nil
}

type tokenKind int

const (
	tText tokenKind = iota
	tVar
	tSectionOpen
	tSectionClose
	tComment
)

type token struct {
	kind  tokenKind
	value string
}

func lex(src string) ([]token, error) {
	var out []token
	var buf strings.Builder
	for i := 0; i < len(src); {
		if i+1 < len(src) && src[i] == '{' && src[i+1] == '{' {
			if buf.Len() > 0 {
				out = append(out, token{kind: tText, value: buf.String()})
				buf.Reset()
			}
			end := strings.Index(src[i+2:], "}}")
			if end < 0 {
				return nil, fmt.Errorf("template: unterminated {{")
			}
			body := strings.TrimSpace(src[i+2 : i+2+end])
			switch {
			case strings.HasPrefix(body, "!"):
				out = append(out, token{kind: tComment})
			case strings.HasPrefix(body, "#"):
				out = append(out, token{kind: tSectionOpen, value: strings.TrimSpace(body[1:])})
			case strings.HasPrefix(body, "/"):
				out = append(out, token{kind: tSectionClose, value: strings.TrimSpace(body[1:])})
			default:
				out = append(out, token{kind: tVar, value: body})
			}
			i += end + 4
			continue
		}
		buf.WriteByte(src[i])
		i++
	}
	if buf.Len() > 0 {
		out = append(out, token{kind: tText, value: buf.String()})
	}
	return out, nil
}

func renderBlock(toks []token, idx *int, vars Vars, sb *strings.Builder) error {
	for *idx < len(toks) {
		t := toks[*idx]
		switch t.kind {
		case tText:
			sb.WriteString(t.value)
			*idx++
		case tVar:
			if v, ok := vars[t.value]; ok && v.Kind == KStr {
				sb.WriteString(v.Str)
			}
			*idx++
		case tComment:
			*idx++
		case tSectionClose:
			return nil
		case tSectionOpen:
			name := t.value
			innerStart := *idx + 1
			innerEnd, err := findSectionEnd(toks, name, innerStart)
			if err != nil {
				return err
			}
			inner := toks[innerStart:innerEnd]
			v, ok := vars[name]
			switch {
			case !ok:
				// section absent - skip
			case v.Kind == KBool && v.Bool:
				j := 0
				if err := renderBlock(inner, &j, vars, sb); err != nil {
					return err
				}
			case v.Kind == KStr && v.Str != "":
				j := 0
				if err := renderBlock(inner, &j, vars, sb); err != nil {
					return err
				}
			case v.Kind == KList:
				for _, nested := range v.List {
					merged := Vars{}
					for k, vv := range vars {
						merged[k] = vv
					}
					for k, vv := range nested {
						merged[k] = vv
					}
					j := 0
					if err := renderBlock(inner, &j, merged, sb); err != nil {
						return err
					}
				}
			}
			*idx = innerEnd + 1
		}
	}
	return nil
}

func findSectionEnd(toks []token, name string, start int) (int, error) {
	depth := 1
	for i := start; i < len(toks); i++ {
		t := toks[i]
		if t.kind == tSectionOpen && t.value == name {
			depth++
		}
		if t.kind == tSectionClose && t.value == name {
			depth--
			if depth == 0 {
				return i, nil
			}
		}
	}
	return 0, fmt.Errorf("template: unclosed section %q", name)
}
