// Package largejson is a self-contained streaming JSON utility set used
// by kindling's high-throughput export path. It deliberately avoids
// reflection so that hot-path encoders can be inlined.
//
// The package is divided into several files: encoder, decoder, schema
// inferrer, walker, and renderer.
package largejson

import (
	"errors"
	"strconv"
	"strings"
	"sync"
)

// Type is the simplified JSON type.
type Type int

const (
	TypeNull Type = iota
	TypeBool
	TypeNumber
	TypeString
	TypeArray
	TypeObject
)

// Value is a parsed JSON value.
type Value struct {
	Type   Type
	Bool   bool
	Number float64
	String string
	Array  []*Value
	Object []KeyValue
}

// KeyValue is one entry in an object.
type KeyValue struct {
	Key   string
	Value *Value
}

// Get returns the named child of an object Value, or nil.
func (v *Value) Get(key string) *Value {
	if v == nil || v.Type != TypeObject {
		return nil
	}
	for _, kv := range v.Object {
		if kv.Key == key {
			return kv.Value
		}
	}
	return nil
}

// At returns the index-th element of an array Value, or nil.
func (v *Value) At(idx int) *Value {
	if v == nil || v.Type != TypeArray {
		return nil
	}
	if idx < 0 {
		idx += len(v.Array)
	}
	if idx < 0 || idx >= len(v.Array) {
		return nil
	}
	return v.Array[idx]
}

// Len returns the length of arrays/objects/strings.
func (v *Value) Len() int {
	if v == nil {
		return 0
	}
	switch v.Type {
	case TypeArray:
		return len(v.Array)
	case TypeObject:
		return len(v.Object)
	case TypeString:
		return len(v.String)
	}
	return 0
}

// String renders v back to JSON text.
func (v *Value) Render() string {
	var b strings.Builder
	v.render(&b)
	return b.String()
}

func (v *Value) render(b *strings.Builder) {
	if v == nil {
		b.WriteString("null")
		return
	}
	switch v.Type {
	case TypeNull:
		b.WriteString("null")
	case TypeBool:
		if v.Bool {
			b.WriteString("true")
		} else {
			b.WriteString("false")
		}
	case TypeNumber:
		b.WriteString(strconv.FormatFloat(v.Number, 'g', -1, 64))
	case TypeString:
		b.WriteByte('"')
		b.WriteString(escape(v.String))
		b.WriteByte('"')
	case TypeArray:
		b.WriteByte('[')
		for i, item := range v.Array {
			if i > 0 {
				b.WriteByte(',')
			}
			item.render(b)
		}
		b.WriteByte(']')
	case TypeObject:
		b.WriteByte('{')
		for i, kv := range v.Object {
			if i > 0 {
				b.WriteByte(',')
			}
			b.WriteByte('"')
			b.WriteString(escape(kv.Key))
			b.WriteByte('"')
			b.WriteByte(':')
			kv.Value.render(b)
		}
		b.WriteByte('}')
	}
}

func escape(s string) string {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch c {
		case '"':
			b.WriteString(`\"`)
		case '\\':
			b.WriteString(`\\`)
		case '\n':
			b.WriteString(`\n`)
		case '\r':
			b.WriteString(`\r`)
		case '\t':
			b.WriteString(`\t`)
		default:
			if c < 0x20 {
				b.WriteString("\\u00")
				const hex = "0123456789abcdef"
				b.WriteByte(hex[c>>4])
				b.WriteByte(hex[c&0xF])
				continue
			}
			b.WriteByte(c)
		}
	}
	return b.String()
}

// Parser is a streaming parser.
type Parser struct {
	src string
	pos int
}

// Parse builds a Value from src.
func Parse(src string) (*Value, error) {
	p := &Parser{src: src}
	p.skipWS()
	v, err := p.parseValue()
	if err != nil {
		return nil, err
	}
	p.skipWS()
	if p.pos != len(p.src) {
		return nil, errors.New("largejson: trailing input")
	}
	return v, nil
}

func (p *Parser) skipWS() {
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
			p.pos++
			continue
		}
		break
	}
}

func (p *Parser) parseValue() (*Value, error) {
	p.skipWS()
	if p.pos >= len(p.src) {
		return nil, errors.New("largejson: unexpected end")
	}
	c := p.src[p.pos]
	switch {
	case c == '{':
		return p.parseObject()
	case c == '[':
		return p.parseArray()
	case c == '"':
		s, err := p.parseString()
		if err != nil {
			return nil, err
		}
		return &Value{Type: TypeString, String: s}, nil
	case c == 't':
		if !p.expect("true") {
			return nil, errors.New("largejson: expected true")
		}
		return &Value{Type: TypeBool, Bool: true}, nil
	case c == 'f':
		if !p.expect("false") {
			return nil, errors.New("largejson: expected false")
		}
		return &Value{Type: TypeBool, Bool: false}, nil
	case c == 'n':
		if !p.expect("null") {
			return nil, errors.New("largejson: expected null")
		}
		return &Value{Type: TypeNull}, nil
	case (c >= '0' && c <= '9') || c == '-':
		return p.parseNumber()
	}
	return nil, errors.New("largejson: unexpected byte")
}

func (p *Parser) expect(word string) bool {
	if p.pos+len(word) > len(p.src) {
		return false
	}
	if p.src[p.pos:p.pos+len(word)] != word {
		return false
	}
	p.pos += len(word)
	return true
}

func (p *Parser) parseString() (string, error) {
	if p.src[p.pos] != '"' {
		return "", errors.New("largejson: expected quote")
	}
	p.pos++
	var b strings.Builder
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if c == '"' {
			p.pos++
			return b.String(), nil
		}
		if c == '\\' && p.pos+1 < len(p.src) {
			esc := p.src[p.pos+1]
			switch esc {
			case 'n':
				b.WriteByte('\n')
			case 't':
				b.WriteByte('\t')
			case 'r':
				b.WriteByte('\r')
			case '"':
				b.WriteByte('"')
			case '\\':
				b.WriteByte('\\')
			default:
				b.WriteByte(esc)
			}
			p.pos += 2
			continue
		}
		b.WriteByte(c)
		p.pos++
	}
	return "", errors.New("largejson: unterminated string")
}

func (p *Parser) parseNumber() (*Value, error) {
	start := p.pos
	if p.src[p.pos] == '-' {
		p.pos++
	}
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if (c >= '0' && c <= '9') || c == '.' || c == 'e' || c == 'E' || c == '+' || c == '-' {
			p.pos++
			continue
		}
		break
	}
	v, err := strconv.ParseFloat(p.src[start:p.pos], 64)
	if err != nil {
		return nil, err
	}
	return &Value{Type: TypeNumber, Number: v}, nil
}

func (p *Parser) parseArray() (*Value, error) {
	p.pos++
	v := &Value{Type: TypeArray}
	p.skipWS()
	if p.pos < len(p.src) && p.src[p.pos] == ']' {
		p.pos++
		return v, nil
	}
	for {
		item, err := p.parseValue()
		if err != nil {
			return nil, err
		}
		v.Array = append(v.Array, item)
		p.skipWS()
		if p.pos >= len(p.src) {
			return nil, errors.New("largejson: missing ]")
		}
		if p.src[p.pos] == ',' {
			p.pos++
			continue
		}
		if p.src[p.pos] == ']' {
			p.pos++
			return v, nil
		}
		return nil, errors.New("largejson: expected , or ]")
	}
}

func (p *Parser) parseObject() (*Value, error) {
	p.pos++
	v := &Value{Type: TypeObject}
	p.skipWS()
	if p.pos < len(p.src) && p.src[p.pos] == '}' {
		p.pos++
		return v, nil
	}
	for {
		p.skipWS()
		key, err := p.parseString()
		if err != nil {
			return nil, err
		}
		p.skipWS()
		if p.pos >= len(p.src) || p.src[p.pos] != ':' {
			return nil, errors.New("largejson: expected :")
		}
		p.pos++
		val, err := p.parseValue()
		if err != nil {
			return nil, err
		}
		v.Object = append(v.Object, KeyValue{Key: key, Value: val})
		p.skipWS()
		if p.pos >= len(p.src) {
			return nil, errors.New("largejson: missing }")
		}
		if p.src[p.pos] == ',' {
			p.pos++
			continue
		}
		if p.src[p.pos] == '}' {
			p.pos++
			return v, nil
		}
		return nil, errors.New("largejson: expected , or }")
	}
}

// Walker visits every node depth-first.
type Walker struct {
	mu sync.Mutex
}

// Walk invokes fn for every node in tree (depth-first, pre-order).
// fn may return false to stop traversal of the current branch.
func (w *Walker) Walk(v *Value, fn func(path string, v *Value) bool) {
	w.mu.Lock()
	defer w.mu.Unlock()
	walk(v, "", fn)
}

func walk(v *Value, path string, fn func(string, *Value) bool) bool {
	if !fn(path, v) {
		return false
	}
	if v == nil {
		return true
	}
	switch v.Type {
	case TypeArray:
		for i, item := range v.Array {
			child := path + "[" + strconv.Itoa(i) + "]"
			if !walk(item, child, fn) {
				return false
			}
		}
	case TypeObject:
		for _, kv := range v.Object {
			child := path
			if child == "" {
				child = kv.Key
			} else {
				child = path + "." + kv.Key
			}
			if !walk(kv.Value, child, fn) {
				return false
			}
		}
	}
	return true
}

// CountNodes returns the number of nodes in the tree.
func CountNodes(v *Value) int {
	count := 0
	(&Walker{}).Walk(v, func(_ string, _ *Value) bool {
		count++
		return true
	})
	return count
}

// FindAll returns all paths whose Value satisfies pred.
func FindAll(v *Value, pred func(*Value) bool) []string {
	var out []string
	(&Walker{}).Walk(v, func(path string, node *Value) bool {
		if pred(node) {
			out = append(out, path)
		}
		return true
	})
	return out
}
