package evaluator

import (
	"math"
	"strings"

	"github.com/Mustafa4ngin/Drift/pkg/object"
	"github.com/Mustafa4ngin/Drift/pkg/token"
)

func evalBinaryOp(op token.Type, left, right object.Object) object.Object {
	if op == token.Eq {
		return object.NativeBool(left.Equals(right))
	}
	if op == token.NotEq {
		return object.NativeBool(!left.Equals(right))
	}

	switch l := left.(type) {
	case *object.Int:
		if r, ok := right.(*object.Int); ok {
			return evalIntOp(op, l.Value, r.Value)
		}
		if r, ok := right.(*object.Float); ok {
			return evalFloatOp(op, float64(l.Value), r.Value)
		}
		if r, ok := right.(*object.String); ok && op == token.Star {
			return &object.String{Value: stringRepeat(r.Value, int(l.Value))}
		}
	case *object.Float:
		if r, ok := right.(*object.Float); ok {
			return evalFloatOp(op, l.Value, r.Value)
		}
		if r, ok := right.(*object.Int); ok {
			return evalFloatOp(op, l.Value, float64(r.Value))
		}
	case *object.String:
		if r, ok := right.(*object.String); ok {
			return evalStringOp(op, l.Value, r.Value)
		}
		if r, ok := right.(*object.Int); ok && op == token.Star {
			return &object.String{Value: stringRepeat(l.Value, int(r.Value))}
		}
	case *object.Array:
		if r, ok := right.(*object.Array); ok && op == token.Plus {
			return concatArrays(l, r)
		}
	}
	return runtimeErr("unsupported operation: %s %s %s", left.Type(), op, right.Type())
}

func evalIntOp(op token.Type, l, r int64) object.Object {
	switch op {
	case token.Plus:
		return &object.Int{Value: l + r}
	case token.Minus:
		return &object.Int{Value: l - r}
	case token.Star:
		return &object.Int{Value: l * r}
	case token.Slash:
		if r == 0 {
			return runtimeErr("division by zero")
		}
		return &object.Int{Value: l / r}
	case token.Percent:
		if r == 0 {
			return runtimeErr("modulo by zero")
		}
		return &object.Int{Value: l % r}
	case token.Lt:
		return object.NativeBool(l < r)
	case token.Gt:
		return object.NativeBool(l > r)
	case token.LtEq:
		return object.NativeBool(l <= r)
	case token.GtEq:
		return object.NativeBool(l >= r)
	default:
		return runtimeErr("unknown int operator %s", op)
	}
}

func evalFloatOp(op token.Type, l, r float64) object.Object {
	switch op {
	case token.Plus:
		return &object.Float{Value: l + r}
	case token.Minus:
		return &object.Float{Value: l - r}
	case token.Star:
		return &object.Float{Value: l * r}
	case token.Slash:
		if r == 0 {
			return runtimeErr("division by zero")
		}
		return &object.Float{Value: l / r}
	case token.Percent:
		return &object.Float{Value: math.Mod(l, r)}
	case token.Lt:
		return object.NativeBool(l < r)
	case token.Gt:
		return object.NativeBool(l > r)
	case token.LtEq:
		return object.NativeBool(l <= r)
	case token.GtEq:
		return object.NativeBool(l >= r)
	default:
		return runtimeErr("unknown float operator %s", op)
	}
}

func evalStringOp(op token.Type, l, r string) object.Object {
	switch op {
	case token.Plus:
		return &object.String{Value: l + r}
	case token.Lt:
		return object.NativeBool(l < r)
	case token.Gt:
		return object.NativeBool(l > r)
	case token.LtEq:
		return object.NativeBool(l <= r)
	case token.GtEq:
		return object.NativeBool(l >= r)
	default:
		return runtimeErr("unsupported string operator %s", op)
	}
}

func concatArrays(a, b *object.Array) *object.Array {
	elems := make([]object.Object, 0, len(a.Elements)+len(b.Elements))
	elems = append(elems, a.Elements...)
	elems = append(elems, b.Elements...)
	return &object.Array{Elements: elems}
}

func stringRepeat(s string, n int) string {
	if n <= 0 {
		return ""
	}
	return strings.Repeat(s, n)
}
