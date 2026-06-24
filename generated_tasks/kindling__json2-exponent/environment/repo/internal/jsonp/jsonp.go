// Package jsonp is a tiny RFC 8259 JSON parser used inside the
// kindling loader.
//
// The package favors clarity over speed; unmarshaling tens of MiB
// is fine but multi-GiB would be better served by a streaming parser.
package jsonp

import (
	"fmt"
	"strconv"
	"strings"
)

// Kind tags every node.
type Kind int

const (
	KindNull Kind = iota
	KindBool
	KindNumber
	KindString
	KindArray
	KindObject
)

// Value is one parsed node.
type Value struct {
	Kind   Kind
	Bool   bool
	Num    float64
	Str    string
	Array  []Value
	Object map[string]Value
}

// Parse converts s to a Value.
func Parse(s string) (Value, error) {
	p := &parser{src: s}
	v, err := p.parseValue()
	if err != nil {
		return Value{}, err
	}
	p.skipWhitespace()
	if p.pos != len(p.src) {
		return Value{}, fmt.Errorf("jsonp: trailing input at %d", p.pos)
	}
	return v, nil
}

type parser struct {
	src string
	pos int
}

func (p *parser) parseValue() (Value, error) {
	p.skipWhitespace()
	if p.pos >= len(p.src) {
		return Value{}, fmt.Errorf("jsonp: unexpected EOF")
	}
	switch ch := p.src[p.pos]; {
	case ch == 'n':
		return p.parseLiteral("null", Value{Kind: KindNull})
	case ch == 't':
		return p.parseLiteral("true", Value{Kind: KindBool, Bool: true})
	case ch == 'f':
		return p.parseLiteral("false", Value{Kind: KindBool, Bool: false})
	case ch == '"':
		s, err := p.parseString()
		return Value{Kind: KindString, Str: s}, err
	case ch == '[':
		return p.parseArray()
	case ch == '{':
		return p.parseObject()
	case ch == '-' || (ch >= '0' && ch <= '9'):
		return p.parseNumber()
	default:
		return Value{}, fmt.Errorf("jsonp: unexpected '%c' at %d", ch, p.pos)
	}
}

func (p *parser) parseLiteral(want string, v Value) (Value, error) {
	if p.pos+len(want) > len(p.src) || p.src[p.pos:p.pos+len(want)] != want {
		return Value{}, fmt.Errorf("jsonp: expected %q at %d", want, p.pos)
	}
	p.pos += len(want)
	return v, nil
}

func (p *parser) parseString() (string, error) {
	if p.pos >= len(p.src) || p.src[p.pos] != '"' {
		return "", fmt.Errorf("jsonp: expected '\"' at %d", p.pos)
	}
	p.pos++
	var sb strings.Builder
	for p.pos < len(p.src) {
		ch := p.src[p.pos]
		if ch == '"' {
			p.pos++
			return sb.String(), nil
		}
		if ch == '\\' && p.pos+1 < len(p.src) {
			esc := p.src[p.pos+1]
			switch esc {
			case '"':
				sb.WriteByte('"')
			case '\\':
				sb.WriteByte('\\')
			case '/':
				sb.WriteByte('/')
			case 'n':
				sb.WriteByte('\n')
			case 't':
				sb.WriteByte('\t')
			case 'r':
				sb.WriteByte('\r')
			case 'b':
				sb.WriteByte('\b')
			case 'f':
				sb.WriteByte('\f')
			case 'u':
				if p.pos+6 > len(p.src) {
					return "", fmt.Errorf("jsonp: short \\u")
				}
				cp, err := strconv.ParseInt(p.src[p.pos+2:p.pos+6], 16, 32)
				if err != nil {
					return "", err
				}
				sb.WriteRune(rune(cp))
				p.pos += 6
				continue
			default:
				return "", fmt.Errorf("jsonp: bad escape \\%c", esc)
			}
			p.pos += 2
			continue
		}
		sb.WriteByte(ch)
		p.pos++
	}
	return "", fmt.Errorf("jsonp: unterminated string")
}

func (p *parser) parseNumber() (Value, error) {
	start := p.pos
	if p.src[p.pos] == '-' {
		p.pos++
	}
	for p.pos < len(p.src) {
		ch := p.src[p.pos]
		if (ch >= '0' && ch <= '9') || ch == '.' || ch == 'e' || ch == 'E' || ch == '+' || ch == '-' {
			p.pos++
			continue
		}
		break
	}
	n, err := strconv.ParseFloat(p.src[start:p.pos], 64)
	if err != nil {
		return Value{}, fmt.Errorf("jsonp: bad number %q", p.src[start:p.pos])
	}
	return Value{Kind: KindNumber, Num: n}, nil
}

func (p *parser) parseArray() (Value, error) {
	p.pos++
	out := Value{Kind: KindArray}
	p.skipWhitespace()
	if p.pos < len(p.src) && p.src[p.pos] == ']' {
		p.pos++
		return out, nil
	}
	for {
		v, err := p.parseValue()
		if err != nil {
			return Value{}, err
		}
		out.Array = append(out.Array, v)
		p.skipWhitespace()
		if p.pos >= len(p.src) {
			return Value{}, fmt.Errorf("jsonp: unterminated array")
		}
		switch p.src[p.pos] {
		case ',':
			p.pos++
		case ']':
			p.pos++
			return out, nil
		default:
			return Value{}, fmt.Errorf("jsonp: expected ',' or ']' at %d", p.pos)
		}
	}
}

func (p *parser) parseObject() (Value, error) {
	p.pos++
	out := Value{Kind: KindObject, Object: map[string]Value{}}
	p.skipWhitespace()
	if p.pos < len(p.src) && p.src[p.pos] == '}' {
		p.pos++
		return out, nil
	}
	for {
		p.skipWhitespace()
		key, err := p.parseString()
		if err != nil {
			return Value{}, err
		}
		p.skipWhitespace()
		if p.pos >= len(p.src) || p.src[p.pos] != ':' {
			return Value{}, fmt.Errorf("jsonp: expected ':' at %d", p.pos)
		}
		p.pos++
		v, err := p.parseValue()
		if err != nil {
			return Value{}, err
		}
		out.Object[key] = v
		p.skipWhitespace()
		if p.pos >= len(p.src) {
			return Value{}, fmt.Errorf("jsonp: unterminated object")
		}
		switch p.src[p.pos] {
		case ',':
			p.pos++
		case '}':
			p.pos++
			return out, nil
		default:
			return Value{}, fmt.Errorf("jsonp: expected ',' or '}' at %d", p.pos)
		}
	}
}

func (p *parser) skipWhitespace() {
	for p.pos < len(p.src) {
		switch p.src[p.pos] {
		case ' ', '\t', '\n', '\r':
			p.pos++
		default:
			return
		}
	}
}
