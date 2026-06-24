package stdlib

import (
	"github.com/Mustafa4ngin/Drift/pkg/environ"
	"github.com/Mustafa4ngin/Drift/pkg/object"
)

func registerFunctional(env *environ.Env) {
	env.Set("compose", &object.Builtin{Name: "compose", Fn: builtinCompose}, false)
	env.Set("identity", &object.Builtin{Name: "identity", Fn: builtinIdentity}, false)
	env.Set("always", &object.Builtin{Name: "always", Fn: builtinAlways}, false)
	env.Set("apply", &object.Builtin{Name: "apply", Fn: builtinApply}, false)
	env.Set("tap", &object.Builtin{Name: "tap", Fn: builtinTap}, false)
}

// compose(f, g) returns a new function that applies g then f: compose(f, g)(x) = f(g(x))
func builtinCompose(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("compose: expected 2 arguments (f, g), got %d", len(args))
	}
	return &object.Builtin{
		Name: "composed",
		Fn: func(inner ...object.Object) object.Object {
			// Apply g first
			gResult := applyOne(args[1], inner)
			if object.IsError(gResult) {
				return gResult
			}
			// Then apply f
			return applyOne(args[0], []object.Object{gResult})
		},
	}
}

// identity(x) returns x unchanged
func builtinIdentity(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("identity: expected 1 argument, got %d", len(args))
	}
	return args[0]
}

// always(x) returns a function that always returns x
func builtinAlways(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("always: expected 1 argument, got %d", len(args))
	}
	val := args[0]
	return &object.Builtin{
		Name: "always",
		Fn: func(inner ...object.Object) object.Object {
			return val
		},
	}
}

// apply(fn, args_array) calls fn with args from array
func builtinApply(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("apply: expected 2 arguments (fn, args_array), got %d", len(args))
	}
	arr, ok := args[1].(*object.Array)
	if !ok {
		return errObj("apply: second argument must be array")
	}
	return applyOne(args[0], arr.Elements)
}

// tap(value, fn) calls fn(value) for side effects, returns value
func builtinTap(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("tap: expected 2 arguments (value, fn), got %d", len(args))
	}
	applyOne(args[1], []object.Object{args[0]})
	return args[0]
}

// applyOne applies a function (Fn or Builtin) to arguments
func applyOne(fnObj object.Object, fnArgs []object.Object) object.Object {
	switch f := fnObj.(type) {
	case *object.Fn:
		scope := environ.NewEnclosed(f.Env)
		for i, p := range f.Params {
			if i < len(fnArgs) {
				scope.Set(p.Name.Name, fnArgs[i], false)
			}
		}
		return evalBlock(f, scope)
	case *object.Builtin:
		return f.Fn(fnArgs...)
	default:
		return errObj("not a function: %s", fnObj.Type())
	}
}
