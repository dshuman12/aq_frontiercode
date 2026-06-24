package checker

import (
	"github.com/Mustafa4ngin/Drift/pkg/ast"
	"github.com/Mustafa4ngin/Drift/pkg/errors"
	"github.com/Mustafa4ngin/Drift/pkg/token"
	"github.com/Mustafa4ngin/Drift/pkg/typesys"
)

type scope struct {
	vars   map[string]*typesys.Type
	parent *scope
}

func newScope(parent *scope) *scope {
	return &scope{vars: make(map[string]*typesys.Type), parent: parent}
}

func (s *scope) lookup(name string) (*typesys.Type, bool) {
	t, ok := s.vars[name]
	if ok {
		return t, true
	}
	if s.parent != nil {
		return s.parent.lookup(name)
	}
	return nil, false
}

func (s *scope) define(name string, t *typesys.Type) {
	s.vars[name] = t
}

type Checker struct {
	errors *errors.ErrorList
	scope  *scope
}

func New() *Checker {
	s := newScope(nil)
	s.define("print", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.TVoid))
	s.define("println", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.TVoid))
	s.define("len", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.TInt))
	s.define("str", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.TString))
	s.define("int", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.TInt))
	s.define("float", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.TFloat))
	s.define("push", typesys.FnType([]*typesys.Type{typesys.TAny, typesys.TAny}, typesys.TVoid))
	s.define("pop", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.TAny))
	s.define("keys", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.ArrayOf(typesys.TAny)))
	s.define("values", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.ArrayOf(typesys.TAny)))
	s.define("contains", typesys.FnType([]*typesys.Type{typesys.TAny, typesys.TAny}, typesys.TBool))
	s.define("sum", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.TAny))
	s.define("map", typesys.FnType([]*typesys.Type{typesys.TAny, typesys.TAny}, typesys.TAny))
	s.define("filter", typesys.FnType([]*typesys.Type{typesys.TAny, typesys.TAny}, typesys.TAny))
	s.define("reduce", typesys.FnType([]*typesys.Type{typesys.TAny, typesys.TAny, typesys.TAny}, typesys.TAny))
	s.define("sort", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.TAny))
	s.define("reverse", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.TAny))
	s.define("abs", typesys.FnType([]*typesys.Type{typesys.TAny}, typesys.TAny))
	s.define("max", typesys.FnType([]*typesys.Type{typesys.TAny, typesys.TAny}, typesys.TAny))
	s.define("min", typesys.FnType([]*typesys.Type{typesys.TAny, typesys.TAny}, typesys.TAny))
	return &Checker{errors: errors.NewList(), scope: s}
}

func Check(prog *ast.Program) *errors.ErrorList {
	c := New()
	c.checkProgram(prog)
	return c.errors
}

func (c *Checker) addError(span token.Span, msg string) {
	c.errors.Add(errors.TypeError(msg, span))
}

func (c *Checker) pushScope() {
	c.scope = newScope(c.scope)
}

func (c *Checker) popScope() {
	c.scope = c.scope.parent
}

func (c *Checker) checkProgram(prog *ast.Program) {
	for _, stmt := range prog.Stmts {
		c.checkStmt(stmt)
	}
}

func (c *Checker) checkStmt(stmt ast.Stmt) {
	switch s := stmt.(type) {
	case *ast.LetStmt:
		c.checkLetStmt(s)
	case *ast.ReturnStmt:
		if s.Value != nil {
			c.checkExpr(s.Value)
		}
	case *ast.ExprStmt:
		c.checkExpr(s.Expr)
	case *ast.WhileStmt:
		c.checkExpr(s.Cond)
		c.checkBlock(s.Body)
	case *ast.ForStmt:
		iterType := c.checkExpr(s.Iter)
		c.pushScope()
		elemType := typesys.TAny
		if iterType.Kind == typesys.KindArray && iterType.Elem != nil {
			elemType = iterType.Elem
		} else if iterType.Kind == typesys.KindRange {
			elemType = typesys.TInt
		} else if iterType.Kind == typesys.KindString {
			elemType = typesys.TString
		}
		c.scope.define(s.Var.Name, elemType)
		c.checkBlockInScope(s.Body)
		c.popScope()
	case *ast.AssignStmt:
		c.checkExpr(s.Target)
		c.checkExpr(s.Value)
	case *ast.ConstStmt:
		c.checkConstStmt(s)
	case *ast.BreakStmt, *ast.ContinueStmt:
		// valid in loops; deeper analysis skipped
	}
}

func (c *Checker) checkBlock(block *ast.Block) {
	c.pushScope()
	c.checkBlockInScope(block)
	c.popScope()
}

func (c *Checker) checkBlockInScope(block *ast.Block) {
	for _, stmt := range block.Stmts {
		c.checkStmt(stmt)
	}
}

func (c *Checker) checkExpr(expr ast.Expr) *typesys.Type {
	switch e := expr.(type) {
	case *ast.IntLit:
		return typesys.TInt
	case *ast.FloatLit:
		return typesys.TFloat
	case *ast.StringLit:
		return typesys.TString
	case *ast.BoolLit:
		return typesys.TBool
	case *ast.NilLit:
		return typesys.TNil
	case *ast.Ident:
		return c.checkIdent(e)
	case *ast.UnaryExpr:
		return c.checkUnary(e)
	case *ast.BinaryExpr:
		return c.checkBinary(e)
	case *ast.CallExpr:
		return c.checkCall(e)
	case *ast.IndexExpr:
		return c.checkIndex(e)
	case *ast.DotExpr:
		return c.checkDot(e)
	case *ast.IfExpr:
		return c.checkIf(e)
	case *ast.Block:
		return c.checkBlockExpr(e)
	case *ast.FnExpr:
		return c.checkFn(e)
	case *ast.ArrayLit:
		return c.checkArray(e)
	case *ast.MapLit:
		return c.checkMap(e)
	case *ast.MatchExpr:
		return c.checkMatch(e)
	case *ast.PipeExpr:
		return c.checkPipe(e)
	case *ast.RangeExpr:
		return c.checkRange(e)
	case *ast.TypeofExpr:
		c.checkExpr(e.Operand)
		return typesys.TString
	case *ast.TernaryExpr:
		c.checkExpr(e.Cond)
		thenType := c.checkExpr(e.Then)
		c.checkExpr(e.Else)
		return thenType
	case *ast.NullCoalesceExpr:
		lt := c.checkExpr(e.Left)
		c.checkExpr(e.Right)
		return lt
	case *ast.SpreadExpr:
		c.checkExpr(e.Operand)
		return typesys.TAny
	default:
		return typesys.TAny
	}
}

func (c *Checker) checkIdent(id *ast.Ident) *typesys.Type {
	if id.Name == "_" {
		return typesys.TAny
	}
	t, ok := c.scope.lookup(id.Name)
	if !ok {
		c.addError(id.Tok, "undefined variable '"+id.Name+"'")
		return typesys.TAny
	}
	return t
}

func (c *Checker) checkUnary(u *ast.UnaryExpr) *typesys.Type {
	operandType := c.checkExpr(u.Operand)
	switch u.Op {
	case token.Minus:
		if !typesys.IsNumeric(operandType) {
			c.addError(u.Tok, "cannot negate non-numeric type "+operandType.String())
		}
		return operandType
	case token.Bang:
		return typesys.TBool
	}
	return typesys.TAny
}

func (c *Checker) checkBinary(b *ast.BinaryExpr) *typesys.Type {
	lt := c.checkExpr(b.Left)
	rt := c.checkExpr(b.Right)

	switch b.Op {
	case token.Plus:
		if lt.Kind == typesys.KindString && rt.Kind == typesys.KindString {
			return typesys.TString
		}
		if lt.Kind == typesys.KindArray && rt.Kind == typesys.KindArray {
			return lt
		}
		if typesys.IsNumeric(lt) && typesys.IsNumeric(rt) {
			return typesys.PromoteNumeric(lt, rt)
		}
		if lt.Kind != typesys.KindAny && rt.Kind != typesys.KindAny {
			c.addError(b.Tok, "cannot add "+lt.String()+" and "+rt.String())
		}
		return typesys.TAny
	case token.Minus, token.Star, token.Slash, token.Percent:
		if typesys.IsNumeric(lt) && typesys.IsNumeric(rt) {
			return typesys.PromoteNumeric(lt, rt)
		}
		if lt.Kind != typesys.KindAny && rt.Kind != typesys.KindAny {
			c.addError(b.Tok, "cannot apply "+b.Op.String()+" to "+lt.String()+" and "+rt.String())
		}
		return typesys.TAny
	case token.Eq, token.NotEq:
		return typesys.TBool
	case token.Lt, token.Gt, token.LtEq, token.GtEq:
		if !typesys.IsComparable(lt) || !typesys.IsComparable(rt) {
			if lt.Kind != typesys.KindAny && rt.Kind != typesys.KindAny {
				c.addError(b.Tok, "cannot compare "+lt.String()+" and "+rt.String())
			}
		}
		return typesys.TBool
	case token.And, token.Or:
		return typesys.TBool
	}
	return typesys.TAny
}

func (c *Checker) checkCall(call *ast.CallExpr) *typesys.Type {
	fnType := c.checkExpr(call.Func)
	for _, arg := range call.Args {
		c.checkExpr(arg)
	}
	if fnType.Kind == typesys.KindFn {
		if fnType.Ret != nil {
			return fnType.Ret
		}
		return typesys.TVoid
	}
	return typesys.TAny
}

func (c *Checker) checkIndex(idx *ast.IndexExpr) *typesys.Type {
	objType := c.checkExpr(idx.Object)
	idxType := c.checkExpr(idx.Index)

	switch objType.Kind {
	case typesys.KindArray:
		if idxType.Kind != typesys.KindInt && idxType.Kind != typesys.KindAny {
			c.addError(idx.Tok, "array index must be int, got "+idxType.String())
		}
		if objType.Elem != nil {
			return objType.Elem
		}
		return typesys.TAny
	case typesys.KindMap:
		if objType.Val != nil {
			return objType.Val
		}
		return typesys.TAny
	case typesys.KindString:
		if idxType.Kind != typesys.KindInt && idxType.Kind != typesys.KindAny {
			c.addError(idx.Tok, "string index must be int, got "+idxType.String())
		}
		return typesys.TString
	}
	return typesys.TAny
}

func (c *Checker) checkDot(dot *ast.DotExpr) *typesys.Type {
	c.checkExpr(dot.Object)
	if dot.Field.Name == "length" {
		return typesys.TInt
	}
	return typesys.TAny
}

func (c *Checker) checkIf(ifE *ast.IfExpr) *typesys.Type {
	c.checkExpr(ifE.Cond)
	thenType := c.checkBlockExpr(ifE.Then)
	if ifE.Else != nil {
		switch e := ifE.Else.(type) {
		case *ast.Block:
			c.checkBlockExpr(e)
		case *ast.IfExpr:
			c.checkExpr(e)
		}
	}
	return thenType
}

func (c *Checker) checkBlockExpr(block *ast.Block) *typesys.Type {
	c.pushScope()
	var lastType *typesys.Type = typesys.TVoid
	for _, stmt := range block.Stmts {
		if es, ok := stmt.(*ast.ExprStmt); ok {
			lastType = c.checkExpr(es.Expr)
		} else {
			c.checkStmt(stmt)
			lastType = typesys.TVoid
		}
	}
	c.popScope()
	return lastType
}

func (c *Checker) checkFn(fn *ast.FnExpr) *typesys.Type {
	paramTypes := make([]*typesys.Type, len(fn.Params))
	for i, p := range fn.Params {
		pt := typesys.TAny
		if p.TypeAnn != nil {
			pt = c.resolveTypeExpr(p.TypeAnn)
		}
		paramTypes[i] = pt
	}

	retType := typesys.TAny
	if fn.RetType != nil {
		retType = c.resolveTypeExpr(fn.RetType)
	}

	fnType := typesys.FnType(paramTypes, retType)
	if fn.Name != nil {
		c.scope.define(fn.Name.Name, fnType)
	}

	c.pushScope()
	for i, p := range fn.Params {
		c.scope.define(p.Name.Name, paramTypes[i])
	}
	if fn.Name != nil {
		c.scope.define(fn.Name.Name, fnType)
	}
	c.checkBlockInScope(fn.Body)
	c.popScope()

	return fnType
}

func (c *Checker) checkArray(arr *ast.ArrayLit) *typesys.Type {
	var elemType *typesys.Type
	for _, el := range arr.Elems {
		t := c.checkExpr(el)
		if elemType == nil {
			elemType = t
		}
	}
	if elemType == nil {
		elemType = typesys.TAny
	}
	return typesys.ArrayOf(elemType)
}

func (c *Checker) checkMap(m *ast.MapLit) *typesys.Type {
	var keyType, valType *typesys.Type
	for i := range m.Keys {
		kt := c.checkExpr(m.Keys[i])
		vt := c.checkExpr(m.Values[i])
		if keyType == nil {
			keyType = kt
			valType = vt
		}
	}
	if keyType == nil {
		keyType = typesys.TAny
		valType = typesys.TAny
	}
	return typesys.MapOf(keyType, valType)
}

func (c *Checker) checkMatch(m *ast.MatchExpr) *typesys.Type {
	c.checkExpr(m.Subject)
	var resultType *typesys.Type
	for _, arm := range m.Arms {
		c.checkExpr(arm.Pattern)
		t := c.checkExpr(arm.Body)
		if resultType == nil {
			resultType = t
		}
	}
	if resultType == nil {
		return typesys.TAny
	}
	return resultType
}

func (c *Checker) checkPipe(p *ast.PipeExpr) *typesys.Type {
	c.checkExpr(p.Left)
	fnType := c.checkExpr(p.Right)
	if fnType.Kind == typesys.KindFn && fnType.Ret != nil {
		return fnType.Ret
	}
	return typesys.TAny
}

func (c *Checker) checkRange(r *ast.RangeExpr) *typesys.Type {
	startType := c.checkExpr(r.Start)
	endType := c.checkExpr(r.End)
	if startType.Kind != typesys.KindInt && startType.Kind != typesys.KindAny {
		c.addError(r.Tok, "range start must be int")
	}
	if endType.Kind != typesys.KindInt && endType.Kind != typesys.KindAny {
		c.addError(r.Tok, "range end must be int")
	}
	return typesys.TRange
}

func (c *Checker) checkLetStmt(s *ast.LetStmt) {
	valType := c.checkExpr(s.Value)
	if s.TypeAnn != nil {
		annType := c.resolveTypeExpr(s.TypeAnn)
		if !annType.Equals(valType) && valType.Kind != typesys.KindAny {
			c.addError(s.Tok, "type mismatch: declared "+annType.String()+" but got "+valType.String())
		}
		c.scope.define(s.Name.Name, annType)
	} else {
		c.scope.define(s.Name.Name, valType)
	}
}

func (c *Checker) checkConstStmt(s *ast.ConstStmt) {
	valType := c.checkExpr(s.Value)
	if s.TypeAnn != nil {
		annType := c.resolveTypeExpr(s.TypeAnn)
		if !annType.Equals(valType) && valType.Kind != typesys.KindAny {
			c.addError(s.Tok, "type mismatch: declared "+annType.String()+" but got "+valType.String())
		}
		c.scope.define(s.Name.Name, annType)
	} else {
		c.scope.define(s.Name.Name, valType)
	}
}

func (c *Checker) resolveTypeExpr(te *ast.TypeExpr) *typesys.Type {
	if te == nil {
		return typesys.TAny
	}
	switch te.Name {
	case "Array":
		if len(te.Params) > 0 {
			return typesys.ArrayOf(c.resolveTypeExpr(te.Params[0]))
		}
		return typesys.ArrayOf(typesys.TAny)
	case "fn":
		return typesys.FnType(nil, typesys.TAny)
	default:
		return typesys.ResolveFromName(te.Name)
	}
}
