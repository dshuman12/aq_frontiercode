package parser

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/Mustafa4ngin/Drift/pkg/ast"
	"github.com/Mustafa4ngin/Drift/pkg/errors"
	"github.com/Mustafa4ngin/Drift/pkg/lexer"
	"github.com/Mustafa4ngin/Drift/pkg/token"
)

type Parser struct {
	lex    *lexer.Lexer
	cur    token.Token
	peek   token.Token
	errors *errors.ErrorList
	source string
}

func New(input string) *Parser {
	p := &Parser{
		lex:    lexer.New(input),
		errors: errors.NewList(),
		source: input,
	}
	p.advance()
	p.advance()
	return p
}

func (p *Parser) Errors() *errors.ErrorList {
	el := errors.NewList()
	for _, e := range p.lex.Errors().Errors {
		el.Add(e)
	}
	for _, e := range p.errors.Errors {
		el.Add(e)
	}
	return el
}

func (p *Parser) advance() {
	p.cur = p.peek
	p.peek = p.lex.NextToken()
}

func (p *Parser) expect(t token.Type) bool {
	if p.cur.Type == t {
		p.advance()
		return true
	}
	p.errors.Add(errors.ParseErrorf(p.cur.Span, "expected %s, got %s", t, p.cur.Type))
	return false
}

func (p *Parser) expectPeek(t token.Type) bool {
	if p.peek.Type == t {
		p.advance()
		return true
	}
	p.errors.Add(errors.ParseErrorf(p.peek.Span, "expected %s, got %s", t, p.peek.Type))
	return false
}

func Parse(input string) (*ast.Program, *errors.ErrorList) {
	p := New(input)
	prog := p.ParseProgram()
	errs := p.Errors()
	errs.SetSource(input)
	return prog, errs
}

func (p *Parser) ParseProgram() *ast.Program {
	prog := &ast.Program{}
	for p.cur.Type != token.EOF {
		stmt := p.parseStatement()
		if stmt != nil {
			prog.Stmts = append(prog.Stmts, stmt)
		}
	}
	return prog
}

func (p *Parser) parseStatement() ast.Stmt {
	for p.cur.Type == token.Semicolon {
		p.advance()
	}
	if p.cur.Type == token.EOF {
		return nil
	}
	switch p.cur.Type {
	case token.Let:
		return p.parseLetStmt()
	case token.Const:
		return p.parseConstStmt()
	case token.Return:
		return p.parseReturnStmt()
	case token.While:
		return p.parseWhileStmt()
	case token.For:
		return p.parseForStmt()
	case token.Break:
		s := &ast.BreakStmt{Tok: p.cur.Span}
		p.advance()
		p.skipSemicolon()
		return s
	case token.Continue:
		s := &ast.ContinueStmt{Tok: p.cur.Span}
		p.advance()
		p.skipSemicolon()
		return s
	case token.Fn:
		if p.peek.Type == token.Ident {
			return p.parseFnStmt()
		}
		return p.parseExprStatement()
	default:
		return p.parseExprStatement()
	}
}

func (p *Parser) parseLetStmt() ast.Stmt {
	start := p.cur.Span
	p.advance() // skip 'let'

	mutable := false
	if p.cur.Type == token.Mut {
		mutable = true
		p.advance()
	}

	if p.cur.Type != token.Ident {
		p.errors.Add(errors.ParseError("expected identifier after 'let'", p.cur.Span))
		p.recover()
		return nil
	}
	name := &ast.Ident{Name: p.cur.Literal, Tok: p.cur.Span}
	p.advance()

	var typeAnn *ast.TypeExpr
	if p.cur.Type == token.Colon {
		p.advance()
		typeAnn = p.parseTypeExpr()
	}

	if !p.expect(token.Assign) {
		p.recover()
		return nil
	}
	value := p.parseExpression(PrecNone)
	p.skipSemicolon()
	return &ast.LetStmt{Name: name, Mutable: mutable, TypeAnn: typeAnn, Value: value, Tok: start}
}

func (p *Parser) parseConstStmt() ast.Stmt {
	start := p.cur.Span
	p.advance() // skip 'const'

	if p.cur.Type != token.Ident {
		p.errors.Add(errors.ParseError("expected identifier after 'const'", p.cur.Span))
		p.recover()
		return nil
	}
	name := &ast.Ident{Name: p.cur.Literal, Tok: p.cur.Span}
	p.advance()

	var typeAnn *ast.TypeExpr
	if p.cur.Type == token.Colon {
		p.advance()
		typeAnn = p.parseTypeExpr()
	}

	if !p.expect(token.Assign) {
		p.recover()
		return nil
	}
	value := p.parseExpression(PrecNone)
	p.skipSemicolon()
	return &ast.ConstStmt{Name: name, TypeAnn: typeAnn, Value: value, Tok: start}
}

func (p *Parser) parseReturnStmt() ast.Stmt {
	start := p.cur.Span
	p.advance() // skip 'return'

	var value ast.Expr
	if p.cur.Type != token.Semicolon && p.cur.Type != token.RBrace && p.cur.Type != token.EOF {
		value = p.parseExpression(PrecNone)
	}
	p.skipSemicolon()
	return &ast.ReturnStmt{Value: value, Tok: start}
}

func (p *Parser) parseWhileStmt() ast.Stmt {
	start := p.cur.Span
	p.advance() // skip 'while'

	cond := p.parseExpression(PrecNone)
	body := p.parseBlock()
	return &ast.WhileStmt{Cond: cond, Body: body, Tok: start}
}

func (p *Parser) parseForStmt() ast.Stmt {
	start := p.cur.Span
	p.advance() // skip 'for'

	if p.cur.Type != token.Ident {
		p.errors.Add(errors.ParseError("expected identifier after 'for'", p.cur.Span))
		p.recover()
		return nil
	}
	varName := &ast.Ident{Name: p.cur.Literal, Tok: p.cur.Span}
	p.advance()

	if !p.expect(token.In) {
		p.recover()
		return nil
	}

	iter := p.parseExpression(PrecNone)
	body := p.parseBlock()
	return &ast.ForStmt{Var: varName, Iter: iter, Body: body, Tok: start}
}

func (p *Parser) parseFnStmt() ast.Stmt {
	fnExpr := p.parseFnExpr()
	if fnExpr == nil {
		return nil
	}
	return &ast.ExprStmt{Expr: fnExpr}
}

func (p *Parser) parseExprStatement() ast.Stmt {
	expr := p.parseExpression(PrecNone)
	if expr == nil {
		p.advance()
		return nil
	}

	if token.IsAssignOp(p.cur.Type) {
		op := p.cur.Type
		span := p.cur.Span
		p.advance()
		value := p.parseExpression(PrecNone)
		p.skipSemicolon()
		return &ast.AssignStmt{Target: expr, Op: op, Value: value, Tok: span}
	}

	p.skipSemicolon()
	return &ast.ExprStmt{Expr: expr}
}

func (p *Parser) parseExpression(prec Precedence) ast.Expr {
	left := p.parsePrefixExpr()
	if left == nil {
		return nil
	}

	for p.cur.Type != token.Semicolon && p.cur.Type != token.EOF && prec < tokenPrecedence(p.cur.Type) {
		left = p.parseInfixExpr(left)
		if left == nil {
			return nil
		}
	}
	return left
}

func (p *Parser) parsePrefixExpr() ast.Expr {
	switch p.cur.Type {
	case token.Int:
		return p.parseIntLit()
	case token.Float:
		return p.parseFloatLit()
	case token.String:
		return p.parseStringLit()
	case token.True, token.False:
		return p.parseBoolLit()
	case token.Nil:
		return p.parseNilLit()
	case token.Ident:
		return p.parseIdent()
	case token.Minus, token.Bang:
		return p.parseUnaryExpr()
	case token.LParen:
		return p.parseGroupedExpr()
	case token.LBracket:
		return p.parseArrayLit()
	case token.LBrace:
		return p.parseMapOrBlock()
	case token.If:
		return p.parseIfExpr()
	case token.Fn:
		return p.parseFnExpr()
	case token.Match:
		return p.parseMatchExpr()
	case token.Typeof:
		return p.parseTypeofExpr()
	default:
		p.errors.Add(errors.ParseErrorf(p.cur.Span, "unexpected token %s", p.cur.Type))
		return nil
	}
}

func (p *Parser) parseInfixExpr(left ast.Expr) ast.Expr {
	switch p.cur.Type {
	case token.Plus, token.Minus, token.Star, token.Slash, token.Percent,
		token.Eq, token.NotEq, token.Lt, token.Gt, token.LtEq, token.GtEq,
		token.And, token.Or:
		return p.parseBinaryExpr(left)
	case token.Question:
		return p.parseTernaryExpr(left)
	case token.QuestionQuestion:
		return p.parseNullCoalesceExpr(left)
	case token.Pipe:
		return p.parsePipeExpr(left)
	case token.DotDot:
		return p.parseRangeExpr(left)
	case token.LParen:
		return p.parseCallExpr(left)
	case token.LBracket:
		return p.parseIndexExpr(left)
	case token.Dot:
		return p.parseDotExpr(left)
	default:
		return left
	}
}

func (p *Parser) parseIntLit() ast.Expr {
	raw := p.cur.Literal
	clean := strings.ReplaceAll(raw, "_", "")
	var val int64
	var err error
	if strings.HasPrefix(clean, "0x") || strings.HasPrefix(clean, "0X") {
		val, err = strconv.ParseInt(clean[2:], 16, 64)
	} else if strings.HasPrefix(clean, "0b") || strings.HasPrefix(clean, "0B") {
		val, err = strconv.ParseInt(clean[2:], 2, 64)
	} else {
		val, err = strconv.ParseInt(clean, 10, 64)
	}
	if err != nil {
		p.errors.Add(errors.ParseErrorf(p.cur.Span, "invalid integer literal: %s", raw))
	}
	lit := &ast.IntLit{Value: val, Raw: raw, Tok: p.cur.Span}
	p.advance()
	return lit
}

func (p *Parser) parseFloatLit() ast.Expr {
	raw := p.cur.Literal
	clean := strings.ReplaceAll(raw, "_", "")
	val, err := strconv.ParseFloat(clean, 64)
	if err != nil {
		p.errors.Add(errors.ParseErrorf(p.cur.Span, "invalid float literal: %s", raw))
	}
	lit := &ast.FloatLit{Value: val, Raw: raw, Tok: p.cur.Span}
	p.advance()
	return lit
}

func (p *Parser) parseStringLit() ast.Expr {
	lit := &ast.StringLit{Value: p.cur.Literal, Tok: p.cur.Span}
	p.advance()
	return lit
}

func (p *Parser) parseBoolLit() ast.Expr {
	lit := &ast.BoolLit{Value: p.cur.Type == token.True, Tok: p.cur.Span}
	p.advance()
	return lit
}

func (p *Parser) parseNilLit() ast.Expr {
	lit := &ast.NilLit{Tok: p.cur.Span}
	p.advance()
	return lit
}

func (p *Parser) parseIdent() ast.Expr {
	id := &ast.Ident{Name: p.cur.Literal, Tok: p.cur.Span}
	p.advance()
	return id
}

func (p *Parser) parseUnaryExpr() ast.Expr {
	start := p.cur.Span
	op := p.cur.Type
	p.advance()
	operand := p.parseExpression(PrecUnary)
	return &ast.UnaryExpr{Op: op, Operand: operand, Tok: start}
}

func (p *Parser) parseGroupedExpr() ast.Expr {
	p.advance() // skip (
	expr := p.parseExpression(PrecNone)
	if !p.expect(token.RParen) {
		return nil
	}
	return expr
}

func (p *Parser) parseBinaryExpr(left ast.Expr) ast.Expr {
	op := p.cur.Type
	prec := tokenPrecedence(op)
	span := p.cur.Span
	p.advance()
	right := p.parseExpression(prec - 1)
	return &ast.BinaryExpr{Left: left, Op: op, Right: right, Tok: span}
}

func (p *Parser) parsePipeExpr(left ast.Expr) ast.Expr {
	span := p.cur.Span
	p.advance() // skip |>
	right := p.parseExpression(PrecPipe)
	return &ast.PipeExpr{Left: left, Right: right, Tok: span}
}

func (p *Parser) parseRangeExpr(left ast.Expr) ast.Expr {
	span := p.cur.Span
	p.advance() // skip ..
	right := p.parseExpression(PrecRange)
	return &ast.RangeExpr{Start: left, End: right, Tok: span}
}

func (p *Parser) parseCallExpr(fn ast.Expr) ast.Expr {
	span := p.cur.Span
	p.advance() // skip (
	args := p.parseExprList(token.RParen)
	if !p.expect(token.RParen) {
		return nil
	}
	return &ast.CallExpr{Func: fn, Args: args, Tok: span}
}

func (p *Parser) parseIndexExpr(obj ast.Expr) ast.Expr {
	span := p.cur.Span
	p.advance() // skip [
	index := p.parseExpression(PrecNone)
	if !p.expect(token.RBracket) {
		return nil
	}
	return &ast.IndexExpr{Object: obj, Index: index, Tok: span}
}

func (p *Parser) parseDotExpr(obj ast.Expr) ast.Expr {
	span := p.cur.Span
	p.advance() // skip .
	if p.cur.Type != token.Ident {
		p.errors.Add(errors.ParseError("expected field name after '.'", p.cur.Span))
		return nil
	}
	field := &ast.Ident{Name: p.cur.Literal, Tok: p.cur.Span}
	p.advance()
	return &ast.DotExpr{Object: obj, Field: field, Tok: span}
}

func (p *Parser) parseArrayLit() ast.Expr {
	span := p.cur.Span
	p.advance() // skip [
	elems := p.parseExprList(token.RBracket)
	if !p.expect(token.RBracket) {
		return nil
	}
	return &ast.ArrayLit{Elems: elems, Tok: span}
}

func (p *Parser) parseMapOrBlock() ast.Expr {
	if p.peek.Type == token.RBrace || (p.peek.Type != token.Colon && !p.looksLikeMapEntry()) {
		return p.parseBlockExpr()
	}
	return p.parseMapLit()
}

func (p *Parser) looksLikeMapEntry() bool {
	if p.cur.Type != token.LBrace {
		return false
	}
	return p.peek.Type == token.String || p.peek.Type == token.Int
}

func (p *Parser) parseMapLit() ast.Expr {
	span := p.cur.Span
	p.advance() // skip {
	var keys, values []ast.Expr
	for p.cur.Type != token.RBrace && p.cur.Type != token.EOF {
		key := p.parseExpression(PrecNone)
		if !p.expect(token.Colon) {
			break
		}
		value := p.parseExpression(PrecNone)
		keys = append(keys, key)
		values = append(values, value)
		if p.cur.Type == token.Comma {
			p.advance()
		}
	}
	if !p.expect(token.RBrace) {
		return nil
	}
	return &ast.MapLit{Keys: keys, Values: values, Tok: span}
}

func (p *Parser) parseBlockExpr() ast.Expr {
	return p.parseBlock()
}

func (p *Parser) parseBlock() *ast.Block {
	span := p.cur.Span
	if !p.expect(token.LBrace) {
		return &ast.Block{Tok: span}
	}
	var stmts []ast.Stmt
	for p.cur.Type != token.RBrace && p.cur.Type != token.EOF {
		s := p.parseStatement()
		if s != nil {
			stmts = append(stmts, s)
		}
	}
	if !p.expect(token.RBrace) {
		return &ast.Block{Stmts: stmts, Tok: span}
	}
	return &ast.Block{Stmts: stmts, Tok: span}
}

func (p *Parser) parseIfExpr() ast.Expr {
	span := p.cur.Span
	p.advance() // skip 'if'

	cond := p.parseExpression(PrecNone)
	then := p.parseBlock()

	var elseNode ast.Node
	if p.cur.Type == token.Else {
		p.advance()
		if p.cur.Type == token.If {
			elseNode = p.parseIfExpr()
		} else {
			elseNode = p.parseBlock()
		}
	}
	return &ast.IfExpr{Cond: cond, Then: then, Else: elseNode, Tok: span}
}

func (p *Parser) parseFnExpr() ast.Expr {
	span := p.cur.Span
	p.advance() // skip 'fn'

	var name *ast.Ident
	if p.cur.Type == token.Ident {
		name = &ast.Ident{Name: p.cur.Literal, Tok: p.cur.Span}
		p.advance()
	}

	if !p.expect(token.LParen) {
		return nil
	}
	params := p.parseParamList()
	if !p.expect(token.RParen) {
		return nil
	}

	var retType *ast.TypeExpr
	if p.cur.Type == token.Arrow {
		p.advance()
		retType = p.parseTypeExpr()
	}

	body := p.parseBlock()
	return &ast.FnExpr{Name: name, Params: params, RetType: retType, Body: body, Tok: span}
}

func (p *Parser) parseMatchExpr() ast.Expr {
	span := p.cur.Span
	p.advance() // skip 'match'

	subject := p.parseExpression(PrecNone)
	if !p.expect(token.LBrace) {
		return nil
	}

	var arms []*ast.MatchArm
	for p.cur.Type != token.RBrace && p.cur.Type != token.EOF {
		arm := p.parseMatchArm()
		if arm != nil {
			arms = append(arms, arm)
		}
	}
	if !p.expect(token.RBrace) {
		return nil
	}
	return &ast.MatchExpr{Subject: subject, Arms: arms, Tok: span}
}

func (p *Parser) parseMatchArm() *ast.MatchArm {
	span := p.cur.Span
	pattern := p.parseExpression(PrecNone)
	if !p.expect(token.FatArrow) {
		p.recover()
		return nil
	}
	body := p.parseExpression(PrecNone)
	p.skipSemicolon()
	return &ast.MatchArm{Pattern: pattern, Body: body, Tok: span}
}

func (p *Parser) parseTernaryExpr(cond ast.Expr) ast.Expr {
	span := p.cur.Span
	p.advance() // skip ?
	then := p.parseExpression(PrecNone)
	if !p.expect(token.Colon) {
		return nil
	}
	elseExpr := p.parseExpression(PrecTernary)
	return &ast.TernaryExpr{Cond: cond, Then: then, Else: elseExpr, Tok: span}
}

func (p *Parser) parseNullCoalesceExpr(left ast.Expr) ast.Expr {
	span := p.cur.Span
	p.advance() // skip ??
	right := p.parseExpression(PrecNullCoalesce)
	return &ast.NullCoalesceExpr{Left: left, Right: right, Tok: span}
}

func (p *Parser) parseTypeofExpr() ast.Expr {
	span := p.cur.Span
	p.advance() // skip 'typeof'
	operand := p.parseExpression(PrecUnary)
	return &ast.TypeofExpr{Operand: operand, Tok: span}
}

func (p *Parser) parseParamList() []*ast.Param {
	var params []*ast.Param
	for p.cur.Type != token.RParen && p.cur.Type != token.EOF {
		if p.cur.Type != token.Ident {
			p.errors.Add(errors.ParseError("expected parameter name", p.cur.Span))
			break
		}
		name := &ast.Ident{Name: p.cur.Literal, Tok: p.cur.Span}
		p.advance()

		var typeAnn *ast.TypeExpr
		if p.cur.Type == token.Colon {
			p.advance()
			typeAnn = p.parseTypeExpr()
		}
		params = append(params, &ast.Param{Name: name, TypeAnn: typeAnn})

		if p.cur.Type == token.Comma {
			p.advance()
		}
	}
	return params
}

func (p *Parser) parseExprList(end token.Type) []ast.Expr {
	var list []ast.Expr
	for p.cur.Type != end && p.cur.Type != token.EOF {
		expr := p.parseExpression(PrecNone)
		if expr != nil {
			list = append(list, expr)
		}
		if p.cur.Type == token.Comma {
			p.advance()
		} else {
			break
		}
	}
	return list
}

func (p *Parser) parseTypeExpr() *ast.TypeExpr {
	if p.cur.Type == token.LBracket {
		span := p.cur.Span
		p.advance() // skip [
		inner := p.parseTypeExpr()
		if !p.expect(token.RBracket) {
			return nil
		}
		return &ast.TypeExpr{Name: "Array", Params: []*ast.TypeExpr{inner}, Tok: span}
	}

	if p.cur.Type == token.Fn && p.peek.Type == token.LParen {
		return p.parseFnType()
	}
	if p.cur.Type == token.Fn {
		te := &ast.TypeExpr{Name: "fn", Tok: p.cur.Span}
		p.advance()
		return te
	}

	if p.cur.Type != token.Ident {
		p.errors.Add(errors.ParseError("expected type name", p.cur.Span))
		return nil
	}

	te := &ast.TypeExpr{Name: p.cur.Literal, Tok: p.cur.Span}
	p.advance()
	return te
}

func (p *Parser) parseFnType() *ast.TypeExpr {
	span := p.cur.Span
	p.advance() // skip 'fn'
	if !p.expect(token.LParen) {
		return nil
	}
	var params []*ast.TypeExpr
	for p.cur.Type != token.RParen && p.cur.Type != token.EOF {
		t := p.parseTypeExpr()
		if t != nil {
			params = append(params, t)
		}
		if p.cur.Type == token.Comma {
			p.advance()
		}
	}
	if !p.expect(token.RParen) {
		return nil
	}
	name := "fn"
	if p.cur.Type == token.Arrow {
		p.advance()
		ret := p.parseTypeExpr()
		if ret != nil {
			params = append(params, ret)
			name = fmt.Sprintf("fn->%s", ret.Name)
		}
	}
	return &ast.TypeExpr{Name: name, Params: params, Tok: span}
}

func (p *Parser) skipSemicolon() {
	if p.cur.Type == token.Semicolon {
		p.advance()
	}
}

func (p *Parser) recover() {
	for p.cur.Type != token.Semicolon && p.cur.Type != token.RBrace && p.cur.Type != token.EOF {
		p.advance()
	}
	if p.cur.Type == token.Semicolon {
		p.advance()
	}
}
