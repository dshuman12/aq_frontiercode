package ast

import (
	"fmt"
	"strings"

	"github.com/Mustafa4ngin/Drift/pkg/token"
)

type Node interface {
	Span() token.Span
	String() string
	nodeMarker()
}

type Expr interface {
	Node
	exprMarker()
}

type Stmt interface {
	Node
	stmtMarker()
}

// Program is the root AST node
type Program struct {
	Stmts []Stmt
}

func (p *Program) Span() token.Span {
	if len(p.Stmts) == 0 {
		return token.Span{}
	}
	return token.Span{
		Start: p.Stmts[0].Span().Start,
		End:   p.Stmts[len(p.Stmts)-1].Span().End,
	}
}

func (p *Program) String() string {
	var parts []string
	for _, s := range p.Stmts {
		parts = append(parts, s.String())
	}
	return strings.Join(parts, "\n")
}

func (p *Program) nodeMarker() {}

// --- Statements ---

type LetStmt struct {
	Name    *Ident
	Mutable bool
	TypeAnn *TypeExpr
	Value   Expr
	Tok     token.Span
}

func (s *LetStmt) Span() token.Span  { return s.Tok }
func (s *LetStmt) stmtMarker()       {}
func (s *LetStmt) nodeMarker()       {}
func (s *LetStmt) String() string {
	mut := ""
	if s.Mutable {
		mut = "mut "
	}
	ann := ""
	if s.TypeAnn != nil {
		ann = ": " + s.TypeAnn.String()
	}
	return fmt.Sprintf("let %s%s%s = %s", mut, s.Name, ann, s.Value)
}

type ReturnStmt struct {
	Value Expr
	Tok   token.Span
}

func (s *ReturnStmt) Span() token.Span { return s.Tok }
func (s *ReturnStmt) stmtMarker()      {}
func (s *ReturnStmt) nodeMarker()      {}
func (s *ReturnStmt) String() string {
	if s.Value == nil {
		return "return"
	}
	return "return " + s.Value.String()
}

type ExprStmt struct {
	Expr Expr
}

func (s *ExprStmt) Span() token.Span { return s.Expr.Span() }
func (s *ExprStmt) stmtMarker()      {}
func (s *ExprStmt) nodeMarker()      {}
func (s *ExprStmt) String() string   { return s.Expr.String() }

type WhileStmt struct {
	Cond Expr
	Body *Block
	Tok  token.Span
}

func (s *WhileStmt) Span() token.Span { return s.Tok }
func (s *WhileStmt) stmtMarker()      {}
func (s *WhileStmt) nodeMarker()      {}
func (s *WhileStmt) String() string {
	return fmt.Sprintf("while %s %s", s.Cond, s.Body)
}

type ForStmt struct {
	Var   *Ident
	Iter  Expr
	Body  *Block
	Tok   token.Span
}

func (s *ForStmt) Span() token.Span { return s.Tok }
func (s *ForStmt) stmtMarker()      {}
func (s *ForStmt) nodeMarker()      {}
func (s *ForStmt) String() string {
	return fmt.Sprintf("for %s in %s %s", s.Var, s.Iter, s.Body)
}

type BreakStmt struct {
	Tok token.Span
}

func (s *BreakStmt) Span() token.Span { return s.Tok }
func (s *BreakStmt) stmtMarker()      {}
func (s *BreakStmt) nodeMarker()      {}
func (s *BreakStmt) String() string   { return "break" }

type ContinueStmt struct {
	Tok token.Span
}

func (s *ContinueStmt) Span() token.Span { return s.Tok }
func (s *ContinueStmt) stmtMarker()      {}
func (s *ContinueStmt) nodeMarker()      {}
func (s *ContinueStmt) String() string   { return "continue" }

type AssignStmt struct {
	Target Expr
	Op     token.Type
	Value  Expr
	Tok    token.Span
}

func (s *AssignStmt) Span() token.Span { return s.Tok }
func (s *AssignStmt) stmtMarker()      {}
func (s *AssignStmt) nodeMarker()      {}
func (s *AssignStmt) String() string {
	return fmt.Sprintf("%s %s %s", s.Target, s.Op, s.Value)
}

// --- Expressions ---

type IntLit struct {
	Value int64
	Raw   string
	Tok   token.Span
}

func (e *IntLit) Span() token.Span { return e.Tok }
func (e *IntLit) exprMarker()      {}
func (e *IntLit) nodeMarker()      {}
func (e *IntLit) String() string   { return e.Raw }

type FloatLit struct {
	Value float64
	Raw   string
	Tok   token.Span
}

func (e *FloatLit) Span() token.Span { return e.Tok }
func (e *FloatLit) exprMarker()      {}
func (e *FloatLit) nodeMarker()      {}
func (e *FloatLit) String() string   { return e.Raw }

type StringLit struct {
	Value string
	Tok   token.Span
}

func (e *StringLit) Span() token.Span { return e.Tok }
func (e *StringLit) exprMarker()      {}
func (e *StringLit) nodeMarker()      {}
func (e *StringLit) String() string   { return fmt.Sprintf("%q", e.Value) }

type BoolLit struct {
	Value bool
	Tok   token.Span
}

func (e *BoolLit) Span() token.Span { return e.Tok }
func (e *BoolLit) exprMarker()      {}
func (e *BoolLit) nodeMarker()      {}
func (e *BoolLit) String() string   { return fmt.Sprintf("%t", e.Value) }

type NilLit struct {
	Tok token.Span
}

func (e *NilLit) Span() token.Span { return e.Tok }
func (e *NilLit) exprMarker()      {}
func (e *NilLit) nodeMarker()      {}
func (e *NilLit) String() string   { return "nil" }

type Ident struct {
	Name string
	Tok  token.Span
}

func (e *Ident) Span() token.Span { return e.Tok }
func (e *Ident) exprMarker()      {}
func (e *Ident) nodeMarker()      {}
func (e *Ident) String() string   { return e.Name }

type UnaryExpr struct {
	Op      token.Type
	Operand Expr
	Tok     token.Span
}

func (e *UnaryExpr) Span() token.Span { return e.Tok }
func (e *UnaryExpr) exprMarker()      {}
func (e *UnaryExpr) nodeMarker()      {}
func (e *UnaryExpr) String() string {
	return fmt.Sprintf("(%s%s)", e.Op, e.Operand)
}

type BinaryExpr struct {
	Left  Expr
	Op    token.Type
	Right Expr
	Tok   token.Span
}

func (e *BinaryExpr) Span() token.Span { return e.Tok }
func (e *BinaryExpr) exprMarker()      {}
func (e *BinaryExpr) nodeMarker()      {}
func (e *BinaryExpr) String() string {
	return fmt.Sprintf("(%s %s %s)", e.Left, e.Op, e.Right)
}

type CallExpr struct {
	Func Expr
	Args []Expr
	Tok  token.Span
}

func (e *CallExpr) Span() token.Span { return e.Tok }
func (e *CallExpr) exprMarker()      {}
func (e *CallExpr) nodeMarker()      {}
func (e *CallExpr) String() string {
	args := make([]string, len(e.Args))
	for i, a := range e.Args {
		args[i] = a.String()
	}
	return fmt.Sprintf("%s(%s)", e.Func, strings.Join(args, ", "))
}

type IndexExpr struct {
	Object Expr
	Index  Expr
	Tok    token.Span
}

func (e *IndexExpr) Span() token.Span { return e.Tok }
func (e *IndexExpr) exprMarker()      {}
func (e *IndexExpr) nodeMarker()      {}
func (e *IndexExpr) String() string {
	return fmt.Sprintf("%s[%s]", e.Object, e.Index)
}

type DotExpr struct {
	Object Expr
	Field  *Ident
	Tok    token.Span
}

func (e *DotExpr) Span() token.Span { return e.Tok }
func (e *DotExpr) exprMarker()      {}
func (e *DotExpr) nodeMarker()      {}
func (e *DotExpr) String() string {
	return fmt.Sprintf("%s.%s", e.Object, e.Field)
}

type IfExpr struct {
	Cond Expr
	Then *Block
	Else Node // *Block or *IfExpr
	Tok  token.Span
}

func (e *IfExpr) Span() token.Span { return e.Tok }
func (e *IfExpr) exprMarker()      {}
func (e *IfExpr) nodeMarker()      {}
func (e *IfExpr) String() string {
	s := fmt.Sprintf("if %s %s", e.Cond, e.Then)
	if e.Else != nil {
		s += " else " + e.Else.String()
	}
	return s
}

type Block struct {
	Stmts []Stmt
	Tok   token.Span
}

func (b *Block) Span() token.Span { return b.Tok }
func (b *Block) exprMarker()      {}
func (b *Block) nodeMarker()      {}
func (b *Block) String() string {
	parts := make([]string, len(b.Stmts))
	for i, s := range b.Stmts {
		parts[i] = s.String()
	}
	return "{ " + strings.Join(parts, "; ") + " }"
}

type FnExpr struct {
	Name   *Ident
	Params []*Param
	RetType *TypeExpr
	Body   *Block
	Tok    token.Span
}

func (e *FnExpr) Span() token.Span { return e.Tok }
func (e *FnExpr) exprMarker()      {}
func (e *FnExpr) nodeMarker()      {}
func (e *FnExpr) String() string {
	params := make([]string, len(e.Params))
	for i, p := range e.Params {
		params[i] = p.String()
	}
	name := ""
	if e.Name != nil {
		name = e.Name.Name
	}
	ret := ""
	if e.RetType != nil {
		ret = " -> " + e.RetType.String()
	}
	return fmt.Sprintf("fn %s(%s)%s %s", name, strings.Join(params, ", "), ret, e.Body)
}

type Param struct {
	Name    *Ident
	TypeAnn *TypeExpr
}

func (p *Param) String() string {
	if p.TypeAnn != nil {
		return fmt.Sprintf("%s: %s", p.Name, p.TypeAnn)
	}
	return p.Name.String()
}

type ArrayLit struct {
	Elems []Expr
	Tok   token.Span
}

func (e *ArrayLit) Span() token.Span { return e.Tok }
func (e *ArrayLit) exprMarker()      {}
func (e *ArrayLit) nodeMarker()      {}
func (e *ArrayLit) String() string {
	elems := make([]string, len(e.Elems))
	for i, el := range e.Elems {
		elems[i] = el.String()
	}
	return "[" + strings.Join(elems, ", ") + "]"
}

type MapLit struct {
	Keys   []Expr
	Values []Expr
	Tok    token.Span
}

func (e *MapLit) Span() token.Span { return e.Tok }
func (e *MapLit) exprMarker()      {}
func (e *MapLit) nodeMarker()      {}
func (e *MapLit) String() string {
	pairs := make([]string, len(e.Keys))
	for i := range e.Keys {
		pairs[i] = fmt.Sprintf("%s: %s", e.Keys[i], e.Values[i])
	}
	return "{" + strings.Join(pairs, ", ") + "}"
}

type MatchExpr struct {
	Subject Expr
	Arms    []*MatchArm
	Tok     token.Span
}

func (e *MatchExpr) Span() token.Span { return e.Tok }
func (e *MatchExpr) exprMarker()      {}
func (e *MatchExpr) nodeMarker()      {}
func (e *MatchExpr) String() string {
	arms := make([]string, len(e.Arms))
	for i, a := range e.Arms {
		arms[i] = a.String()
	}
	return fmt.Sprintf("match %s { %s }", e.Subject, strings.Join(arms, ", "))
}

type MatchArm struct {
	Pattern Expr
	Body    Expr
	Tok     token.Span
}

func (a *MatchArm) String() string {
	return fmt.Sprintf("%s => %s", a.Pattern, a.Body)
}

type PipeExpr struct {
	Left  Expr
	Right Expr
	Tok   token.Span
}

func (e *PipeExpr) Span() token.Span { return e.Tok }
func (e *PipeExpr) exprMarker()      {}
func (e *PipeExpr) nodeMarker()      {}
func (e *PipeExpr) String() string {
	return fmt.Sprintf("(%s |> %s)", e.Left, e.Right)
}

type RangeExpr struct {
	Start Expr
	End   Expr
	Tok   token.Span
}

func (e *RangeExpr) Span() token.Span { return e.Tok }
func (e *RangeExpr) exprMarker()      {}
func (e *RangeExpr) nodeMarker()      {}
func (e *RangeExpr) String() string {
	return fmt.Sprintf("%s..%s", e.Start, e.End)
}

// --- Const Statement ---

type ConstStmt struct {
	Name    *Ident
	TypeAnn *TypeExpr
	Value   Expr
	Tok     token.Span
}

func (s *ConstStmt) Span() token.Span { return s.Tok }
func (s *ConstStmt) stmtMarker()      {}
func (s *ConstStmt) nodeMarker()      {}
func (s *ConstStmt) String() string {
	ann := ""
	if s.TypeAnn != nil {
		ann = ": " + s.TypeAnn.String()
	}
	return fmt.Sprintf("const %s%s = %s", s.Name, ann, s.Value)
}

// --- Typeof Expression ---

type TypeofExpr struct {
	Operand Expr
	Tok     token.Span
}

func (e *TypeofExpr) Span() token.Span { return e.Tok }
func (e *TypeofExpr) exprMarker()      {}
func (e *TypeofExpr) nodeMarker()      {}
func (e *TypeofExpr) String() string   { return fmt.Sprintf("typeof %s", e.Operand) }

// --- Ternary Expression ---

type TernaryExpr struct {
	Cond Expr
	Then Expr
	Else Expr
	Tok  token.Span
}

func (e *TernaryExpr) Span() token.Span { return e.Tok }
func (e *TernaryExpr) exprMarker()      {}
func (e *TernaryExpr) nodeMarker()      {}
func (e *TernaryExpr) String() string {
	return fmt.Sprintf("(%s ? %s : %s)", e.Cond, e.Then, e.Else)
}

// --- Null Coalescing Expression ---

type NullCoalesceExpr struct {
	Left  Expr
	Right Expr
	Tok   token.Span
}

func (e *NullCoalesceExpr) Span() token.Span { return e.Tok }
func (e *NullCoalesceExpr) exprMarker()      {}
func (e *NullCoalesceExpr) nodeMarker()      {}
func (e *NullCoalesceExpr) String() string {
	return fmt.Sprintf("(%s ?? %s)", e.Left, e.Right)
}

// --- Spread Expression ---

type SpreadExpr struct {
	Operand Expr
	Tok     token.Span
}

func (e *SpreadExpr) Span() token.Span { return e.Tok }
func (e *SpreadExpr) exprMarker()      {}
func (e *SpreadExpr) nodeMarker()      {}
func (e *SpreadExpr) String() string   { return fmt.Sprintf("...%s", e.Operand) }

// --- Type Expressions ---

type TypeExpr struct {
	Name   string
	Params []*TypeExpr
	Tok    token.Span
}

func (t *TypeExpr) Span() token.Span { return t.Tok }
func (t *TypeExpr) nodeMarker()      {}
func (t *TypeExpr) String() string {
	if len(t.Params) == 0 {
		return t.Name
	}
	params := make([]string, len(t.Params))
	for i, p := range t.Params {
		params[i] = p.String()
	}
	return fmt.Sprintf("%s[%s]", t.Name, strings.Join(params, ", "))
}

// --- Walker ---

type Visitor func(Node) bool

func Walk(node Node, visit Visitor) {
	if !visit(node) {
		return
	}
	switch n := node.(type) {
	case *Program:
		for _, s := range n.Stmts {
			Walk(s, visit)
		}
	case *LetStmt:
		Walk(n.Name, visit)
		if n.Value != nil {
			Walk(n.Value, visit)
		}
	case *ReturnStmt:
		if n.Value != nil {
			Walk(n.Value, visit)
		}
	case *ExprStmt:
		Walk(n.Expr, visit)
	case *WhileStmt:
		Walk(n.Cond, visit)
		Walk(n.Body, visit)
	case *ForStmt:
		Walk(n.Var, visit)
		Walk(n.Iter, visit)
		Walk(n.Body, visit)
	case *AssignStmt:
		Walk(n.Target, visit)
		Walk(n.Value, visit)
	case *BinaryExpr:
		Walk(n.Left, visit)
		Walk(n.Right, visit)
	case *UnaryExpr:
		Walk(n.Operand, visit)
	case *CallExpr:
		Walk(n.Func, visit)
		for _, a := range n.Args {
			Walk(a, visit)
		}
	case *IndexExpr:
		Walk(n.Object, visit)
		Walk(n.Index, visit)
	case *DotExpr:
		Walk(n.Object, visit)
		Walk(n.Field, visit)
	case *IfExpr:
		Walk(n.Cond, visit)
		Walk(n.Then, visit)
		if n.Else != nil {
			Walk(n.Else, visit)
		}
	case *Block:
		for _, s := range n.Stmts {
			Walk(s, visit)
		}
	case *FnExpr:
		if n.Name != nil {
			Walk(n.Name, visit)
		}
		Walk(n.Body, visit)
	case *ArrayLit:
		for _, el := range n.Elems {
			Walk(el, visit)
		}
	case *MapLit:
		for i := range n.Keys {
			Walk(n.Keys[i], visit)
			Walk(n.Values[i], visit)
		}
	case *MatchExpr:
		Walk(n.Subject, visit)
		for _, a := range n.Arms {
			Walk(a.Pattern, visit)
			Walk(a.Body, visit)
		}
	case *PipeExpr:
		Walk(n.Left, visit)
		Walk(n.Right, visit)
	case *RangeExpr:
		Walk(n.Start, visit)
		Walk(n.End, visit)
	case *ConstStmt:
		Walk(n.Name, visit)
		if n.Value != nil {
			Walk(n.Value, visit)
		}
	case *TypeofExpr:
		Walk(n.Operand, visit)
	case *TernaryExpr:
		Walk(n.Cond, visit)
		Walk(n.Then, visit)
		Walk(n.Else, visit)
	case *NullCoalesceExpr:
		Walk(n.Left, visit)
		Walk(n.Right, visit)
	case *SpreadExpr:
		Walk(n.Operand, visit)
	}
}

func CountNodes(node Node) int {
	count := 0
	Walk(node, func(n Node) bool {
		count++
		return true
	})
	return count
}

func FindIdents(node Node) []*Ident {
	var idents []*Ident
	Walk(node, func(n Node) bool {
		if id, ok := n.(*Ident); ok {
			idents = append(idents, id)
		}
		return true
	})
	return idents
}