package stdlib

import (
	"github.com/Mustafa4ngin/Drift/pkg/environ"
	"github.com/Mustafa4ngin/Drift/pkg/object"
)

func registerMaps(env *environ.Env) {
	env.Set("merge", &object.Builtin{Name: "merge", Fn: builtinMerge}, false)
	env.Set("entries", &object.Builtin{Name: "entries", Fn: builtinEntries}, false)
	env.Set("from_entries", &object.Builtin{Name: "from_entries", Fn: builtinFromEntries}, false)
	env.Set("has_key", &object.Builtin{Name: "has_key", Fn: builtinHasKey}, false)
	env.Set("map_values", &object.Builtin{Name: "map_values", Fn: builtinMapValues}, false)
	env.Set("filter_entries", &object.Builtin{Name: "filter_entries", Fn: builtinFilterEntries}, false)
}

func builtinMerge(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("merge: expected 2 arguments, got %d", len(args))
	}
	a, ok := args[0].(*object.Map)
	if !ok {
		return errObj("merge: first argument must be map")
	}
	b, ok := args[1].(*object.Map)
	if !ok {
		return errObj("merge: second argument must be map")
	}
	result := object.NewMap()
	for _, k := range a.Order {
		p := a.Pairs[k]
		result.SetPair(p.Key, p.Value)
	}
	for _, k := range b.Order {
		p := b.Pairs[k]
		result.SetPair(p.Key, p.Value)
	}
	return result
}

func builtinEntries(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("entries: expected 1 argument, got %d", len(args))
	}
	m, ok := args[0].(*object.Map)
	if !ok {
		return errObj("entries: argument must be map")
	}
	result := make([]object.Object, 0, len(m.Order))
	for _, k := range m.Order {
		p := m.Pairs[k]
		entry := &object.Array{Elements: []object.Object{p.Key, p.Value}}
		result = append(result, entry)
	}
	return &object.Array{Elements: result}
}

func builtinFromEntries(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("from_entries: expected 1 argument, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("from_entries: argument must be array of [key, value] pairs")
	}
	result := object.NewMap()
	for _, el := range arr.Elements {
		pair, ok := el.(*object.Array)
		if !ok || len(pair.Elements) != 2 {
			return errObj("from_entries: each element must be [key, value] pair")
		}
		result.SetPair(pair.Elements[0], pair.Elements[1])
	}
	return result
}

func builtinHasKey(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("has_key: expected 2 arguments, got %d", len(args))
	}
	m, ok := args[0].(*object.Map)
	if !ok {
		return errObj("has_key: first argument must be map")
	}
	_, found := m.GetPair(args[1])
	return object.NativeBool(found)
}

func builtinMapValues(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("map_values: expected 2 arguments (map, fn), got %d", len(args))
	}
	m, ok := args[0].(*object.Map)
	if !ok {
		return errObj("map_values: first argument must be map")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		if b, ok := args[1].(*object.Builtin); ok {
			result := object.NewMap()
			for _, k := range m.Order {
				p := m.Pairs[k]
				result.SetPair(p.Key, b.Fn(p.Value))
			}
			return result
		}
		return errObj("map_values: second argument must be function")
	}
	result := object.NewMap()
	for _, k := range m.Order {
		p := m.Pairs[k]
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) > 0 {
			scope.Set(fn.Params[0].Name.Name, p.Value, false)
		}
		val := evalBlock(fn, scope)
		result.SetPair(p.Key, val)
	}
	return result
}

func builtinFilterEntries(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("filter_entries: expected 2 arguments (map, fn), got %d", len(args))
	}
	m, ok := args[0].(*object.Map)
	if !ok {
		return errObj("filter_entries: first argument must be map")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		return errObj("filter_entries: second argument must be function")
	}
	result := object.NewMap()
	for _, k := range m.Order {
		p := m.Pairs[k]
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) >= 2 {
			scope.Set(fn.Params[0].Name.Name, p.Key, false)
			scope.Set(fn.Params[1].Name.Name, p.Value, false)
		} else if len(fn.Params) == 1 {
			scope.Set(fn.Params[0].Name.Name, p.Value, false)
		}
		val := evalBlock(fn, scope)
		if object.IsTruthy(val) {
			result.SetPair(p.Key, p.Value)
		}
	}
	return result
}