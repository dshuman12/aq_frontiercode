package parser

import (
	"testing"

	"github.com/Mustafa4ngin/Drift/pkg/ast"
	"github.com/Mustafa4ngin/Drift/pkg/token"
)

func parseOK(t *testing.T, input string) *ast.Program {
	t.Helper()
	prog, errs := Parse(input)
	if errs.HasErrors() {
		t.Fatalf("parse errors for %q:\n%s", input, errs)
	}
	return prog
}

func parseExpr(t *testing.T, input string) ast.Expr {
	t.Helper()
	prog := parseOK(t, input)
	if len(prog.Stmts) != 1 {
		t.Fatalf("expected 1 statement, got %d", len(prog.Stmts))
	}
	es, ok := prog.Stmts[0].(*ast.ExprStmt)
	if !ok {
		t.Fatalf("expected ExprStmt, got %T", prog.Stmts[0])
	}
	return es.Expr
}

func TestParseIntLiteral(t *testing.T) {
	expr := parseExpr(t, "42")
	lit, ok := expr.(*ast.IntLit)
	if !ok {
		t.Fatalf("expected IntLit, got %T", expr)
	}
	if lit.Value != 42 {
		t.Errorf("expected 42, got %d", lit.Value)
	}
}

func TestParseHexLiteral(t *testing.T) {
	expr := parseExpr(t, "0xff")
	lit := expr.(*ast.IntLit)
	if lit.Value != 255 {
		t.Errorf("expected 255, got %d", lit.Value)
	}
}

func TestParseBinaryLiteral(t *testing.T) {
	expr := parseExpr(t, "0b1010")
	lit := expr.(*ast.IntLit)
	if lit.Value != 10 {
		t.Errorf("expected 10, got %d", lit.Value)
	}
}

func TestParseFloatLiteral(t *testing.T) {
	expr := parseExpr(t, "3.14")
	lit, ok := expr.(*ast.FloatLit)
	if !ok {
		t.Fatalf("expected FloatLit, got %T", expr)
	}
	if lit.Value != 3.14 {
		t.Errorf("expected 3.14, got %f", lit.Value)
	}
}

func TestParseStringLiteral(t *testing.T) {
	expr := parseExpr(t, `"hello"`)
	lit, ok := expr.(*ast.StringLit)
	if !ok {
		t.Fatalf("expected StringLit, got %T", expr)
	}
	if lit.Value != "hello" {
		t.Errorf("expected 'hello', got %q", lit.Value)
	}
}

func TestParseBoolLiterals(t *testing.T) {
	for _, tc := range []struct {
		input string
		val   bool
	}{{"true", true}, {"false", false}} {
		expr := parseExpr(t, tc.input)
		lit := expr.(*ast.BoolLit)
		if lit.Value != tc.val {
			t.Errorf("input %q: expected %v, got %v", tc.input, tc.val, lit.Value)
		}
	}
}

func TestParseNilLiteral(t *testing.T) {
	expr := parseExpr(t, "nil")
	if _, ok := expr.(*ast.NilLit); !ok {
		t.Fatalf("expected NilLit, got %T", expr)
	}
}

func TestParseIdentifier(t *testing.T) {
	expr := parseExpr(t, "foo")
	id, ok := expr.(*ast.Ident)
	if !ok {
		t.Fatalf("expected Ident, got %T", expr)
	}
	if id.Name != "foo" {
		t.Errorf("expected 'foo', got %q", id.Name)
	}
}

func TestParseUnaryMinus(t *testing.T) {
	expr := parseExpr(t, "-5")
	u, ok := expr.(*ast.UnaryExpr)
	if !ok {
		t.Fatalf("expected UnaryExpr, got %T", expr)
	}
	if u.Op != token.Minus {
		t.Errorf("expected -, got %s", u.Op)
	}
}

func TestParseUnaryBang(t *testing.T) {
	expr := parseExpr(t, "!true")
	u, ok := expr.(*ast.UnaryExpr)
	if !ok {
		t.Fatalf("expected UnaryExpr, got %T", expr)
	}
	if u.Op != token.Bang {
		t.Errorf("expected !, got %s", u.Op)
	}
}

func TestParseBinaryAdd(t *testing.T) {
	expr := parseExpr(t, "1 + 2")
	b, ok := expr.(*ast.BinaryExpr)
	if !ok {
		t.Fatalf("expected BinaryExpr, got %T", expr)
	}
	if b.Op != token.Plus {
		t.Errorf("expected +, got %s", b.Op)
	}
}

func TestParseBinarySub(t *testing.T) {
	expr := parseExpr(t, "5 - 3")
	b := expr.(*ast.BinaryExpr)
	if b.Op != token.Minus {
		t.Errorf("expected -, got %s", b.Op)
	}
}

func TestParseBinaryMul(t *testing.T) {
	expr := parseExpr(t, "2 * 3")
	b := expr.(*ast.BinaryExpr)
	if b.Op != token.Star {
		t.Errorf("expected *, got %s", b.Op)
	}
}

func TestParseBinaryDiv(t *testing.T) {
	expr := parseExpr(t, "10 / 2")
	b := expr.(*ast.BinaryExpr)
	if b.Op != token.Slash {
		t.Errorf("expected /, got %s", b.Op)
	}
}

func TestParseBinaryMod(t *testing.T) {
	expr := parseExpr(t, "10 % 3")
	b := expr.(*ast.BinaryExpr)
	if b.Op != token.Percent {
		t.Errorf("expected %%, got %s", b.Op)
	}
}

func TestPrecedenceMulOverAdd(t *testing.T) {
	expr := parseExpr(t, "1 + 2 * 3")
	b := expr.(*ast.BinaryExpr)
	if b.Op != token.Plus {
		t.Fatalf("top-level should be +, got %s", b.Op)
	}
	right := b.Right.(*ast.BinaryExpr)
	if right.Op != token.Star {
		t.Errorf("right should be *, got %s", right.Op)
	}
}

func TestPrecedenceParens(t *testing.T) {
	expr := parseExpr(t, "(1 + 2) * 3")
	b := expr.(*ast.BinaryExpr)
	if b.Op != token.Star {
		t.Fatalf("top-level should be *, got %s", b.Op)
	}
}

func TestComparisonOperators(t *testing.T) {
	ops := []struct {
		input string
		op    token.Type
	}{
		{"a == b", token.Eq},
		{"a != b", token.NotEq},
		{"a < b", token.Lt},
		{"a > b", token.Gt},
		{"a <= b", token.LtEq},
		{"a >= b", token.GtEq},
	}
	for _, tc := range ops {
		expr := parseExpr(t, tc.input)
		b := expr.(*ast.BinaryExpr)
		if b.Op != tc.op {
			t.Errorf("input %q: expected %s, got %s", tc.input, tc.op, b.Op)
		}
	}
}

func TestLogicalOperators(t *testing.T) {
	expr := parseExpr(t, "a && b || c")
	b := expr.(*ast.BinaryExpr)
	if b.Op != token.Or {
		t.Fatalf("top should be ||, got %s", b.Op)
	}
	left := b.Left.(*ast.BinaryExpr)
	if left.Op != token.And {
		t.Errorf("left should be &&, got %s", left.Op)
	}
}

func TestParseCallExpr(t *testing.T) {
	expr := parseExpr(t, "add(1, 2)")
	call, ok := expr.(*ast.CallExpr)
	if !ok {
		t.Fatalf("expected CallExpr, got %T", expr)
	}
	if len(call.Args) != 2 {
		t.Errorf("expected 2 args, got %d", len(call.Args))
	}
}

func TestParseCallNoArgs(t *testing.T) {
	expr := parseExpr(t, "foo()")
	call := expr.(*ast.CallExpr)
	if len(call.Args) != 0 {
		t.Errorf("expected 0 args, got %d", len(call.Args))
	}
}

func TestParseIndexExpr(t *testing.T) {
	expr := parseExpr(t, "arr[0]")
	idx, ok := expr.(*ast.IndexExpr)
	if !ok {
		t.Fatalf("expected IndexExpr, got %T", expr)
	}
	obj := idx.Object.(*ast.Ident)
	if obj.Name != "arr" {
		t.Errorf("expected 'arr', got %q", obj.Name)
	}
}

func TestParseDotExpr(t *testing.T) {
	expr := parseExpr(t, "obj.field")
	dot, ok := expr.(*ast.DotExpr)
	if !ok {
		t.Fatalf("expected DotExpr, got %T", expr)
	}
	if dot.Field.Name != "field" {
		t.Errorf("expected 'field', got %q", dot.Field.Name)
	}
}

func TestParseChainedCalls(t *testing.T) {
	expr := parseExpr(t, "a.b(1).c")
	dot, ok := expr.(*ast.DotExpr)
	if !ok {
		t.Fatalf("expected DotExpr, got %T", expr)
	}
	if dot.Field.Name != "c" {
		t.Errorf("expected 'c', got %q", dot.Field.Name)
	}
}

func TestParseArrayLiteral(t *testing.T) {
	expr := parseExpr(t, "[1, 2, 3]")
	arr, ok := expr.(*ast.ArrayLit)
	if !ok {
		t.Fatalf("expected ArrayLit, got %T", expr)
	}
	if len(arr.Elems) != 3 {
		t.Errorf("expected 3 elements, got %d", len(arr.Elems))
	}
}

func TestParseEmptyArray(t *testing.T) {
	expr := parseExpr(t, "[]")
	arr := expr.(*ast.ArrayLit)
	if len(arr.Elems) != 0 {
		t.Errorf("expected 0 elements, got %d", len(arr.Elems))
	}
}

func TestParsePipeExpr(t *testing.T) {
	expr := parseExpr(t, "x |> transform")
	pipe, ok := expr.(*ast.PipeExpr)
	if !ok {
		t.Fatalf("expected PipeExpr, got %T", expr)
	}
	left := pipe.Left.(*ast.Ident)
	if left.Name != "x" {
		t.Errorf("expected 'x', got %q", left.Name)
	}
}

func TestParseRangeExpr(t *testing.T) {
	expr := parseExpr(t, "0..10")
	r, ok := expr.(*ast.RangeExpr)
	if !ok {
		t.Fatalf("expected RangeExpr, got %T", expr)
	}
	start := r.Start.(*ast.IntLit)
	end := r.End.(*ast.IntLit)
	if start.Value != 0 || end.Value != 10 {
		t.Errorf("expected 0..10, got %d..%d", start.Value, end.Value)
	}
}

func TestParseLetStmt(t *testing.T) {
	prog := parseOK(t, "let x = 42")
	let, ok := prog.Stmts[0].(*ast.LetStmt)
	if !ok {
		t.Fatalf("expected LetStmt, got %T", prog.Stmts[0])
	}
	if let.Name.Name != "x" {
		t.Errorf("expected 'x', got %q", let.Name.Name)
	}
	if let.Mutable {
		t.Error("expected immutable")
	}
}

func TestParseLetMut(t *testing.T) {
	prog := parseOK(t, "let mut y = 0")
	let := prog.Stmts[0].(*ast.LetStmt)
	if !let.Mutable {
		t.Error("expected mutable")
	}
}

func TestParseLetWithType(t *testing.T) {
	prog := parseOK(t, "let x: int = 42")
	let := prog.Stmts[0].(*ast.LetStmt)
	if let.TypeAnn == nil {
		t.Fatal("expected type annotation")
	}
	if let.TypeAnn.Name != "int" {
		t.Errorf("expected 'int', got %q", let.TypeAnn.Name)
	}
}

func TestParseReturnStmt(t *testing.T) {
	prog := parseOK(t, "return 42")
	ret, ok := prog.Stmts[0].(*ast.ReturnStmt)
	if !ok {
		t.Fatalf("expected ReturnStmt, got %T", prog.Stmts[0])
	}
	if ret.Value == nil {
		t.Error("expected return value")
	}
}

func TestParseReturnNoValue(t *testing.T) {
	prog := parseOK(t, "return;")
	ret := prog.Stmts[0].(*ast.ReturnStmt)
	if ret.Value != nil {
		t.Error("expected no return value")
	}
}

func TestParseIfExpr(t *testing.T) {
	expr := parseExpr(t, "if x > 0 { x } else { -x }")
	ifE, ok := expr.(*ast.IfExpr)
	if !ok {
		t.Fatalf("expected IfExpr, got %T", expr)
	}
	if ifE.Else == nil {
		t.Error("expected else branch")
	}
}

func TestParseIfNoElse(t *testing.T) {
	expr := parseExpr(t, "if true { 1 }")
	ifE := expr.(*ast.IfExpr)
	if ifE.Else != nil {
		t.Error("expected no else branch")
	}
}

func TestParseElseIf(t *testing.T) {
	expr := parseExpr(t, "if a { 1 } else if b { 2 } else { 3 }")
	ifE := expr.(*ast.IfExpr)
	elseIf, ok := ifE.Else.(*ast.IfExpr)
	if !ok {
		t.Fatalf("expected IfExpr in else, got %T", ifE.Else)
	}
	if elseIf.Else == nil {
		t.Error("expected final else")
	}
}

func TestParseWhileStmt(t *testing.T) {
	prog := parseOK(t, "while x > 0 { x = x - 1 }")
	_, ok := prog.Stmts[0].(*ast.WhileStmt)
	if !ok {
		t.Fatalf("expected WhileStmt, got %T", prog.Stmts[0])
	}
}

func TestParseForStmt(t *testing.T) {
	prog := parseOK(t, "for i in 0..10 { print(i) }")
	forS, ok := prog.Stmts[0].(*ast.ForStmt)
	if !ok {
		t.Fatalf("expected ForStmt, got %T", prog.Stmts[0])
	}
	if forS.Var.Name != "i" {
		t.Errorf("expected 'i', got %q", forS.Var.Name)
	}
}

func TestParseBreakContinue(t *testing.T) {
	prog := parseOK(t, "break; continue")
	if _, ok := prog.Stmts[0].(*ast.BreakStmt); !ok {
		t.Errorf("expected BreakStmt, got %T", prog.Stmts[0])
	}
	if _, ok := prog.Stmts[1].(*ast.ContinueStmt); !ok {
		t.Errorf("expected ContinueStmt, got %T", prog.Stmts[1])
	}
}

func TestParseFnExpr(t *testing.T) {
	expr := parseExpr(t, "fn(x: int, y: int) -> int { x + y }")
	fn, ok := expr.(*ast.FnExpr)
	if !ok {
		t.Fatalf("expected FnExpr, got %T", expr)
	}
	if fn.Name != nil {
		t.Error("expected anonymous function")
	}
	if len(fn.Params) != 2 {
		t.Errorf("expected 2 params, got %d", len(fn.Params))
	}
}

func TestParseNamedFn(t *testing.T) {
	prog := parseOK(t, "fn add(a: int, b: int) -> int { a + b }")
	es := prog.Stmts[0].(*ast.ExprStmt)
	fn := es.Expr.(*ast.FnExpr)
	if fn.Name == nil || fn.Name.Name != "add" {
		t.Errorf("expected name 'add', got %v", fn.Name)
	}
}

func TestParseMatchExpr(t *testing.T) {
	expr := parseExpr(t, `match x { 0 => "zero"; 1 => "one"; _ => "other" }`)
	m, ok := expr.(*ast.MatchExpr)
	if !ok {
		t.Fatalf("expected MatchExpr, got %T", expr)
	}
	if len(m.Arms) != 3 {
		t.Errorf("expected 3 arms, got %d", len(m.Arms))
	}
}

func TestParseAssignStmt(t *testing.T) {
	prog := parseOK(t, "x = 42")
	a, ok := prog.Stmts[0].(*ast.AssignStmt)
	if !ok {
		t.Fatalf("expected AssignStmt, got %T", prog.Stmts[0])
	}
	if a.Op != token.Assign {
		t.Errorf("expected =, got %s", a.Op)
	}
}

func TestParseCompoundAssign(t *testing.T) {
	for _, tc := range []struct {
		input string
		op    token.Type
	}{
		{"x += 1", token.PlusAssign},
		{"x -= 1", token.MinusAssign},
		{"x *= 2", token.StarAssign},
		{"x /= 2", token.SlashAssign},
	} {
		prog := parseOK(t, tc.input)
		a := prog.Stmts[0].(*ast.AssignStmt)
		if a.Op != tc.op {
			t.Errorf("input %q: expected %s, got %s", tc.input, tc.op, a.Op)
		}
	}
}

func TestParseMultipleStatements(t *testing.T) {
	prog := parseOK(t, "let x = 1; let y = 2; x + y")
	if len(prog.Stmts) != 3 {
		t.Errorf("expected 3 statements, got %d", len(prog.Stmts))
	}
}

func TestParseComplexProgram(t *testing.T) {
	input := `
fn fibonacci(n: int) -> int {
    if n <= 1 {
        n
    } else {
        fibonacci(n - 1) + fibonacci(n - 2)
    }
}
let result = fibonacci(10)
`
	prog, errs := Parse(input)
	if errs.HasErrors() {
		t.Fatalf("parse errors:\n%s", errs)
	}
	if len(prog.Stmts) != 2 {
		t.Errorf("expected 2 statements, got %d", len(prog.Stmts))
	}
}

func TestParseNestedExpressions(t *testing.T) {
	expr := parseExpr(t, "a + b * c - d / e")
	b := expr.(*ast.BinaryExpr)
	if b.Op != token.Minus {
		t.Fatalf("top should be -, got %s", b.Op)
	}
}

func TestParseArrayType(t *testing.T) {
	prog := parseOK(t, "let x: [int] = [1, 2, 3]")
	let := prog.Stmts[0].(*ast.LetStmt)
	if let.TypeAnn.Name != "Array" {
		t.Errorf("expected Array type, got %q", let.TypeAnn.Name)
	}
}

func TestParseErrors(t *testing.T) {
	inputs := []string{
		"let = 5",
		"fn(,) {}",
		"if { }",
		"1 +",
	}
	for _, input := range inputs {
		_, errs := Parse(input)
		if !errs.HasErrors() {
			t.Errorf("expected parse error for %q", input)
		}
	}
}

func TestParseSemicolonOptional(t *testing.T) {
	prog := parseOK(t, "let x = 1\nlet y = 2")
	if len(prog.Stmts) != 2 {
		t.Errorf("expected 2 statements, got %d", len(prog.Stmts))
	}
}

func TestParseEmptyBlock(t *testing.T) {
	prog := parseOK(t, "fn noop() {}")
	es := prog.Stmts[0].(*ast.ExprStmt)
	fn := es.Expr.(*ast.FnExpr)
	if len(fn.Body.Stmts) != 0 {
		t.Errorf("expected empty body, got %d stmts", len(fn.Body.Stmts))
	}
}

func TestParsePipeChain(t *testing.T) {
	expr := parseExpr(t, "data |> transform |> filter |> reduce")
	p1 := expr.(*ast.PipeExpr)
	p2 := p1.Left.(*ast.PipeExpr)
	p3 := p2.Left.(*ast.PipeExpr)
	if p3.Left.(*ast.Ident).Name != "data" {
		t.Error("pipe chain left-most should be 'data'")
	}
}

func TestParseMapLiteral(t *testing.T) {
	expr := parseExpr(t, `{"a": 1, "b": 2}`)
	m, ok := expr.(*ast.MapLit)
	if !ok {
		t.Fatalf("expected MapLit, got %T", expr)
	}
	if len(m.Keys) != 2 {
		t.Errorf("expected 2 entries, got %d", len(m.Keys))
	}
}

func TestParseConstStmt(t *testing.T) {
	prog := parseOK(t, "const PI = 3.14")
	if len(prog.Stmts) != 1 {
		t.Fatalf("expected 1 statement, got %d", len(prog.Stmts))
	}
	cs, ok := prog.Stmts[0].(*ast.ConstStmt)
	if !ok {
		t.Fatalf("expected ConstStmt, got %T", prog.Stmts[0])
	}
	if cs.Name.Name != "PI" {
		t.Errorf("expected 'PI', got %q", cs.Name.Name)
	}
}

func TestParseConstWithType(t *testing.T) {
	prog := parseOK(t, "const MAX: int = 100")
	cs := prog.Stmts[0].(*ast.ConstStmt)
	if cs.TypeAnn == nil {
		t.Fatal("expected type annotation")
	}
	if cs.TypeAnn.Name != "int" {
		t.Errorf("expected 'int', got %q", cs.TypeAnn.Name)
	}
}

func TestParseTypeofExpr(t *testing.T) {
	expr := parseExpr(t, "typeof x")
	te, ok := expr.(*ast.TypeofExpr)
	if !ok {
		t.Fatalf("expected TypeofExpr, got %T", expr)
	}
	id := te.Operand.(*ast.Ident)
	if id.Name != "x" {
		t.Errorf("expected 'x', got %q", id.Name)
	}
}

func TestParseTernaryExpr(t *testing.T) {
	expr := parseExpr(t, "x > 0 ? 1 : -1")
	te, ok := expr.(*ast.TernaryExpr)
	if !ok {
		t.Fatalf("expected TernaryExpr, got %T", expr)
	}
	if te.Cond == nil || te.Then == nil || te.Else == nil {
		t.Fatal("ternary parts should not be nil")
	}
}

func TestParseNullCoalesce(t *testing.T) {
	expr := parseExpr(t, "x ?? 42")
	nc, ok := expr.(*ast.NullCoalesceExpr)
	if !ok {
		t.Fatalf("expected NullCoalesceExpr, got %T", expr)
	}
	left := nc.Left.(*ast.Ident)
	if left.Name != "x" {
		t.Errorf("expected 'x', got %q", left.Name)
	}
}

func TestParsePrecedenceChain(t *testing.T) {
	// Test that ternary has lower precedence than comparison
	expr := parseExpr(t, "a + b > c ? d : e")
	te, ok := expr.(*ast.TernaryExpr)
	if !ok {
		t.Fatalf("expected TernaryExpr at top level, got %T", expr)
	}
	// The condition should be (a + b) > c
	cond, ok := te.Cond.(*ast.BinaryExpr)
	if !ok {
		t.Fatalf("expected BinaryExpr condition, got %T", te.Cond)
	}
	if cond.Op != token.Gt {
		t.Errorf("expected > operator, got %s", cond.Op)
	}
}

func TestParseNestedTernary(t *testing.T) {
	expr := parseExpr(t, "a ? b ? 1 : 2 : 3")
	te, ok := expr.(*ast.TernaryExpr)
	if !ok {
		t.Fatalf("expected TernaryExpr, got %T", expr)
	}
	// Then branch should also be a ternary
	inner, ok := te.Then.(*ast.TernaryExpr)
	if !ok {
		t.Fatalf("expected nested TernaryExpr in then, got %T", te.Then)
	}
	_ = inner
}

func TestParseErrorRecovery(t *testing.T) {
	// Should not panic on malformed input
	prog, errs := Parse("let = ;")
	if !errs.HasErrors() {
		t.Fatal("expected parse errors")
	}
	_ = prog
}

func TestParseMultiStmtWithConst(t *testing.T) {
	prog := parseOK(t, "const x = 1; let y = 2; x + y")
	if len(prog.Stmts) != 3 {
		t.Errorf("expected 3 statements, got %d", len(prog.Stmts))
	}
}

func TestParseChainedNullCoalesce(t *testing.T) {
	expr := parseExpr(t, "a ?? b ?? c")
	nc, ok := expr.(*ast.NullCoalesceExpr)
	if !ok {
		t.Fatalf("expected NullCoalesceExpr, got %T", expr)
	}
	// Left-associative: (a ?? b) ?? c
	innerNC, ok := nc.Left.(*ast.NullCoalesceExpr)
	if !ok {
		t.Fatalf("expected nested NullCoalesceExpr in left, got %T", nc.Left)
	}
	_ = innerNC
}
