package evaluator

import (
	"fmt"
	"unicode/utf8"

	"github.com/Mustafa4ngin/Drift/pkg/ast"
	"github.com/Mustafa4ngin/Drift/pkg/environ"
	"github.com/Mustafa4ngin/Drift/pkg/object"
	"github.com/Mustafa4ngin/Drift/pkg/token"
)

func Eval(node ast.Node, env *environ.Env) object.Object {
	switch n := node.(type) {
	case *ast.Program:
		return evalProgram(n, env)
	case *ast.ExprStmt:
		return Eval(n.Expr, env)
	case *ast.LetStmt:
		return evalLetStmt(n, env)
	case *ast.ConstStmt:
		return evalConstStmt(n, env)
	case *ast.ReturnStmt:
		return evalReturnStmt(n, env)
	case *ast.WhileStmt:
		return evalWhileStmt(n, env)
	case *ast.ForStmt:
		return evalForStmt(n, env)
	case *ast.BreakStmt:
		return &object.BreakSignal{}
	case *ast.ContinueStmt:
		return &object.ContinueSignal{}
	case *ast.AssignStmt:
		return evalAssignStmt(n, env)
	case *ast.IntLit:
		return &object.Int{Value: n.Value}
	case *ast.FloatLit:
		return &object.Float{Value: n.Value}
	case *ast.StringLit:
		return &object.String{Value: n.Value}
	case *ast.BoolLit:
		return object.NativeBool(n.Value)
	case *ast.NilLit:
		return object.NIL
	case *ast.Ident:
		return evalIdent(n, env)
	case *ast.UnaryExpr:
		return evalUnaryExpr(n, env)
	case *ast.BinaryExpr:
		return evalBinaryExpr(n, env)
	case *ast.IfExpr:
		return evalIfExpr(n, env)
	case *ast.Block:
		return evalBlock(n, env)
	case *ast.FnExpr:
		return evalFnExpr(n, env)
	case *ast.CallExpr:
		return evalCallExpr(n, env)
	case *ast.ArrayLit:
		return evalArrayLit(n, env)
	case *ast.MapLit:
		return evalMapLit(n, env)
	case *ast.IndexExpr:
		return evalIndexExpr(n, env)
	case *ast.DotExpr:
		return evalDotExpr(n, env)
	case *ast.MatchExpr:
		return evalMatchExpr(n, env)
	case *ast.PipeExpr:
		return evalPipeExpr(n, env)
	case *ast.RangeExpr:
		return evalRangeExpr(n, env)
	case *ast.TypeofExpr:
		return evalTypeofExpr(n, env)
	case *ast.TernaryExpr:
		return evalTernaryExpr(n, env)
	case *ast.NullCoalesceExpr:
		return evalNullCoalesceExpr(n, env)
	default:
		return runtimeErr("unknown node type: %T", node)
	}
}

func evalProgram(prog *ast.Program, env *environ.Env) object.Object {
	var result object.Object = object.NIL
	for _, stmt := range prog.Stmts {
		result = Eval(stmt, env)
		switch r := result.(type) {
		case *object.ReturnValue:
			return r.Value
		case *runtimeError:
			return r
		}
	}
	return result
}

func evalBlock(block *ast.Block, env *environ.Env) object.Object {
	var result object.Object = object.NIL
	scope := environ.NewEnclosed(env)
	for _, stmt := range block.Stmts {
		result = Eval(stmt, scope)
		if isSignal(result) {
			return result
		}
	}
	return result
}

func evalLetStmt(s *ast.LetStmt, env *environ.Env) object.Object {
	val := Eval(s.Value, env)
	if isErr(val) {
		return val
	}
	env.Set(s.Name.Name, val, s.Mutable)
	return object.NIL
}

func evalConstStmt(s *ast.ConstStmt, env *environ.Env) object.Object {
	val := Eval(s.Value, env)
	if isErr(val) {
		return val
	}
	env.Set(s.Name.Name, val, false) // immutable by default
	return object.NIL
}

func evalReturnStmt(s *ast.ReturnStmt, env *environ.Env) object.Object {
	if s.Value == nil {
		return &object.ReturnValue{Value: object.NIL}
	}
	val := Eval(s.Value, env)
	if isErr(val) {
		return val
	}
	return &object.ReturnValue{Value: val}
}

func evalWhileStmt(s *ast.WhileStmt, env *environ.Env) object.Object {
	for {
		cond := Eval(s.Cond, env)
		if isErr(cond) {
			return cond
		}
		if !object.IsTruthy(cond) {
			break
		}
		result := Eval(s.Body, env)
		if _, ok := result.(*object.BreakSignal); ok {
			break
		}
		if _, ok := result.(*object.ContinueSignal); ok {
			continue
		}
		if isReturnOrErr(result) {
			return result
		}
	}
	return object.NIL
}

func evalForStmt(s *ast.ForStmt, env *environ.Env) object.Object {
	iter := Eval(s.Iter, env)
	if isErr(iter) {
		return iter
	}

	runBody := func(item object.Object) (object.Object, bool) {
		scope := environ.NewEnclosed(env)
		scope.Set(s.Var.Name, item, false)
		result := evalBlockInScope(s.Body, scope)
		if _, ok := result.(*object.BreakSignal); ok {
			return object.NIL, true
		}
		if _, ok := result.(*object.ContinueSignal); ok {
			return nil, false
		}
		if isReturnOrErr(result) {
			return result, true
		}
		return nil, false
	}

	switch it := iter.(type) {
	case *object.Array:
		for _, item := range it.Elements {
			if ret, stop := runBody(item); stop {
				return ret
			}
		}
	case *object.Range:
		for i := it.Start; i <= it.End; i++ {
			if ret, stop := runBody(&object.Int{Value: i}); stop {
				return ret
			}
		}
	case *object.String:
		for _, ch := range it.Value {
			if ret, stop := runBody(&object.String{Value: string(ch)}); stop {
				return ret
			}
		}
	default:
		return runtimeErr("cannot iterate over %s", iter.Type())
	}
	return object.NIL
}

func evalBlockInScope(block *ast.Block, scope *environ.Env) object.Object {
	var result object.Object = object.NIL
	for _, stmt := range block.Stmts {
		result = Eval(stmt, scope)
		if isSignal(result) {
			return result
		}
	}
	return result
}

func evalAssignStmt(s *ast.AssignStmt, env *environ.Env) object.Object {
	val := Eval(s.Value, env)
	if isErr(val) {
		return val
	}

	switch target := s.Target.(type) {
	case *ast.Ident:
		if s.Op != token.Assign {
			existing, ok := env.Get(target.Name)
			if !ok {
				return runtimeErr("undefined variable %q", target.Name)
			}
			val = applyCompoundOp(s.Op, existing.(object.Object), val)
			if isErr(val) {
				return val
			}
		}
		if err := env.Update(target.Name, val); err != nil {
			return runtimeErr("%s", err)
		}
	case *ast.IndexExpr:
		return evalIndexAssign(target, s.Op, val, env)
	default:
		return runtimeErr("invalid assignment target")
	}
	return object.NIL
}

func evalIndexAssign(idx *ast.IndexExpr, op token.Type, val object.Object, env *environ.Env) object.Object {
	obj := Eval(idx.Object, env)
	if isErr(obj) {
		return obj
	}
	index := Eval(idx.Index, env)
	if isErr(index) {
		return index
	}

	switch o := obj.(type) {
	case *object.Array:
		i, ok := object.ToInt(index)
		if !ok {
			return runtimeErr("array index must be integer")
		}
		if i < 0 || int(i) >= len(o.Elements) {
			return runtimeErr("index out of bounds: %d", i)
		}
		if op != token.Assign {
			val = applyCompoundOp(op, o.Elements[i], val)
			if isErr(val) {
				return val
			}
		}
		o.Elements[i] = val
	case *object.Map:
		if op != token.Assign {
			existing, _ := o.GetPair(index.(object.Object))
			if existing != nil {
				val = applyCompoundOp(op, existing, val)
				if isErr(val) {
					return val
				}
			}
		}
		o.SetPair(index.(object.Object), val)
	default:
		return runtimeErr("cannot index-assign to %s", obj.Type())
	}
	return object.NIL
}

func applyCompoundOp(op token.Type, left, right object.Object) object.Object {
	switch op {
	case token.PlusAssign:
		return evalBinaryOp(token.Plus, left, right)
	case token.MinusAssign:
		return evalBinaryOp(token.Minus, left, right)
	case token.StarAssign:
		return evalBinaryOp(token.Star, left, right)
	case token.SlashAssign:
		return evalBinaryOp(token.Slash, left, right)
	default:
		return runtimeErr("unknown compound operator %s", op)
	}
}

func evalIdent(id *ast.Ident, env *environ.Env) object.Object {
	val, ok := env.Get(id.Name)
	if ok {
		return val.(object.Object)
	}
	return runtimeErr("undefined variable %q", id.Name)
}

func evalUnaryExpr(u *ast.UnaryExpr, env *environ.Env) object.Object {
	operand := Eval(u.Operand, env)
	if isErr(operand) {
		return operand
	}
	switch u.Op {
	case token.Minus:
		switch o := operand.(type) {
		case *object.Int:
			return &object.Int{Value: -o.Value}
		case *object.Float:
			return &object.Float{Value: -o.Value}
		default:
			return runtimeErr("cannot negate %s", operand.Type())
		}
	case token.Bang:
		return object.NativeBool(!object.IsTruthy(operand))
	default:
		return runtimeErr("unknown unary operator %s", u.Op)
	}
}

func evalBinaryExpr(b *ast.BinaryExpr, env *environ.Env) object.Object {
	left := Eval(b.Left, env)
	if isErr(left) {
		return left
	}

	if b.Op == token.And {
		if !object.IsTruthy(left) {
			return left
		}
		return Eval(b.Right, env)
	}
	if b.Op == token.Or {
		if object.IsTruthy(left) {
			return left
		}
		return Eval(b.Right, env)
	}

	right := Eval(b.Right, env)
	if isErr(right) {
		return right
	}
	return evalBinaryOp(b.Op, left, right)
}

// Binary operations are in binops.go

func evalIfExpr(i *ast.IfExpr, env *environ.Env) object.Object {
	cond := Eval(i.Cond, env)
	if isErr(cond) {
		return cond
	}
	if object.IsTruthy(cond) {
		return Eval(i.Then, env)
	}
	if i.Else != nil {
		return Eval(i.Else, env)
	}
	return object.NIL
}

func evalFnExpr(f *ast.FnExpr, env *environ.Env) object.Object {
	fn := &object.Fn{
		Params: f.Params,
		Body:   f.Body,
		Env:    env,
	}
	if f.Name != nil {
		fn.Name = f.Name.Name
		env.Set(f.Name.Name, fn, false)
	}
	return fn
}

func evalCallExpr(c *ast.CallExpr, env *environ.Env) object.Object {
	fn := Eval(c.Func, env)
	if isErr(fn) {
		return fn
	}

	args := make([]object.Object, len(c.Args))
	for i, a := range c.Args {
		args[i] = Eval(a, env)
		if isErr(args[i]) {
			return args[i]
		}
	}

	return applyFunction(fn, args)
}

func applyFunction(fn object.Object, args []object.Object) object.Object {
	switch f := fn.(type) {
	case *object.Fn:
		if len(args) != len(f.Params) {
			return runtimeErr("expected %d arguments, got %d", len(f.Params), len(args))
		}
		name := f.Name
		if name == "" {
			name = "<anonymous>"
		}
		pushFrame(name, f.Body.Span().String())
		scope := environ.NewEnclosed(f.Env)
		for i, p := range f.Params {
			scope.Set(p.Name.Name, args[i], false)
		}
		result := Eval(f.Body, scope)
		popFrame()
		if rv, ok := result.(*object.ReturnValue); ok {
			return rv.Value
		}
		return result
	case *object.Builtin:
		return f.Fn(args...)
	default:
		return runtimeErr("not a function: %s", fn.Type())
	}
}

func evalArrayLit(a *ast.ArrayLit, env *environ.Env) object.Object {
	elems := make([]object.Object, len(a.Elems))
	for i, e := range a.Elems {
		elems[i] = Eval(e, env)
		if isErr(elems[i]) {
			return elems[i]
		}
	}
	return &object.Array{Elements: elems}
}

func evalMapLit(m *ast.MapLit, env *environ.Env) object.Object {
	result := object.NewMap()
	for i := range m.Keys {
		key := Eval(m.Keys[i], env)
		if isErr(key) {
			return key
		}
		val := Eval(m.Values[i], env)
		if isErr(val) {
			return val
		}
		result.SetPair(key, val)
	}
	return result
}

func evalIndexExpr(idx *ast.IndexExpr, env *environ.Env) object.Object {
	obj := Eval(idx.Object, env)
	if isErr(obj) {
		return obj
	}
	index := Eval(idx.Index, env)
	if isErr(index) {
		return index
	}

	switch o := obj.(type) {
	case *object.Array:
		i, ok := object.ToInt(index)
		if !ok {
			return runtimeErr("array index must be integer")
		}
		if i < 0 {
			i = int64(len(o.Elements)) + i
		}
		if i < 0 || int(i) >= len(o.Elements) {
			return object.NIL
		}
		return o.Elements[i]
	case *object.Map:
		val, ok := o.GetPair(index)
		if !ok {
			return object.NIL
		}
		return val
	case *object.String:
		i, ok := object.ToInt(index)
		if !ok {
			return runtimeErr("string index must be integer")
		}
		runeCount := utf8.RuneCountInString(o.Value)
		if i < 0 {
			i += int64(runeCount)
		}
		if i < 0 || int(i) >= runeCount {
			return object.NIL
		}
		pos := 0
		for j := int64(0); j < i; j++ {
			_, size := utf8.DecodeRuneInString(o.Value[pos:])
			pos += size
		}
		r, _ := utf8.DecodeRuneInString(o.Value[pos:])
		return &object.String{Value: string(r)}
	default:
		return runtimeErr("index operator not supported for %s", obj.Type())
	}
}

func evalDotExpr(d *ast.DotExpr, env *environ.Env) object.Object {
	obj := Eval(d.Object, env)
	if isErr(obj) {
		return obj
	}

	switch o := obj.(type) {
	case *object.Map:
		val, ok := o.GetByString(d.Field.Name)
		if !ok {
			return object.NIL
		}
		return val
	case *object.Array:
		switch d.Field.Name {
		case "length":
			return &object.Int{Value: int64(len(o.Elements))}
		default:
			return runtimeErr("array has no field %q", d.Field.Name)
		}
	case *object.String:
		switch d.Field.Name {
		case "length":
			return &object.Int{Value: int64(utf8.RuneCountInString(o.Value))}
		default:
			return runtimeErr("string has no field %q", d.Field.Name)
		}
	default:
		return runtimeErr("dot access not supported for %s", obj.Type())
	}
}

func evalMatchExpr(m *ast.MatchExpr, env *environ.Env) object.Object {
	subject := Eval(m.Subject, env)
	if isErr(subject) {
		return subject
	}

	for _, arm := range m.Arms {
		if id, ok := arm.Pattern.(*ast.Ident); ok && id.Name == "_" {
			return Eval(arm.Body, env)
		}
		pattern := Eval(arm.Pattern, env)
		if isErr(pattern) {
			return pattern
		}
		if subject.Equals(pattern) {
			return Eval(arm.Body, env)
		}
	}
	return object.NIL
}

func evalPipeExpr(p *ast.PipeExpr, env *environ.Env) object.Object {
	left := Eval(p.Left, env)
	if isErr(left) {
		return left
	}
	right := Eval(p.Right, env)
	if isErr(right) {
		return right
	}
	return applyFunction(right, []object.Object{left})
}

func evalRangeExpr(r *ast.RangeExpr, env *environ.Env) object.Object {
	start := Eval(r.Start, env)
	if isErr(start) {
		return start
	}
	end := Eval(r.End, env)
	if isErr(end) {
		return end
	}
	s, ok := object.ToInt(start)
	if !ok {
		return runtimeErr("range start must be integer")
	}
	e, ok := object.ToInt(end)
	if !ok {
		return runtimeErr("range end must be integer")
	}
	return &object.Range{Start: s, End: e}
}

func evalTernaryExpr(t *ast.TernaryExpr, env *environ.Env) object.Object {
	cond := Eval(t.Cond, env)
	if isErr(cond) {
		return cond
	}
	if object.IsTruthy(cond) {
		return Eval(t.Then, env)
	}
	return Eval(t.Else, env)
}

func evalNullCoalesceExpr(n *ast.NullCoalesceExpr, env *environ.Env) object.Object {
	left := Eval(n.Left, env)
	if isErr(left) {
		return left
	}
	if _, ok := left.(*object.Nil); ok {
		return Eval(n.Right, env)
	}
	return left
}

func evalTypeofExpr(t *ast.TypeofExpr, env *environ.Env) object.Object {
	val := Eval(t.Operand, env)
	if isErr(val) {
		return val
	}
	return &object.String{Value: val.Type()}
}

// --- Call Stack ---

type CallFrame struct {
	FnName string
	Span   string
}

var callStack []CallFrame

func pushFrame(name, span string) {
	callStack = append(callStack, CallFrame{FnName: name, Span: span})
}

func popFrame() {
	if len(callStack) > 0 {
		callStack = callStack[:len(callStack)-1]
	}
}

// GetStackTrace returns the current call stack as a formatted string
func GetStackTrace() string {
	if len(callStack) == 0 {
		return ""
	}
	var result string
	for i := len(callStack) - 1; i >= 0; i-- {
		f := callStack[i]
		result += fmt.Sprintf("  at %s (%s)\n", f.FnName, f.Span)
	}
	return result
}

// ResetCallStack clears the call stack
func ResetCallStack() {
	callStack = callStack[:0]
}

type runtimeError struct {
	Message    string
	StackTrace string
}

func (e *runtimeError) Type() string { return "error" }
func (e *runtimeError) Inspect() string {
	if e.StackTrace != "" {
		return "ERROR: " + e.Message + "\nStack trace:\n" + e.StackTrace
	}
	return "ERROR: " + e.Message
}
func (e *runtimeError) HashKey() uint64                 { return 0 }
func (e *runtimeError) Equals(other object.Object) bool { return false }

func runtimeErr(format string, args ...interface{}) *runtimeError {
	return &runtimeError{
		Message:    fmt.Sprintf(format, args...),
		StackTrace: GetStackTrace(),
	}
}

func isErr(obj object.Object) bool {
	if obj == nil {
		return false
	}
	_, ok := obj.(*runtimeError)
	return ok
}

func isSignal(obj object.Object) bool {
	if obj == nil {
		return false
	}
	switch obj.(type) {
	case *runtimeError, *object.ReturnValue, *object.BreakSignal, *object.ContinueSignal:
		return true
	}
	return false
}

func isReturnOrErr(obj object.Object) bool {
	if obj == nil {
		return false
	}
	switch obj.(type) {
	case *runtimeError, *object.ReturnValue:
		return true
	}
	return false
}
