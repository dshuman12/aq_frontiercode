package stdlib

import (
	"math"
	"math/rand"

	"github.com/Mustafa4ngin/Drift/pkg/environ"
	"github.com/Mustafa4ngin/Drift/pkg/object"
)

func registerMath(env *environ.Env) {
	env.Set("abs", &object.Builtin{Name: "abs", Fn: builtinAbs}, false)
	env.Set("max", &object.Builtin{Name: "max", Fn: builtinMax}, false)
	env.Set("min", &object.Builtin{Name: "min", Fn: builtinMin}, false)
	env.Set("pow", &object.Builtin{Name: "pow", Fn: builtinPow}, false)
	env.Set("sqrt", &object.Builtin{Name: "sqrt", Fn: builtinSqrt}, false)
	env.Set("floor", &object.Builtin{Name: "floor", Fn: builtinFloor}, false)
	env.Set("ceil", &object.Builtin{Name: "ceil", Fn: builtinCeil}, false)
	env.Set("round", &object.Builtin{Name: "round", Fn: builtinRound}, false)
	env.Set("clamp", &object.Builtin{Name: "clamp", Fn: builtinClamp}, false)
	// Math constants
	env.Set("PI", &object.Float{Value: math.Pi}, false)
	env.Set("E", &object.Float{Value: math.E}, false)
	env.Set("INF", &object.Float{Value: math.Inf(1)}, false)
	// Trigonometric functions
	env.Set("sin", &object.Builtin{Name: "sin", Fn: builtinSin}, false)
	env.Set("cos", &object.Builtin{Name: "cos", Fn: builtinCos}, false)
	env.Set("tan", &object.Builtin{Name: "tan", Fn: builtinTan}, false)
	env.Set("asin", &object.Builtin{Name: "asin", Fn: builtinAsin}, false)
	env.Set("acos", &object.Builtin{Name: "acos", Fn: builtinAcos}, false)
	env.Set("atan", &object.Builtin{Name: "atan", Fn: builtinAtan}, false)
	// Logarithmic / exponential
	env.Set("log", &object.Builtin{Name: "log", Fn: builtinLog}, false)
	env.Set("log2", &object.Builtin{Name: "log2", Fn: builtinLog2}, false)
	env.Set("log10", &object.Builtin{Name: "log10", Fn: builtinLog10}, false)
	env.Set("exp", &object.Builtin{Name: "exp", Fn: builtinExp}, false)
	env.Set("random", &object.Builtin{Name: "random", Fn: builtinRandom}, false)
}

func builtinAbs(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("abs: expected 1 argument, got %d", len(args))
	}
	switch v := args[0].(type) {
	case *object.Int:
		if v.Value < 0 {
			return &object.Int{Value: -v.Value}
		}
		return v
	case *object.Float:
		return &object.Float{Value: math.Abs(v.Value)}
	default:
		return errObj("abs: argument must be numeric")
	}
}

func builtinMax(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("max: expected 2 arguments, got %d", len(args))
	}
	a, aOk := object.ToFloat(args[0])
	b, bOk := object.ToFloat(args[1])
	if !aOk || !bOk {
		return errObj("max: arguments must be numeric")
	}
	if a >= b {
		return args[0]
	}
	return args[1]
}

func builtinMin(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("min: expected 2 arguments, got %d", len(args))
	}
	a, aOk := object.ToFloat(args[0])
	b, bOk := object.ToFloat(args[1])
	if !aOk || !bOk {
		return errObj("min: arguments must be numeric")
	}
	if a <= b {
		return args[0]
	}
	return args[1]
}

func builtinPow(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("pow: expected 2 arguments, got %d", len(args))
	}
	base, ok := object.ToFloat(args[0])
	if !ok {
		return errObj("pow: first argument must be numeric")
	}
	exp, ok := object.ToFloat(args[1])
	if !ok {
		return errObj("pow: second argument must be numeric")
	}
	result := math.Pow(base, exp)
	if result == math.Trunc(result) && !math.IsInf(result, 0) {
		return &object.Int{Value: int64(result)}
	}
	return &object.Float{Value: result}
}

func builtinSqrt(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("sqrt: expected 1 argument, got %d", len(args))
	}
	v, ok := object.ToFloat(args[0])
	if !ok {
		return errObj("sqrt: argument must be numeric")
	}
	if v < 0 {
		return errObj("sqrt: cannot take square root of negative number")
	}
	return &object.Float{Value: math.Sqrt(v)}
}

func builtinFloor(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("floor: expected 1 argument, got %d", len(args))
	}
	v, ok := object.ToFloat(args[0])
	if !ok {
		return errObj("floor: argument must be numeric")
	}
	return &object.Int{Value: int64(math.Floor(v))}
}

func builtinCeil(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("ceil: expected 1 argument, got %d", len(args))
	}
	v, ok := object.ToFloat(args[0])
	if !ok {
		return errObj("ceil: argument must be numeric")
	}
	return &object.Int{Value: int64(math.Ceil(v))}
}

func builtinRound(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("round: expected 1 argument, got %d", len(args))
	}
	v, ok := object.ToFloat(args[0])
	if !ok {
		return errObj("round: argument must be numeric")
	}
	return &object.Int{Value: int64(math.Round(v))}
}

func builtinClamp(args ...object.Object) object.Object {
	if len(args) != 3 {
		return errObj("clamp: expected 3 arguments (value, min, max), got %d", len(args))
	}
	v, vOk := object.ToFloat(args[0])
	lo, loOk := object.ToFloat(args[1])
	hi, hiOk := object.ToFloat(args[2])
	if !vOk || !loOk || !hiOk {
		return errObj("clamp: arguments must be numeric")
	}
	if v < lo {
		return args[1]
	}
	if v > hi {
		return args[2]
	}
	return args[0]
}

func mathOneArg(name string, f func(float64) float64, args []object.Object) object.Object {
	if len(args) != 1 {
		return errObj("%s: expected 1 argument, got %d", name, len(args))
	}
	v, ok := object.ToFloat(args[0])
	if !ok {
		return errObj("%s: argument must be numeric", name)
	}
	return &object.Float{Value: f(v)}
}

func builtinSin(args ...object.Object) object.Object   { return mathOneArg("sin", math.Sin, args) }
func builtinCos(args ...object.Object) object.Object   { return mathOneArg("cos", math.Cos, args) }
func builtinTan(args ...object.Object) object.Object   { return mathOneArg("tan", math.Tan, args) }
func builtinAsin(args ...object.Object) object.Object  { return mathOneArg("asin", math.Asin, args) }
func builtinAcos(args ...object.Object) object.Object  { return mathOneArg("acos", math.Acos, args) }
func builtinAtan(args ...object.Object) object.Object  { return mathOneArg("atan", math.Atan, args) }
func builtinLog(args ...object.Object) object.Object   { return mathOneArg("log", math.Log, args) }
func builtinLog2(args ...object.Object) object.Object  { return mathOneArg("log2", math.Log2, args) }
func builtinLog10(args ...object.Object) object.Object { return mathOneArg("log10", math.Log10, args) }
func builtinExp(args ...object.Object) object.Object   { return mathOneArg("exp", math.Exp, args) }

func builtinRandom(args ...object.Object) object.Object {
	if len(args) == 0 {
		return &object.Float{Value: rand.Float64()}
	}
	if len(args) == 2 {
		lo, ok1 := object.ToInt(args[0])
		hi, ok2 := object.ToInt(args[1])
		if !ok1 || !ok2 {
			return errObj("random: arguments must be integers")
		}
		if lo >= hi {
			return errObj("random: min must be less than max")
		}
		return &object.Int{Value: lo + rand.Int63n(hi-lo)}
	}
	return errObj("random: expected 0 or 2 arguments, got %d", len(args))
}