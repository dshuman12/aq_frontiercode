package ast

import (
	"testing"

	"github.com/Mustafa4ngin/Drift/pkg/token"
)

var zeroSpan = token.Span{}

func TestIntLitString(t *testing.T) {
	lit := &IntLit{Value: 42, Raw: "42", Tok: zeroSpan}
	if s := lit.String(); s != "42" {
		t.Errorf("expected '42', got %q", s)
	}
}

func TestFloatLitString(t *testing.T) {
	lit := &FloatLit{Value: 3.14, Raw: "3.14", Tok: zeroSpan}
	if s := lit.String(); s != "3.14" {
		t.Errorf("expected '3.14', got %q", s)
	}
}

func TestStringLitString(t *testing.T) {
	lit := &StringLit{Value: "hello", Tok: zeroSpan}
	if s := lit.String(); s != `"hello"` {
		t.Errorf("expected '\"hello\"', got %q", s)
	}
}

func TestBoolLitString(t *testing.T) {
	tru := &BoolLit{Value: true, Tok: zeroSpan}
	fls := &BoolLit{Value: false, Tok: zeroSpan}
	if tru.String() != "true" {
		t.Errorf("expected 'true', got %q", tru.String())
	}
	if fls.String() != "false" {
		t.Errorf("expected 'false', got %q", fls.String())
	}
}

func TestNilLitString(t *testing.T) {
	n := &NilLit{Tok: zeroSpan}
	if s := n.String(); s != "nil" {
		t.Errorf("expected 'nil', got %q", s)
	}
}

func TestIdentString(t *testing.T) {
	id := &Ident{Name: "foo", Tok: zeroSpan}
	if s := id.String(); s != "foo" {
		t.Errorf("expected 'foo', got %q", s)
	}
}

func TestBinaryExprString(t *testing.T) {
	expr := &BinaryExpr{
		Left:  &IntLit{Value: 1, Raw: "1", Tok: zeroSpan},
		Op:    token.Plus,
		Right: &IntLit{Value: 2, Raw: "2", Tok: zeroSpan},
		Tok:   zeroSpan,
	}
	if s := expr.String(); s != "(1 + 2)" {
		t.Errorf("expected '(1 + 2)', got %q", s)
	}
}

func TestUnaryExprString(t *testing.T) {
	expr := &UnaryExpr{
		Op:      token.Minus,
		Operand: &IntLit{Value: 5, Raw: "5", Tok: zeroSpan},
		Tok:     zeroSpan,
	}
	if s := expr.String(); s != "(-5)" {
		t.Errorf("expected '(-5)', got %q", s)
	}
}

func TestCallExprString(t *testing.T) {
	expr := &CallExpr{
		Func: &Ident{Name: "add", Tok: zeroSpan},
		Args: []Expr{
			&IntLit{Value: 1, Raw: "1", Tok: zeroSpan},
			&IntLit{Value: 2, Raw: "2", Tok: zeroSpan},
		},
		Tok: zeroSpan,
	}
	if s := expr.String(); s != "add(1, 2)" {
		t.Errorf("expected 'add(1, 2)', got %q", s)
	}
}

func TestArrayLitString(t *testing.T) {
	arr := &ArrayLit{
		Elems: []Expr{
			&IntLit{Value: 1, Raw: "1", Tok: zeroSpan},
			&IntLit{Value: 2, Raw: "2", Tok: zeroSpan},
		},
		Tok: zeroSpan,
	}
	if s := arr.String(); s != "[1, 2]" {
		t.Errorf("expected '[1, 2]', got %q", s)
	}
}

func TestLetStmtString(t *testing.T) {
	s := &LetStmt{
		Name:    &Ident{Name: "x", Tok: zeroSpan},
		Mutable: true,
		Value:   &IntLit{Value: 42, Raw: "42", Tok: zeroSpan},
		Tok:     zeroSpan,
	}
	if str := s.String(); str != "let mut x = 42" {
		t.Errorf("expected 'let mut x = 42', got %q", str)
	}
}

func TestLetStmtWithType(t *testing.T) {
	s := &LetStmt{
		Name:    &Ident{Name: "x", Tok: zeroSpan},
		Mutable: false,
		TypeAnn: &TypeExpr{Name: "int", Tok: zeroSpan},
		Value:   &IntLit{Value: 42, Raw: "42", Tok: zeroSpan},
		Tok:     zeroSpan,
	}
	if str := s.String(); str != "let x: int = 42" {
		t.Errorf("expected 'let x: int = 42', got %q", str)
	}
}

func TestReturnStmtString(t *testing.T) {
	s := &ReturnStmt{Value: &IntLit{Value: 0, Raw: "0", Tok: zeroSpan}, Tok: zeroSpan}
	if str := s.String(); str != "return 0" {
		t.Errorf("expected 'return 0', got %q", str)
	}
}

func TestReturnStmtNoValue(t *testing.T) {
	s := &ReturnStmt{Tok: zeroSpan}
	if str := s.String(); str != "return" {
		t.Errorf("expected 'return', got %q", str)
	}
}

func TestBlockString(t *testing.T) {
	b := &Block{
		Stmts: []Stmt{
			&ExprStmt{Expr: &IntLit{Value: 1, Raw: "1", Tok: zeroSpan}},
			&ExprStmt{Expr: &IntLit{Value: 2, Raw: "2", Tok: zeroSpan}},
		},
		Tok: zeroSpan,
	}
	if s := b.String(); s != "{ 1; 2 }" {
		t.Errorf("expected '{ 1; 2 }', got %q", s)
	}
}

func TestPipeExprString(t *testing.T) {
	expr := &PipeExpr{
		Left:  &Ident{Name: "x", Tok: zeroSpan},
		Right: &Ident{Name: "transform", Tok: zeroSpan},
		Tok:   zeroSpan,
	}
	if s := expr.String(); s != "(x |> transform)" {
		t.Errorf("expected '(x |> transform)', got %q", s)
	}
}

func TestRangeExprString(t *testing.T) {
	expr := &RangeExpr{
		Start: &IntLit{Value: 0, Raw: "0", Tok: zeroSpan},
		End:   &IntLit{Value: 10, Raw: "10", Tok: zeroSpan},
		Tok:   zeroSpan,
	}
	if s := expr.String(); s != "0..10" {
		t.Errorf("expected '0..10', got %q", s)
	}
}

func TestCountNodes(t *testing.T) {
	prog := &Program{
		Stmts: []Stmt{
			&LetStmt{
				Name: &Ident{Name: "x", Tok: zeroSpan},
				Value: &BinaryExpr{
					Left:  &IntLit{Value: 1, Raw: "1", Tok: zeroSpan},
					Op:    token.Plus,
					Right: &IntLit{Value: 2, Raw: "2", Tok: zeroSpan},
					Tok:   zeroSpan,
				},
				Tok: zeroSpan,
			},
		},
	}
	count := CountNodes(prog)
	if count != 6 { // program, let, ident, binary, int, int
		t.Errorf("expected 5 nodes, got %d", count)
	}
}

func TestFindIdents(t *testing.T) {
	prog := &Program{
		Stmts: []Stmt{
			&LetStmt{
				Name: &Ident{Name: "x", Tok: zeroSpan},
				Value: &BinaryExpr{
					Left:  &Ident{Name: "a", Tok: zeroSpan},
					Op:    token.Plus,
					Right: &Ident{Name: "b", Tok: zeroSpan},
					Tok:   zeroSpan,
				},
				Tok: zeroSpan,
			},
		},
	}
	idents := FindIdents(prog)
	if len(idents) != 3 {
		t.Fatalf("expected 3 idents, got %d", len(idents))
	}
	names := []string{"x", "a", "b"}
	for i, id := range idents {
		if id.Name != names[i] {
			t.Errorf("ident[%d]: expected %q, got %q", i, names[i], id.Name)
		}
	}
}

func TestTypeExprString(t *testing.T) {
	simple := &TypeExpr{Name: "int", Tok: zeroSpan}
	if s := simple.String(); s != "int" {
		t.Errorf("expected 'int', got %q", s)
	}

	parameterized := &TypeExpr{
		Name:   "Array",
		Params: []*TypeExpr{{Name: "int", Tok: zeroSpan}},
		Tok:    zeroSpan,
	}
	if s := parameterized.String(); s != "Array[int]" {
		t.Errorf("expected 'Array[int]', got %q", s)
	}
}

func TestProgramString(t *testing.T) {
	prog := &Program{
		Stmts: []Stmt{
			&ExprStmt{Expr: &IntLit{Value: 1, Raw: "1", Tok: zeroSpan}},
			&ExprStmt{Expr: &IntLit{Value: 2, Raw: "2", Tok: zeroSpan}},
		},
	}
	if s := prog.String(); s != "1\n2" {
		t.Errorf("expected '1\\n2', got %q", s)
	}
}

func TestEmptyProgramString(t *testing.T) {
	prog := &Program{}
	if s := prog.String(); s != "" {
		t.Errorf("expected empty, got %q", s)
	}
}

func TestWalkStopsOnFalse(t *testing.T) {
	prog := &Program{
		Stmts: []Stmt{
			&ExprStmt{Expr: &IntLit{Value: 1, Raw: "1", Tok: zeroSpan}},
		},
	}
	count := 0
	Walk(prog, func(n Node) bool {
		count++
		return false // stop immediately
	})
	if count != 1 {
		t.Errorf("expected 1 visit, got %d", count)
	}
}

func TestMapLitString(t *testing.T) {
	m := &MapLit{
		Keys:   []Expr{&StringLit{Value: "a", Tok: zeroSpan}},
		Values: []Expr{&IntLit{Value: 1, Raw: "1", Tok: zeroSpan}},
		Tok:    zeroSpan,
	}
	if s := m.String(); s != `{"a": 1}` {
		t.Errorf("expected '{\"a\": 1}', got %q", s)
	}
}

func TestMatchExprString(t *testing.T) {
	m := &MatchExpr{
		Subject: &Ident{Name: "x", Tok: zeroSpan},
		Arms: []*MatchArm{
			{
				Pattern: &IntLit{Value: 0, Raw: "0", Tok: zeroSpan},
				Body:    &StringLit{Value: "zero", Tok: zeroSpan},
				Tok:     zeroSpan,
			},
		},
		Tok: zeroSpan,
	}
	expected := `match x { 0 => "zero" }`
	if s := m.String(); s != expected {
		t.Errorf("expected %q, got %q", expected, s)
	}
}

func TestFnExprString(t *testing.T) {
	fn := &FnExpr{
		Name: &Ident{Name: "add", Tok: zeroSpan},
		Params: []*Param{
			{Name: &Ident{Name: "a", Tok: zeroSpan}, TypeAnn: &TypeExpr{Name: "int", Tok: zeroSpan}},
			{Name: &Ident{Name: "b", Tok: zeroSpan}, TypeAnn: &TypeExpr{Name: "int", Tok: zeroSpan}},
		},
		RetType: &TypeExpr{Name: "int", Tok: zeroSpan},
		Body:    &Block{Stmts: []Stmt{&ExprStmt{Expr: &Ident{Name: "a", Tok: zeroSpan}}}, Tok: zeroSpan},
		Tok:     zeroSpan,
	}
	expected := "fn add(a: int, b: int) -> int { a }"
	if s := fn.String(); s != expected {
		t.Errorf("expected %q, got %q", expected, s)
	}
}

func TestIndexExprString(t *testing.T) {
	idx := &IndexExpr{
		Object: &Ident{Name: "arr", Tok: zeroSpan},
		Index:  &IntLit{Value: 0, Raw: "0", Tok: zeroSpan},
		Tok:    zeroSpan,
	}
	if s := idx.String(); s != "arr[0]" {
		t.Errorf("expected 'arr[0]', got %q", s)
	}
}

func TestDotExprString(t *testing.T) {
	dot := &DotExpr{
		Object: &Ident{Name: "obj", Tok: zeroSpan},
		Field:  &Ident{Name: "field", Tok: zeroSpan},
		Tok:    zeroSpan,
	}
	if s := dot.String(); s != "obj.field" {
		t.Errorf("expected 'obj.field', got %q", s)
	}
}

func TestIfExprString(t *testing.T) {
	ifExpr := &IfExpr{
		Cond: &BoolLit{Value: true, Tok: zeroSpan},
		Then: &Block{Stmts: []Stmt{&ExprStmt{Expr: &IntLit{Value: 1, Raw: "1", Tok: zeroSpan}}}, Tok: zeroSpan},
		Tok:  zeroSpan,
	}
	expected := "if true { 1 }"
	if s := ifExpr.String(); s != expected {
		t.Errorf("expected %q, got %q", expected, s)
	}
}

func TestIfExprWithElse(t *testing.T) {
	ifExpr := &IfExpr{
		Cond: &BoolLit{Value: true, Tok: zeroSpan},
		Then: &Block{Stmts: []Stmt{&ExprStmt{Expr: &IntLit{Value: 1, Raw: "1", Tok: zeroSpan}}}, Tok: zeroSpan},
		Else: &Block{Stmts: []Stmt{&ExprStmt{Expr: &IntLit{Value: 2, Raw: "2", Tok: zeroSpan}}}, Tok: zeroSpan},
		Tok:  zeroSpan,
	}
	expected := "if true { 1 } else { 2 }"
	if s := ifExpr.String(); s != expected {
		t.Errorf("expected %q, got %q", expected, s)
	}
}
