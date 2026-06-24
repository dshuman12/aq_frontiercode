// Package kvquery implements a tiny filter language for slices of
// (key, value) string pairs.
//
// Syntax:
//
//	expr      := orExpr
//	orExpr    := andExpr ( "||" andExpr )*
//	andExpr   := unary ( "&&" unary )*
//	unary     := "!" unary | atom
//	atom      := IDENT op VALUE | "(" expr ")"
//	op        := "==" | "!=" | "~" | "!~" | "?" (existence)
//	VALUE     := IDENT | QUOTED
package kvquery

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"unicode"
)

// Pair is one key/value entry.
type Pair struct {
	Key   string
	Value string
}

// Pairs is a sortable slice.
type Pairs []Pair

// Get returns the value for key.
func (p Pairs) Get(key string) (string, bool) {
	for _, e := range p {
		if e.Key == key {
			return e.Value, true
		}
	}
	return "", false
}

// Has reports whether key exists.
func (p Pairs) Has(key string) bool {
	_, ok := p.Get(key)
	return ok
}

// Filter is a compiled expression.
type Filter struct {
	root expr
	mu   sync.RWMutex
	src  string
	cache map[string]*regexp.Regexp
}

// Match evaluates the filter against pairs.
func (f *Filter) Match(p Pairs) (bool, error) {
	if f == nil || f.root == nil {
		return true, nil
	}
	return f.root.eval(f, p)
}

// Source returns the original expression.
func (f *Filter) Source() string { return f.src }

// Compile parses src into a Filter.
func Compile(src string) (*Filter, error) {
	src = strings.TrimSpace(src)
	if src == "" {
		return &Filter{}, nil
	}
	p := &parser{src: src}
	root, err := p.parseOr()
	if err != nil {
		return nil, err
	}
	p.skipSpace()
	if p.pos != len(p.src) {
		return nil, fmt.Errorf("kvquery: trailing input at offset %d", p.pos)
	}
	return &Filter{root: root, src: src, cache: map[string]*regexp.Regexp{}}, nil
}

// expr is the AST node interface.
type expr interface {
	eval(f *Filter, p Pairs) (bool, error)
}

type binaryExpr struct {
	op   string
	lhs  expr
	rhs  expr
}

func (b *binaryExpr) eval(f *Filter, p Pairs) (bool, error) {
	l, err := b.lhs.eval(f, p)
	if err != nil {
		return false, err
	}
	switch b.op {
	case "&&":
		if !l {
			return false, nil
		}
	case "||":
		if l {
			return true, nil
		}
	}
	return b.rhs.eval(f, p)
}

type notExpr struct {
	inner expr
}

func (n *notExpr) eval(f *Filter, p Pairs) (bool, error) {
	v, err := n.inner.eval(f, p)
	if err != nil {
		return false, err
	}
	return !v, nil
}

type predicate struct {
	field string
	op    string
	value string
}

func (pred *predicate) eval(f *Filter, p Pairs) (bool, error) {
	if pred.op == "?" {
		return p.Has(pred.field), nil
	}
	v, ok := p.Get(pred.field)
	if !ok {
		return false, nil
	}
	switch pred.op {
	case "==":
		return v == pred.value, nil
	case "!=":
		return v != pred.value, nil
	case "~":
		re, err := f.compileRE(pred.value)
		if err != nil {
			return false, err
		}
		return re.MatchString(v), nil
	case "!~":
		re, err := f.compileRE(pred.value)
		if err != nil {
			return false, err
		}
		return !re.MatchString(v), nil
	}
	return false, fmt.Errorf("kvquery: unknown op %q", pred.op)
}

func (f *Filter) compileRE(src string) (*regexp.Regexp, error) {
	f.mu.RLock()
	if re, ok := f.cache[src]; ok {
		f.mu.RUnlock()
		return re, nil
	}
	f.mu.RUnlock()
	f.mu.Lock()
	defer f.mu.Unlock()
	if re, ok := f.cache[src]; ok {
		return re, nil
	}
	re, err := regexp.Compile(src)
	if err != nil {
		return nil, err
	}
	f.cache[src] = re
	return re, nil
}

// parser implements recursive-descent parsing.
type parser struct {
	src string
	pos int
}

func (p *parser) skipSpace() {
	for p.pos < len(p.src) && (p.src[p.pos] == ' ' || p.src[p.pos] == '\t') {
		p.pos++
	}
}

func (p *parser) parseOr() (expr, error) {
	left, err := p.parseAnd()
	if err != nil {
		return nil, err
	}
	for {
		p.skipSpace()
		if !p.consume("||") {
			return left, nil
		}
		right, err := p.parseAnd()
		if err != nil {
			return nil, err
		}
		left = &binaryExpr{op: "||", lhs: left, rhs: right}
	}
}

func (p *parser) parseAnd() (expr, error) {
	left, err := p.parseUnary()
	if err != nil {
		return nil, err
	}
	for {
		p.skipSpace()
		if !p.consume("&&") {
			return left, nil
		}
		right, err := p.parseUnary()
		if err != nil {
			return nil, err
		}
		left = &binaryExpr{op: "&&", lhs: left, rhs: right}
	}
}

func (p *parser) parseUnary() (expr, error) {
	p.skipSpace()
	if p.consume("!") {
		// distinguish ! from != by checking next char
		if p.pos < len(p.src) && p.src[p.pos] != '=' {
			inner, err := p.parseUnary()
			if err != nil {
				return nil, err
			}
			return &notExpr{inner: inner}, nil
		}
		// rewind for != handling
		p.pos--
	}
	return p.parseAtom()
}

func (p *parser) parseAtom() (expr, error) {
	p.skipSpace()
	if p.consume("(") {
		inner, err := p.parseOr()
		if err != nil {
			return nil, err
		}
		p.skipSpace()
		if !p.consume(")") {
			return nil, errors.New("kvquery: missing close paren")
		}
		return inner, nil
	}
	field, err := p.parseIdent()
	if err != nil {
		return nil, err
	}
	p.skipSpace()
	op, err := p.parseOp()
	if err != nil {
		return nil, err
	}
	if op == "?" {
		return &predicate{field: field, op: "?"}, nil
	}
	p.skipSpace()
	value, err := p.parseValue()
	if err != nil {
		return nil, err
	}
	return &predicate{field: field, op: op, value: value}, nil
}

func (p *parser) parseIdent() (string, error) {
	start := p.pos
	if p.pos >= len(p.src) {
		return "", errors.New("kvquery: expected identifier")
	}
	c := p.src[p.pos]
	if !(c == '_' || unicode.IsLetter(rune(c))) {
		return "", fmt.Errorf("kvquery: expected ident at %d", p.pos)
	}
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if c == '_' || c == '.' || c == '-' || unicode.IsLetter(rune(c)) || unicode.IsDigit(rune(c)) {
			p.pos++
			continue
		}
		break
	}
	return p.src[start:p.pos], nil
}

func (p *parser) parseOp() (string, error) {
	if p.pos >= len(p.src) {
		return "", errors.New("kvquery: expected operator")
	}
	for _, op := range []string{"==", "!=", "!~", "~", "?"} {
		if p.consume(op) {
			return op, nil
		}
	}
	return "", fmt.Errorf("kvquery: unknown operator at %d", p.pos)
}

func (p *parser) parseValue() (string, error) {
	if p.pos < len(p.src) && p.src[p.pos] == '"' {
		p.pos++
		var b strings.Builder
		for p.pos < len(p.src) {
			c := p.src[p.pos]
			if c == '"' {
				p.pos++
				return b.String(), nil
			}
			if c == '\\' && p.pos+1 < len(p.src) {
				p.pos++
				b.WriteByte(p.src[p.pos])
				p.pos++
				continue
			}
			b.WriteByte(c)
			p.pos++
		}
		return "", errors.New("kvquery: unterminated string")
	}
	return p.parseIdent()
}

func (p *parser) consume(s string) bool {
	if p.pos+len(s) > len(p.src) {
		return false
	}
	if p.src[p.pos:p.pos+len(s)] != s {
		return false
	}
	p.pos += len(s)
	return true
}

// FilterPairs returns p where the filter matches.
func FilterPairs(filter *Filter, items []Pairs) ([]Pairs, error) {
	var out []Pairs
	for _, p := range items {
		ok, err := filter.Match(p)
		if err != nil {
			return nil, err
		}
		if ok {
			out = append(out, p)
		}
	}
	return out, nil
}
