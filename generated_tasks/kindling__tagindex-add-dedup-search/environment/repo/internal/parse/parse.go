// Package parse turns a kindling query string into an AST.
package parse

import (
	"fmt"
	"strconv"

	"github.com/dleblanc/kindling/internal/lex"
)

// Op is one of the supported comparison operators.
type Op int

const (
	OpEq Op = iota
	OpNe
	OpLt
	OpLe
	OpGt
	OpGe
	OpRegex
	OpContains
)

// String returns the operator's source-form spelling.
func (o Op) String() string {
	switch o {
	case OpEq:
		return "="
	case OpNe:
		return "!="
	case OpLt:
		return "<"
	case OpLe:
		return "<="
	case OpGt:
		return ">"
	case OpGe:
		return ">="
	case OpRegex:
		return "~"
	case OpContains:
		return ":"
	default:
		return "?"
	}
}

func opOf(s string) (Op, error) {
	switch s {
	case "=":
		return OpEq, nil
	case "!=":
		return OpNe, nil
	case "<":
		return OpLt, nil
	case "<=":
		return OpLe, nil
	case ">":
		return OpGt, nil
	case ">=":
		return OpGe, nil
	case "~":
		return OpRegex, nil
	case ":":
		return OpContains, nil
	default:
		return 0, fmt.Errorf("parse: unknown operator %q", s)
	}
}

// ValueKind tags every literal.
type ValueKind int

const (
	ValString ValueKind = iota
	ValNumber
)

// Value is a literal in the AST.
type Value struct {
	Kind ValueKind
	Str  string
	Num  float64
}

// Predicate is one comparison.
type Predicate struct {
	Field string
	Op    Op
	Value Value
}

// Conjunction joins predicates with AND.
type Conjunction struct {
	Preds []Predicate
}

// Query is one or more conjunctions joined by OR.
type Query struct {
	Disjuncts []Conjunction
}

// Parse converts an input string into a Query.
func Parse(input string) (*Query, error) {
	toks, err := lex.Lex(input)
	if err != nil {
		return nil, err
	}
	p := &parser{toks: toks}
	return p.parseQuery()
}

type parser struct {
	toks []lex.Token
	pos  int
}

func (p *parser) peek() lex.Token {
	return p.toks[p.pos]
}

func (p *parser) bump() lex.Token {
	t := p.toks[p.pos]
	p.pos++
	return t
}

func (p *parser) parseQuery() (*Query, error) {
	q := &Query{}
	for {
		conj, err := p.parseConj()
		if err != nil {
			return nil, err
		}
		q.Disjuncts = append(q.Disjuncts, conj)
		if p.peek().Kind == lex.TokOr {
			p.bump()
			continue
		}
		if p.peek().Kind != lex.TokEOF {
			return nil, fmt.Errorf("parse: trailing token %v", p.peek())
		}
		return q, nil
	}
}

func (p *parser) parseConj() (Conjunction, error) {
	c := Conjunction{}
	for {
		pred, err := p.parsePred()
		if err != nil {
			return c, err
		}
		c.Preds = append(c.Preds, pred)
		if p.peek().Kind == lex.TokAnd {
			p.bump()
			continue
		}
		return c, nil
	}
}

func (p *parser) parsePred() (Predicate, error) {
	field := p.peek()
	if field.Kind != lex.TokIdent {
		return Predicate{}, fmt.Errorf("parse: expected field name, got %v", field)
	}
	p.bump()
	op := p.peek()
	if op.Kind != lex.TokOp {
		return Predicate{}, fmt.Errorf("parse: expected operator, got %v", op)
	}
	p.bump()
	o, err := opOf(op.Value)
	if err != nil {
		return Predicate{}, err
	}
	val, err := p.parseValue()
	if err != nil {
		return Predicate{}, err
	}
	return Predicate{Field: field.Value, Op: o, Value: val}, nil
}

func (p *parser) parseValue() (Value, error) {
	t := p.peek()
	switch t.Kind {
	case lex.TokIdent, lex.TokString:
		p.bump()
		return Value{Kind: ValString, Str: t.Value}, nil
	case lex.TokNumber:
		p.bump()
		n, err := strconv.ParseFloat(t.Value, 64)
		if err != nil {
			return Value{}, fmt.Errorf("parse: bad number %q", t.Value)
		}
		return Value{Kind: ValNumber, Num: n, Str: t.Value}, nil
	default:
		return Value{}, fmt.Errorf("parse: expected value, got %v", t)
	}
}
