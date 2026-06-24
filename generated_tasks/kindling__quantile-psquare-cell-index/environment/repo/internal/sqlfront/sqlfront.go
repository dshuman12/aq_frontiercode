// Package sqlfront implements a small read-only SQL-like front-end that
// translates a SELECT-style query into the native kindling AST.
//
// Supported grammar:
//
//	SELECT col_list
//	  [FROM table]
//	  [WHERE pred ( AND pred )*]
//	  [GROUP BY col_list]
//	  [ORDER BY col [ASC|DESC] (, col [ASC|DESC])*]
//	  [LIMIT N [OFFSET M]]
//
// The intent is interactive: operators paste a SQL fragment they already
// know how to write, kindling lowers it to internal calls without
// pretending to be a real database. Subqueries, joins, CTEs, and window
// functions are deliberately not supported.
package sqlfront

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"unicode"
)

// Statement is the lowered form.
type Statement struct {
	Columns []ColumnRef
	From    string
	Where   *Expr
	GroupBy []string
	OrderBy []OrderRef
	Limit   int
	Offset  int
}

// ColumnRef is one element of the SELECT list.
type ColumnRef struct {
	Name  string
	Alias string
	Func  string // empty for a bare column; otherwise an aggregate name
	Star  bool
}

// OrderRef is one ORDER BY clause.
type OrderRef struct {
	Column     string
	Descending bool
}

// Expr is an expression node in the WHERE clause.
type Expr struct {
	Kind  ExprKind
	Op    string
	Left  *Expr
	Right *Expr
	Ident string
	Str   string
	Num   float64
	IsNum bool
}

// ExprKind is the variant tag.
type ExprKind int

const (
	ExprIdent ExprKind = iota + 1
	ExprLit
	ExprBinary
	ExprNot
	ExprIn
)

// Parse parses one SQL statement.
func Parse(src string) (*Statement, error) {
	p := newParser(src)
	stmt, err := p.parseStatement()
	if err != nil {
		return nil, err
	}
	p.skipSpace()
	if p.pos < len(p.src) {
		return nil, fmt.Errorf("sqlfront: trailing input at offset %d", p.pos)
	}
	return stmt, nil
}

type parser struct {
	src string
	pos int
}

func newParser(s string) *parser {
	return &parser{src: s}
}

func (p *parser) parseStatement() (*Statement, error) {
	p.skipSpace()
	if !p.eatKeyword("SELECT") {
		return nil, errors.New("sqlfront: expected SELECT")
	}
	stmt := &Statement{}
	cols, err := p.parseColumnList()
	if err != nil {
		return nil, err
	}
	stmt.Columns = cols

	if p.eatKeyword("FROM") {
		ident, err := p.parseIdent()
		if err != nil {
			return nil, err
		}
		stmt.From = ident
	}
	if p.eatKeyword("WHERE") {
		e, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		stmt.Where = e
	}
	if p.eatKeyword("GROUP") {
		if !p.eatKeyword("BY") {
			return nil, errors.New("sqlfront: expected BY after GROUP")
		}
		idents, err := p.parseIdentList()
		if err != nil {
			return nil, err
		}
		stmt.GroupBy = idents
	}
	if p.eatKeyword("ORDER") {
		if !p.eatKeyword("BY") {
			return nil, errors.New("sqlfront: expected BY after ORDER")
		}
		orders, err := p.parseOrderList()
		if err != nil {
			return nil, err
		}
		stmt.OrderBy = orders
	}
	if p.eatKeyword("LIMIT") {
		n, err := p.parseInt()
		if err != nil {
			return nil, err
		}
		stmt.Limit = n
		if p.eatKeyword("OFFSET") {
			m, err := p.parseInt()
			if err != nil {
				return nil, err
			}
			stmt.Offset = m
		}
	}
	return stmt, nil
}

func (p *parser) parseColumnList() ([]ColumnRef, error) {
	var out []ColumnRef
	for {
		p.skipSpace()
		if p.pos < len(p.src) && p.src[p.pos] == '*' {
			p.pos++
			out = append(out, ColumnRef{Star: true})
		} else {
			c, err := p.parseColumn()
			if err != nil {
				return nil, err
			}
			out = append(out, c)
		}
		p.skipSpace()
		if p.pos < len(p.src) && p.src[p.pos] == ',' {
			p.pos++
			continue
		}
		break
	}
	if len(out) == 0 {
		return nil, errors.New("sqlfront: empty SELECT list")
	}
	return out, nil
}

func (p *parser) parseColumn() (ColumnRef, error) {
	ident, err := p.parseIdent()
	if err != nil {
		return ColumnRef{}, err
	}
	col := ColumnRef{Name: ident}
	p.skipSpace()
	if p.pos < len(p.src) && p.src[p.pos] == '(' {
		p.pos++
		inner, err := p.parseIdent()
		if err != nil {
			return ColumnRef{}, err
		}
		p.skipSpace()
		if p.pos >= len(p.src) || p.src[p.pos] != ')' {
			return ColumnRef{}, errors.New("sqlfront: missing close paren")
		}
		p.pos++
		col = ColumnRef{Func: ident, Name: inner}
	}
	if p.eatKeyword("AS") {
		alias, err := p.parseIdent()
		if err != nil {
			return ColumnRef{}, err
		}
		col.Alias = alias
	}
	return col, nil
}

func (p *parser) parseIdentList() ([]string, error) {
	var out []string
	for {
		ident, err := p.parseIdent()
		if err != nil {
			return nil, err
		}
		out = append(out, ident)
		p.skipSpace()
		if p.pos < len(p.src) && p.src[p.pos] == ',' {
			p.pos++
			continue
		}
		break
	}
	return out, nil
}

func (p *parser) parseOrderList() ([]OrderRef, error) {
	var out []OrderRef
	for {
		ident, err := p.parseIdent()
		if err != nil {
			return nil, err
		}
		o := OrderRef{Column: ident}
		if p.eatKeyword("DESC") {
			o.Descending = true
		} else {
			_ = p.eatKeyword("ASC")
		}
		out = append(out, o)
		p.skipSpace()
		if p.pos < len(p.src) && p.src[p.pos] == ',' {
			p.pos++
			continue
		}
		break
	}
	return out, nil
}

func (p *parser) parseExpr() (*Expr, error) {
	return p.parseOr()
}

func (p *parser) parseOr() (*Expr, error) {
	left, err := p.parseAnd()
	if err != nil {
		return nil, err
	}
	for p.eatKeyword("OR") {
		right, err := p.parseAnd()
		if err != nil {
			return nil, err
		}
		left = &Expr{Kind: ExprBinary, Op: "OR", Left: left, Right: right}
	}
	return left, nil
}

func (p *parser) parseAnd() (*Expr, error) {
	left, err := p.parseNot()
	if err != nil {
		return nil, err
	}
	for p.eatKeyword("AND") {
		right, err := p.parseNot()
		if err != nil {
			return nil, err
		}
		left = &Expr{Kind: ExprBinary, Op: "AND", Left: left, Right: right}
	}
	return left, nil
}

func (p *parser) parseNot() (*Expr, error) {
	if p.eatKeyword("NOT") {
		inner, err := p.parseNot()
		if err != nil {
			return nil, err
		}
		return &Expr{Kind: ExprNot, Left: inner}, nil
	}
	return p.parseCompare()
}

func (p *parser) parseCompare() (*Expr, error) {
	p.skipSpace()
	if p.pos < len(p.src) && p.src[p.pos] == '(' {
		p.pos++
		inner, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		p.skipSpace()
		if p.pos >= len(p.src) || p.src[p.pos] != ')' {
			return nil, errors.New("sqlfront: missing close paren")
		}
		p.pos++
		return inner, nil
	}
	left, err := p.parseAtom()
	if err != nil {
		return nil, err
	}
	p.skipSpace()
	op := p.peekOperator()
	if op == "" {
		return left, nil
	}
	p.pos += len(op)
	right, err := p.parseAtom()
	if err != nil {
		return nil, err
	}
	return &Expr{Kind: ExprBinary, Op: op, Left: left, Right: right}, nil
}

func (p *parser) parseAtom() (*Expr, error) {
	p.skipSpace()
	if p.pos >= len(p.src) {
		return nil, errors.New("sqlfront: unexpected end of input")
	}
	c := p.src[p.pos]
	if c == '\'' {
		s, err := p.parseStringLiteral()
		if err != nil {
			return nil, err
		}
		return &Expr{Kind: ExprLit, Str: s}, nil
	}
	if c >= '0' && c <= '9' || (c == '-' && p.pos+1 < len(p.src) && unicode.IsDigit(rune(p.src[p.pos+1]))) {
		n, err := p.parseNumber()
		if err != nil {
			return nil, err
		}
		return &Expr{Kind: ExprLit, Num: n, IsNum: true}, nil
	}
	ident, err := p.parseIdent()
	if err != nil {
		return nil, err
	}
	return &Expr{Kind: ExprIdent, Ident: ident}, nil
}

func (p *parser) parseStringLiteral() (string, error) {
	if p.src[p.pos] != '\'' {
		return "", errors.New("sqlfront: expected string")
	}
	p.pos++
	var b strings.Builder
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if c == '\'' {
			if p.pos+1 < len(p.src) && p.src[p.pos+1] == '\'' {
				b.WriteByte('\'')
				p.pos += 2
				continue
			}
			p.pos++
			return b.String(), nil
		}
		b.WriteByte(c)
		p.pos++
	}
	return "", errors.New("sqlfront: unterminated string")
}

func (p *parser) parseNumber() (float64, error) {
	start := p.pos
	if p.src[p.pos] == '-' {
		p.pos++
	}
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if (c >= '0' && c <= '9') || c == '.' {
			p.pos++
			continue
		}
		break
	}
	v, err := strconv.ParseFloat(p.src[start:p.pos], 64)
	if err != nil {
		return 0, fmt.Errorf("sqlfront: bad number %q", p.src[start:p.pos])
	}
	return v, nil
}

func (p *parser) parseIdent() (string, error) {
	p.skipSpace()
	if p.pos >= len(p.src) {
		return "", errors.New("sqlfront: expected identifier")
	}
	start := p.pos
	c := p.src[p.pos]
	if !(c == '_' || unicode.IsLetter(rune(c))) {
		return "", fmt.Errorf("sqlfront: expected identifier at offset %d", p.pos)
	}
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if c == '_' || c == '.' || unicode.IsLetter(rune(c)) || unicode.IsDigit(rune(c)) {
			p.pos++
			continue
		}
		break
	}
	return p.src[start:p.pos], nil
}

func (p *parser) parseInt() (int, error) {
	p.skipSpace()
	start := p.pos
	for p.pos < len(p.src) && p.src[p.pos] >= '0' && p.src[p.pos] <= '9' {
		p.pos++
	}
	if start == p.pos {
		return 0, errors.New("sqlfront: expected integer")
	}
	return strconv.Atoi(p.src[start:p.pos])
}

func (p *parser) peekOperator() string {
	if p.pos >= len(p.src) {
		return ""
	}
	if p.pos+1 < len(p.src) {
		two := p.src[p.pos : p.pos+2]
		switch two {
		case "<=", ">=", "<>", "!=":
			return two
		}
	}
	switch p.src[p.pos] {
	case '<', '>', '=':
		return p.src[p.pos : p.pos+1]
	}
	return ""
}

func (p *parser) skipSpace() {
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
			p.pos++
			continue
		}
		break
	}
}

func (p *parser) eatKeyword(kw string) bool {
	p.skipSpace()
	if p.pos+len(kw) > len(p.src) {
		return false
	}
	if !strings.EqualFold(p.src[p.pos:p.pos+len(kw)], kw) {
		return false
	}
	end := p.pos + len(kw)
	if end < len(p.src) {
		c := p.src[end]
		if c == '_' || unicode.IsLetter(rune(c)) || unicode.IsDigit(rune(c)) {
			return false
		}
	}
	p.pos = end
	return true
}

// Lower returns a structured representation suitable for hand-off to
// kindling's native query layer.
type Lowered struct {
	Filter  string
	Aggregates []string
	Group   []string
	Order   []string
	Limit   int
	Offset  int
}

// Lower turns a Statement into a Lowered form that the rest of kindling
// can consume.
func (s *Statement) Lower() Lowered {
	out := Lowered{Limit: s.Limit, Offset: s.Offset}
	if s.Where != nil {
		out.Filter = s.Where.canonical()
	}
	for _, c := range s.Columns {
		if c.Func != "" {
			out.Aggregates = append(out.Aggregates, strings.ToLower(c.Func)+"("+c.Name+")")
		}
	}
	out.Group = append(out.Group, s.GroupBy...)
	for _, o := range s.OrderBy {
		dir := "asc"
		if o.Descending {
			dir = "desc"
		}
		out.Order = append(out.Order, o.Column+" "+dir)
	}
	return out
}

func (e *Expr) canonical() string {
	if e == nil {
		return ""
	}
	switch e.Kind {
	case ExprIdent:
		return e.Ident
	case ExprLit:
		if e.IsNum {
			return strconv.FormatFloat(e.Num, 'g', -1, 64)
		}
		return "'" + strings.ReplaceAll(e.Str, "'", "''") + "'"
	case ExprNot:
		return "NOT (" + e.Left.canonical() + ")"
	case ExprBinary:
		return "(" + e.Left.canonical() + " " + e.Op + " " + e.Right.canonical() + ")"
	}
	return "?"
}
