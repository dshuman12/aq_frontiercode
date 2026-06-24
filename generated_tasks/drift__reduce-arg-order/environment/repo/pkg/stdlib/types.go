package stdlib

import (
	"github.com/Mustafa4ngin/Drift/pkg/environ"
	"github.com/Mustafa4ngin/Drift/pkg/object"
)

func registerTypes(env *environ.Env) {
	env.Set("is_int", &object.Builtin{Name: "is_int", Fn: builtinIsInt}, false)
	env.Set("is_float", &object.Builtin{Name: "is_float", Fn: builtinIsFloat}, false)
	env.Set("is_string", &object.Builtin{Name: "is_string", Fn: builtinIsString}, false)
	env.Set("is_bool", &object.Builtin{Name: "is_bool", Fn: builtinIsBool}, false)
	env.Set("is_array", &object.Builtin{Name: "is_array", Fn: builtinIsArray}, false)
	env.Set("is_map", &object.Builtin{Name: "is_map", Fn: builtinIsMap}, false)
	env.Set("is_fn", &object.Builtin{Name: "is_fn", Fn: builtinIsFn}, false)
	env.Set("is_nil", &object.Builtin{Name: "is_nil", Fn: builtinIsNil}, false)
	env.Set("is_number", &object.Builtin{Name: "is_number", Fn: builtinIsNumber}, false)
}

func typeCheck(name string, check func(object.Object) bool, args []object.Object) object.Object {
	if len(args) != 1 {
		return errObj("%s: expected 1 argument, got %d", name, len(args))
	}
	return object.NativeBool(check(args[0]))
}

func builtinIsInt(args ...object.Object) object.Object {
	return typeCheck("is_int", func(o object.Object) bool { _, ok := o.(*object.Int); return ok }, args)
}

func builtinIsFloat(args ...object.Object) object.Object {
	return typeCheck("is_float", func(o object.Object) bool { _, ok := o.(*object.Float); return ok }, args)
}

func builtinIsString(args ...object.Object) object.Object {
	return typeCheck("is_string", func(o object.Object) bool { _, ok := o.(*object.String); return ok }, args)
}

func builtinIsBool(args ...object.Object) object.Object {
	return typeCheck("is_bool", func(o object.Object) bool { _, ok := o.(*object.Bool); return ok }, args)
}

func builtinIsArray(args ...object.Object) object.Object {
	return typeCheck("is_array", func(o object.Object) bool { _, ok := o.(*object.Array); return ok }, args)
}

func builtinIsMap(args ...object.Object) object.Object {
	return typeCheck("is_map", func(o object.Object) bool { _, ok := o.(*object.Map); return ok }, args)
}

func builtinIsFn(args ...object.Object) object.Object {
	return typeCheck("is_fn", func(o object.Object) bool {
		if _, ok := o.(*object.Fn); ok {
			return true
		}
		_, ok := o.(*object.Builtin)
		return ok
	}, args)
}

func builtinIsNil(args ...object.Object) object.Object {
	return typeCheck("is_nil", func(o object.Object) bool { _, ok := o.(*object.Nil); return ok }, args)
}

func builtinIsNumber(args ...object.Object) object.Object {
	return typeCheck("is_number", func(o object.Object) bool {
		switch o.(type) {
		case *object.Int, *object.Float:
			return true
		}
		return false
	}, args)
}