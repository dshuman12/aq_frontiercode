package stdlib

import (
	"fmt"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/Mustafa4ngin/Drift/pkg/ast"
	"github.com/Mustafa4ngin/Drift/pkg/environ"
	"github.com/Mustafa4ngin/Drift/pkg/object"
)

type EvalFunc func(node ast.Node, env *environ.Env) object.Object

var evalCallback EvalFunc

func RegisterEval(fn EvalFunc) {
	evalCallback = fn
}

func Register(env *environ.Env) {
	env.Set("print", &object.Builtin{Name: "print", Fn: builtinPrint}, false)
	env.Set("println", &object.Builtin{Name: "println", Fn: builtinPrintln}, false)
	env.Set("len", &object.Builtin{Name: "len", Fn: builtinLen}, false)
	env.Set("str", &object.Builtin{Name: "str", Fn: builtinStr}, false)
	env.Set("int", &object.Builtin{Name: "int", Fn: builtinInt}, false)
	env.Set("float", &object.Builtin{Name: "float", Fn: builtinFloat}, false)
	env.Set("type", &object.Builtin{Name: "type", Fn: builtinType}, false)
	env.Set("push", &object.Builtin{Name: "push", Fn: builtinPush}, false)
	env.Set("pop", &object.Builtin{Name: "pop", Fn: builtinPop}, false)
	env.Set("keys", &object.Builtin{Name: "keys", Fn: builtinKeys}, false)
	env.Set("values", &object.Builtin{Name: "values", Fn: builtinValues}, false)
	env.Set("contains", &object.Builtin{Name: "contains", Fn: builtinContains}, false)
	env.Set("sum", &object.Builtin{Name: "sum", Fn: builtinSum}, false)
	env.Set("map", &object.Builtin{Name: "map", Fn: builtinMap}, false)
	env.Set("filter", &object.Builtin{Name: "filter", Fn: builtinFilter}, false)
	env.Set("reduce", &object.Builtin{Name: "reduce", Fn: builtinReduce}, false)
	env.Set("sort", &object.Builtin{Name: "sort", Fn: builtinSort}, false)
	env.Set("reverse", &object.Builtin{Name: "reverse", Fn: builtinReverse}, false)
	env.Set("join", &object.Builtin{Name: "join", Fn: builtinJoin}, false)
	env.Set("split", &object.Builtin{Name: "split", Fn: builtinSplit}, false)
	env.Set("trim", &object.Builtin{Name: "trim", Fn: builtinTrim}, false)
	env.Set("upper", &object.Builtin{Name: "upper", Fn: builtinUpper}, false)
	env.Set("lower", &object.Builtin{Name: "lower", Fn: builtinLower}, false)
	env.Set("replace", &object.Builtin{Name: "replace", Fn: builtinReplace}, false)
	env.Set("starts_with", &object.Builtin{Name: "starts_with", Fn: builtinStartsWith}, false)
	env.Set("ends_with", &object.Builtin{Name: "ends_with", Fn: builtinEndsWith}, false)
	env.Set("chars", &object.Builtin{Name: "chars", Fn: builtinChars}, false)
	env.Set("substring", &object.Builtin{Name: "substring", Fn: builtinSubstring}, false)
	env.Set("index_of", &object.Builtin{Name: "index_of", Fn: builtinIndexOf}, false)
	env.Set("last_index_of", &object.Builtin{Name: "last_index_of", Fn: builtinLastIndexOf}, false)
	env.Set("repeat", &object.Builtin{Name: "repeat", Fn: builtinRepeat}, false)
	env.Set("count_of", &object.Builtin{Name: "count_of", Fn: builtinCountOf}, false)
	env.Set("char_at", &object.Builtin{Name: "char_at", Fn: builtinCharAt}, false)
	env.Set("pad_left", &object.Builtin{Name: "pad_left", Fn: builtinPadLeft}, false)
	env.Set("pad_right", &object.Builtin{Name: "pad_right", Fn: builtinPadRight}, false)
	env.Set("is_empty", &object.Builtin{Name: "is_empty", Fn: builtinIsEmpty}, false)
	env.Set("lines", &object.Builtin{Name: "lines", Fn: builtinLines}, false)
	registerArrays(env)
	registerMath(env)
	registerMaps(env)
	registerTypes(env)
	registerFunctional(env)
	env.Set("assert", &object.Builtin{Name: "assert", Fn: builtinAssert}, false)
	env.Set("assert_eq", &object.Builtin{Name: "assert_eq", Fn: builtinAssertEq}, false)
	env.Set("try", &object.Builtin{Name: "try", Fn: builtinTry}, false)
	env.Set("error", &object.Builtin{Name: "error", Fn: builtinError}, false)
	env.Set("is_error", &object.Builtin{Name: "is_error", Fn: builtinIsError}, false)
	env.Set("format", &object.Builtin{Name: "format", Fn: builtinFormat}, false)
}

var PrintOutput strings.Builder

func ResetPrintOutput() {
	PrintOutput.Reset()
}

func builtinPrint(args ...object.Object) object.Object {
	parts := make([]string, len(args))
	for i, a := range args {
		parts[i] = a.Inspect()
	}
	s := strings.Join(parts, " ")
	fmt.Print(s)
	PrintOutput.WriteString(s)
	return object.NIL
}

func builtinPrintln(args ...object.Object) object.Object {
	parts := make([]string, len(args))
	for i, a := range args {
		parts[i] = a.Inspect()
	}
	s := strings.Join(parts, " ") + "\n"
	fmt.Print(s)
	PrintOutput.WriteString(s)
	return object.NIL
}

func builtinLen(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("len: expected 1 argument, got %d", len(args))
	}
	switch o := args[0].(type) {
	case *object.String:
		return &object.Int{Value: int64(utf8.RuneCountInString(o.Value))}
	case *object.Array:
		return &object.Int{Value: int64(len(o.Elements))}
	case *object.Map:
		return &object.Int{Value: int64(o.Len())}
	default:
		return errObj("len: unsupported type %s", args[0].Type())
	}
}

func builtinStr(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("str: expected 1 argument, got %d", len(args))
	}
	return &object.String{Value: args[0].Inspect()}
}

func builtinInt(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("int: expected 1 argument, got %d", len(args))
	}
	switch o := args[0].(type) {
	case *object.Int:
		return o
	case *object.Float:
		return &object.Int{Value: int64(o.Value)}
	case *object.Bool:
		if o.Value {
			return &object.Int{Value: 1}
		}
		return &object.Int{Value: 0}
	default:
		return errObj("int: cannot convert %s to int", args[0].Type())
	}
}

func builtinFloat(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("float: expected 1 argument, got %d", len(args))
	}
	switch o := args[0].(type) {
	case *object.Float:
		return o
	case *object.Int:
		return &object.Float{Value: float64(o.Value)}
	default:
		return errObj("float: cannot convert %s to float", args[0].Type())
	}
}

func builtinType(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("type: expected 1 argument, got %d", len(args))
	}
	return &object.String{Value: args[0].Type()}
}

func builtinPush(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("push: expected 2 arguments, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("push: first argument must be array")
	}
	arr.Push(args[1])
	return object.NIL
}

func builtinPop(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("pop: expected 1 argument, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("pop: argument must be array")
	}
	return arr.Pop()
}

func builtinKeys(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("keys: expected 1 argument, got %d", len(args))
	}
	m, ok := args[0].(*object.Map)
	if !ok {
		return errObj("keys: argument must be map")
	}
	return &object.Array{Elements: m.Keys()}
}

func builtinValues(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("values: expected 1 argument, got %d", len(args))
	}
	m, ok := args[0].(*object.Map)
	if !ok {
		return errObj("values: argument must be map")
	}
	return &object.Array{Elements: m.Values()}
}

func builtinContains(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("contains: expected 2 arguments, got %d", len(args))
	}
	switch container := args[0].(type) {
	case *object.Array:
		for _, el := range container.Elements {
			if el.Equals(args[1]) {
				return object.TRUE
			}
		}
		return object.FALSE
	case *object.String:
		sub, ok := args[1].(*object.String)
		if !ok {
			return errObj("contains: second argument must be string for string search")
		}
		return object.NativeBool(strings.Contains(container.Value, sub.Value))
	case *object.Map:
		_, ok := container.GetPair(args[1])
		return object.NativeBool(ok)
	default:
		return errObj("contains: unsupported type %s", args[0].Type())
	}
}

func builtinSum(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("sum: expected 1 argument, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("sum: argument must be array")
	}
	var isum int64
	var fsum float64
	isFloat := false
	for _, el := range arr.Elements {
		switch v := el.(type) {
		case *object.Int:
			isum += v.Value
			fsum += float64(v.Value)
		case *object.Float:
			isFloat = true
			fsum += v.Value
		default:
			return errObj("sum: array must contain numbers")
		}
	}
	if isFloat {
		return &object.Float{Value: fsum}
	}
	return &object.Int{Value: isum}
}

func builtinMap(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("map: expected 2 arguments (array, fn), got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("map: first argument must be array")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		if b, ok := args[1].(*object.Builtin); ok {
			result := make([]object.Object, len(arr.Elements))
			for i, el := range arr.Elements {
				result[i] = b.Fn(el)
			}
			return &object.Array{Elements: result}
		}
		return errObj("map: second argument must be function")
	}
	return mapWithFn(arr, fn)
}

func mapWithFn(arr *object.Array, fn *object.Fn) object.Object {
	result := make([]object.Object, len(arr.Elements))
	for i, el := range arr.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) > 0 {
			scope.Set(fn.Params[0].Name.Name, el, false)
		}
		val := evalBlock(fn, scope)
		result[i] = val
	}
	return &object.Array{Elements: result}
}

func builtinFilter(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("filter: expected 2 arguments (array, fn), got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("filter: first argument must be array")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		return errObj("filter: second argument must be function")
	}
	var result []object.Object
	for _, el := range arr.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) > 0 {
			scope.Set(fn.Params[0].Name.Name, el, false)
		}
		val := evalBlock(fn, scope)
		if object.IsTruthy(val) {
			result = append(result, el)
		}
	}
	return &object.Array{Elements: result}
}

func builtinReduce(args ...object.Object) object.Object {
	if len(args) != 3 {
		return errObj("reduce: expected 3 arguments (array, init, fn), got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("reduce: first argument must be array")
	}
	fn, ok := args[2].(*object.Fn)
	if !ok {
		return errObj("reduce: third argument must be function")
	}
	acc := args[1]
	for _, el := range arr.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) >= 2 {
			scope.Set(fn.Params[0].Name.Name, el, false)
			scope.Set(fn.Params[1].Name.Name, acc, false)
		}
		acc = evalBlock(fn, scope)
	}
	return acc
}

func builtinSort(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("sort: expected 1 argument, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("sort: argument must be array")
	}
	result := arr.Copy()
	sort.Slice(result.Elements, func(i, j int) bool {
		return compareObjects(result.Elements[i], result.Elements[j]) < 0
	})
	return result
}

func builtinReverse(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("reverse: expected 1 argument, got %d", len(args))
	}
	switch o := args[0].(type) {
	case *object.Array:
		result := make([]object.Object, len(o.Elements))
		for i, el := range o.Elements {
			result[len(o.Elements)-1-i] = el
		}
		return &object.Array{Elements: result}
	case *object.String:
		runes := []rune(o.Value)
		for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
			runes[i], runes[j] = runes[j], runes[i]
		}
		return &object.String{Value: string(runes)}
	default:
		return errObj("reverse: unsupported type %s", args[0].Type())
	}
}

func compareObjects(a, b object.Object) int {
	if ai, ok := a.(*object.Int); ok {
		if bi, ok := b.(*object.Int); ok {
			if ai.Value < bi.Value {
				return -1
			}
			if ai.Value > bi.Value {
				return 1
			}
			return 0
		}
	}
	if af, ok := a.(*object.Float); ok {
		if bf, ok := b.(*object.Float); ok {
			if af.Value < bf.Value {
				return -1
			}
			if af.Value > bf.Value {
				return 1
			}
			return 0
		}
	}
	if as, ok := a.(*object.String); ok {
		if bs, ok := b.(*object.String); ok {
			if as.Value < bs.Value {
				return -1
			}
			if as.Value > bs.Value {
				return 1
			}
			return 0
		}
	}
	return 0
}

func evalBlock(fn *object.Fn, scope *environ.Env) object.Object {
	if evalCallback == nil {
		return object.NIL
	}
	result := evalCallback(fn.Body, scope)
	if rv, ok := result.(*object.ReturnValue); ok {
		return rv.Value
	}
	return result
}

type errObject struct {
	Message string
}

func (e *errObject) Type() string               { return "error" }
func (e *errObject) Inspect() string             { return "ERROR: " + e.Message }
func (e *errObject) HashKey() uint64             { return 0 }
func (e *errObject) Equals(other object.Object) bool { return false }

func errObj(format string, args ...interface{}) *errObject {
	return &errObject{Message: fmt.Sprintf(format, args...)}
}

// format(template, args...) — positional placeholder replacement
func builtinFormat(args ...object.Object) object.Object {
	if len(args) < 1 {
		return errObj("format: expected at least 1 argument")
	}
	tmpl, ok := args[0].(*object.String)
	if !ok {
		return errObj("format: first argument must be string template")
	}
	result := tmpl.Value
	for i := 1; i < len(args); i++ {
		placeholder := fmt.Sprintf("{%d}", i-1)
		result = strings.ReplaceAll(result, placeholder, args[i].Inspect())
	}
	return &object.String{Value: result}
}

// try(fn) — calls fn(), returns result or error object (never crashes)
func builtinTry(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("try: expected 1 argument (fn), got %d", len(args))
	}
	fn, ok := args[0].(*object.Fn)
	if !ok {
		if b, ok := args[0].(*object.Builtin); ok {
			result := b.Fn()
			return result // errors are already objects
		}
		return errObj("try: argument must be function")
	}
	scope := environ.NewEnclosed(fn.Env)
	result := evalBlock(fn, scope)
	// Return error objects as-is instead of crashing
	return result
}

// error(msg) — creates an error object
func builtinError(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("error: expected 1 argument, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj(args[0].Inspect())
	}
	return errObj(s.Value)
}

// is_error(val) — checks if value is an error
func builtinIsError(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("is_error: expected 1 argument, got %d", len(args))
	}
	return object.NativeBool(object.IsError(args[0]))
}

func builtinAssert(args ...object.Object) object.Object {
	if len(args) < 1 || len(args) > 2 {
		return errObj("assert: expected 1-2 arguments, got %d", len(args))
	}
	if !object.IsTruthy(args[0]) {
		msg := "assertion failed"
		if len(args) == 2 {
			if s, ok := args[1].(*object.String); ok {
				msg = "assertion failed: " + s.Value
			}
		}
		return errObj(msg)
	}
	return object.NIL
}

func builtinAssertEq(args ...object.Object) object.Object {
	if len(args) < 2 || len(args) > 3 {
		return errObj("assert_eq: expected 2-3 arguments, got %d", len(args))
	}
	if !args[0].Equals(args[1]) {
		msg := fmt.Sprintf("assertion failed: expected %s, got %s", args[0].Inspect(), args[1].Inspect())
		if len(args) == 3 {
			if s, ok := args[2].(*object.String); ok {
				msg = fmt.Sprintf("assertion failed (%s): expected %s, got %s", s.Value, args[0].Inspect(), args[1].Inspect())
			}
		}
		return errObj(msg)
	}
	return object.NIL
}