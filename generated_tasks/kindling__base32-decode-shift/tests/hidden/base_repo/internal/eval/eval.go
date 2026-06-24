// Package eval implements a tiny numeric expression evaluator used by the
// query layer for computed columns and threshold expressions.
//
// Grammar:
//
//	expr   := term (('+' | '-') term)*
//	term   := factor (('*' | '/' | '%') factor)*
//	factor := '-' factor | atom ('^' factor)?
//	atom   := number | ident ('(' args ')')? | '(' expr ')'
//	args   := expr (',' expr)*
//
// Identifiers may be looked up in a Scope. Unknown identifiers return an
// error; this is intentional so that typos surface during query parse.
package eval

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"unicode"
)

// Scope resolves identifier names. Functions accept variadic float64 args.
type Scope struct {
	Vars  map[string]float64
	Funcs map[string]func(args ...float64) (float64, error)
}

// NewScope builds an empty scope with the standard math functions installed.
func NewScope() *Scope {
	s := &Scope{
		Vars:  map[string]float64{"pi": math.Pi, "e": math.E},
		Funcs: map[string]func(args ...float64) (float64, error){},
	}
	s.installMath()
	return s
}

func (s *Scope) installMath() {
	one := func(f func(float64) float64) func(args ...float64) (float64, error) {
		return func(args ...float64) (float64, error) {
			if len(args) != 1 {
				return 0, fmt.Errorf("expected 1 arg, got %d", len(args))
			}
			return f(args[0]), nil
		}
	}
	two := func(f func(float64, float64) float64) func(args ...float64) (float64, error) {
		return func(args ...float64) (float64, error) {
			if len(args) != 2 {
				return 0, fmt.Errorf("expected 2 args, got %d", len(args))
			}
			return f(args[0], args[1]), nil
		}
	}
	s.Funcs["abs"] = one(math.Abs)
	s.Funcs["sqrt"] = one(math.Sqrt)
	s.Funcs["log"] = one(math.Log)
	s.Funcs["log2"] = one(math.Log2)
	s.Funcs["log10"] = one(math.Log10)
	s.Funcs["exp"] = one(math.Exp)
	s.Funcs["floor"] = one(math.Floor)
	s.Funcs["ceil"] = one(math.Ceil)
	s.Funcs["round"] = one(func(v float64) float64 { return math.Round(v) })
	s.Funcs["sin"] = one(math.Sin)
	s.Funcs["cos"] = one(math.Cos)
	s.Funcs["tan"] = one(math.Tan)
	s.Funcs["min"] = two(math.Min)
	s.Funcs["max"] = two(math.Max)
	s.Funcs["pow"] = two(math.Pow)
	s.Funcs["clamp"] = func(args ...float64) (float64, error) {
		if len(args) != 3 {
			return 0, fmt.Errorf("clamp expects 3 args")
		}
		v, lo, hi := args[0], args[1], args[2]
		if v < lo {
			return lo, nil
		}
		if v > hi {
			return hi, nil
		}
		return v, nil
	}
}

// Eval parses and evaluates src against scope.
func Eval(src string, scope *Scope) (float64, error) {
	if scope == nil {
		scope = NewScope()
	}
	p := &parser{src: src}
	v, err := p.parseExpr()
	if err != nil {
		return 0, err
	}
	p.skipSpace()
	if p.pos != len(p.src) {
		return 0, fmt.Errorf("unexpected trailing input at offset %d", p.pos)
	}
	return v.eval(scope)
}

type node interface {
	eval(*Scope) (float64, error)
}

type numNode float64

func (n numNode) eval(*Scope) (float64, error) { return float64(n), nil }

type identNode string

func (n identNode) eval(s *Scope) (float64, error) {
	if v, ok := s.Vars[string(n)]; ok {
		return v, nil
	}
	return 0, fmt.Errorf("unknown identifier %q", string(n))
}

type unaryNode struct {
	op    byte
	child node
}

func (u unaryNode) eval(s *Scope) (float64, error) {
	v, err := u.child.eval(s)
	if err != nil {
		return 0, err
	}
	if u.op == '-' {
		return -v, nil
	}
	return v, nil
}

type binNode struct {
	op       byte
	lhs, rhs node
}

func (b binNode) eval(s *Scope) (float64, error) {
	l, err := b.lhs.eval(s)
	if err != nil {
		return 0, err
	}
	r, err := b.rhs.eval(s)
	if err != nil {
		return 0, err
	}
	switch b.op {
	case '+':
		return l + r, nil
	case '-':
		return l - r, nil
	case '*':
		return l * r, nil
	case '/':
		if r == 0 {
			return 0, fmt.Errorf("division by zero")
		}
		return l / r, nil
	case '%':
		if r == 0 {
			return 0, fmt.Errorf("modulo by zero")
		}
		return math.Mod(l, r), nil
	case '^':
		return math.Pow(l, r), nil
	}
	return 0, fmt.Errorf("unknown operator %q", b.op)
}

type callNode struct {
	name string
	args []node
}

func (c callNode) eval(s *Scope) (float64, error) {
	fn, ok := s.Funcs[c.name]
	if !ok {
		return 0, fmt.Errorf("unknown function %q", c.name)
	}
	vals := make([]float64, len(c.args))
	for i, a := range c.args {
		v, err := a.eval(s)
		if err != nil {
			return 0, err
		}
		vals[i] = v
	}
	return fn(vals...)
}

type parser struct {
	src string
	pos int
}

func (p *parser) skipSpace() {
	for p.pos < len(p.src) && (p.src[p.pos] == ' ' || p.src[p.pos] == '\t') {
		p.pos++
	}
}

func (p *parser) parseExpr() (node, error) {
	left, err := p.parseTerm()
	if err != nil {
		return nil, err
	}
	for {
		p.skipSpace()
		if p.pos >= len(p.src) {
			return left, nil
		}
		op := p.src[p.pos]
		if op != '+' && op != '-' {
			return left, nil
		}
		p.pos++
		right, err := p.parseTerm()
		if err != nil {
			return nil, err
		}
		left = binNode{op: op, lhs: left, rhs: right}
	}
}

func (p *parser) parseTerm() (node, error) {
	left, err := p.parseFactor()
	if err != nil {
		return nil, err
	}
	for {
		p.skipSpace()
		if p.pos >= len(p.src) {
			return left, nil
		}
		op := p.src[p.pos]
		if op != '*' && op != '/' && op != '%' {
			return left, nil
		}
		p.pos++
		right, err := p.parseFactor()
		if err != nil {
			return nil, err
		}
		left = binNode{op: op, lhs: left, rhs: right}
	}
}

func (p *parser) parseFactor() (node, error) {
	p.skipSpace()
	if p.pos < len(p.src) && p.src[p.pos] == '-' {
		p.pos++
		child, err := p.parseFactor()
		if err != nil {
			return nil, err
		}
		return unaryNode{op: '-', child: child}, nil
	}
	atom, err := p.parseAtom()
	if err != nil {
		return nil, err
	}
	p.skipSpace()
	if p.pos < len(p.src) && p.src[p.pos] == '^' {
		p.pos++
		right, err := p.parseFactor()
		if err != nil {
			return nil, err
		}
		return binNode{op: '^', lhs: atom, rhs: right}, nil
	}
	return atom, nil
}

func (p *parser) parseAtom() (node, error) {
	p.skipSpace()
	if p.pos >= len(p.src) {
		return nil, fmt.Errorf("unexpected end of input")
	}
	c := p.src[p.pos]
	if c == '(' {
		p.pos++
		v, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		p.skipSpace()
		if p.pos >= len(p.src) || p.src[p.pos] != ')' {
			return nil, fmt.Errorf("missing close paren")
		}
		p.pos++
		return v, nil
	}
	if c >= '0' && c <= '9' || c == '.' {
		return p.parseNumber()
	}
	if c == '_' || unicode.IsLetter(rune(c)) {
		return p.parseIdentOrCall()
	}
	return nil, fmt.Errorf("unexpected byte %q", c)
}

func (p *parser) parseNumber() (node, error) {
	start := p.pos
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if (c >= '0' && c <= '9') || c == '.' {
			p.pos++
			continue
		}
		if c == 'e' || c == 'E' {
			p.pos++
			if p.pos < len(p.src) && (p.src[p.pos] == '+' || p.src[p.pos] == '-') {
				p.pos++
			}
			continue
		}
		break
	}
	v, err := strconv.ParseFloat(p.src[start:p.pos], 64)
	if err != nil {
		return nil, fmt.Errorf("bad number %q", p.src[start:p.pos])
	}
	return numNode(v), nil
}

func (p *parser) parseIdentOrCall() (node, error) {
	start := p.pos
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if c == '_' || unicode.IsLetter(rune(c)) || (c >= '0' && c <= '9') {
			p.pos++
			continue
		}
		break
	}
	name := p.src[start:p.pos]
	p.skipSpace()
	if p.pos < len(p.src) && p.src[p.pos] == '(' {
		p.pos++
		args := []node{}
		for {
			p.skipSpace()
			if p.pos < len(p.src) && p.src[p.pos] == ')' {
				p.pos++
				break
			}
			arg, err := p.parseExpr()
			if err != nil {
				return nil, err
			}
			args = append(args, arg)
			p.skipSpace()
			if p.pos < len(p.src) && p.src[p.pos] == ',' {
				p.pos++
				continue
			}
			if p.pos < len(p.src) && p.src[p.pos] == ')' {
				p.pos++
				break
			}
			return nil, fmt.Errorf("expected , or ) in call to %q", name)
		}
		return callNode{name: strings.ToLower(name), args: args}, nil
	}
	return identNode(name), nil
}
