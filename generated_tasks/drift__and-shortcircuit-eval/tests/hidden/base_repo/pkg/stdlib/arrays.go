package stdlib

import (
	"sort"

	"github.com/Mustafa4ngin/Drift/pkg/environ"
	"github.com/Mustafa4ngin/Drift/pkg/object"
)

func registerArrays(env *environ.Env) {
	env.Set("flat", &object.Builtin{Name: "flat", Fn: builtinFlat}, false)
	env.Set("enumerate", &object.Builtin{Name: "enumerate", Fn: builtinEnumerate}, false)
	env.Set("zip", &object.Builtin{Name: "zip", Fn: builtinZip}, false)
	env.Set("chunk", &object.Builtin{Name: "chunk", Fn: builtinChunk}, false)
	env.Set("unique", &object.Builtin{Name: "unique", Fn: builtinUnique}, false)
	env.Set("take", &object.Builtin{Name: "take", Fn: builtinTake}, false)
	env.Set("drop", &object.Builtin{Name: "drop", Fn: builtinDrop}, false)
	env.Set("slice", &object.Builtin{Name: "slice", Fn: builtinSlice}, false)
	env.Set("find", &object.Builtin{Name: "find", Fn: builtinFind}, false)
	env.Set("find_index", &object.Builtin{Name: "find_index", Fn: builtinFindIndex}, false)
	env.Set("every", &object.Builtin{Name: "every", Fn: builtinEvery}, false)
	env.Set("some", &object.Builtin{Name: "some", Fn: builtinSome}, false)
	env.Set("foreach", &object.Builtin{Name: "foreach", Fn: builtinForEach}, false)
	env.Set("range_array", &object.Builtin{Name: "range_array", Fn: builtinRangeArray}, false)
	env.Set("fill", &object.Builtin{Name: "fill", Fn: builtinFill}, false)
	env.Set("sort_by", &object.Builtin{Name: "sort_by", Fn: builtinSortBy}, false)
	env.Set("group_by", &object.Builtin{Name: "group_by", Fn: builtinGroupBy}, false)
	env.Set("frequencies", &object.Builtin{Name: "frequencies", Fn: builtinFrequencies}, false)
	env.Set("zip_with", &object.Builtin{Name: "zip_with", Fn: builtinZipWith}, false)
	env.Set("partition", &object.Builtin{Name: "partition", Fn: builtinPartition}, false)
	env.Set("window", &object.Builtin{Name: "window", Fn: builtinWindow}, false)
	env.Set("scan", &object.Builtin{Name: "scan", Fn: builtinScan}, false)
	env.Set("flat_map", &object.Builtin{Name: "flat_map", Fn: builtinFlatMap}, false)
}

func builtinFlat(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("flat: expected 1 argument, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("flat: argument must be array")
	}
	var result []object.Object
	for _, el := range arr.Elements {
		if inner, ok := el.(*object.Array); ok {
			result = append(result, inner.Elements...)
		} else {
			result = append(result, el)
		}
	}
	return &object.Array{Elements: result}
}

func builtinEnumerate(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("enumerate: expected 1 argument, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("enumerate: argument must be array")
	}
	result := make([]object.Object, len(arr.Elements))
	for i, el := range arr.Elements {
		pair := &object.Array{Elements: []object.Object{&object.Int{Value: int64(i)}, el}}
		result[i] = pair
	}
	return &object.Array{Elements: result}
}

func builtinZip(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("zip: expected 2 arguments, got %d", len(args))
	}
	a, ok := args[0].(*object.Array)
	if !ok {
		return errObj("zip: first argument must be array")
	}
	b, ok := args[1].(*object.Array)
	if !ok {
		return errObj("zip: second argument must be array")
	}
	length := len(a.Elements)
	if len(b.Elements) < length {
		length = len(b.Elements)
	}
	result := make([]object.Object, length)
	for i := 0; i < length; i++ {
		result[i] = &object.Array{Elements: []object.Object{a.Elements[i], b.Elements[i]}}
	}
	return &object.Array{Elements: result}
}

func builtinChunk(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("chunk: expected 2 arguments, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("chunk: first argument must be array")
	}
	size, ok := object.ToInt(args[1])
	if !ok || size <= 0 {
		return errObj("chunk: second argument must be positive integer")
	}
	var result []object.Object
	for i := 0; i < len(arr.Elements); i += int(size) {
		end := i + int(size)
		if end > len(arr.Elements) {
			end = len(arr.Elements)
		}
		chunk := make([]object.Object, end-i)
		copy(chunk, arr.Elements[i:end])
		result = append(result, &object.Array{Elements: chunk})
	}
	return &object.Array{Elements: result}
}

func builtinUnique(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("unique: expected 1 argument, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("unique: argument must be array")
	}
	seen := make(map[uint64]bool)
	var result []object.Object
	for _, el := range arr.Elements {
		h := el.HashKey()
		if !seen[h] {
			seen[h] = true
			result = append(result, el)
		}
	}
	return &object.Array{Elements: result}
}

func builtinTake(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("take: expected 2 arguments, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("take: first argument must be array")
	}
	n, ok := object.ToInt(args[1])
	if !ok {
		return errObj("take: second argument must be integer")
	}
	if n < 0 {
		n = 0
	}
	if int(n) > len(arr.Elements) {
		n = int64(len(arr.Elements))
	}
	result := make([]object.Object, n)
	copy(result, arr.Elements[:n])
	return &object.Array{Elements: result}
}

func builtinDrop(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("drop: expected 2 arguments, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("drop: first argument must be array")
	}
	n, ok := object.ToInt(args[1])
	if !ok {
		return errObj("drop: second argument must be integer")
	}
	if n < 0 {
		n = 0
	}
	if int(n) > len(arr.Elements) {
		n = int64(len(arr.Elements))
	}
	result := make([]object.Object, len(arr.Elements)-int(n))
	copy(result, arr.Elements[n:])
	return &object.Array{Elements: result}
}

func builtinSlice(args ...object.Object) object.Object {
	if len(args) < 2 || len(args) > 3 {
		return errObj("slice: expected 2-3 arguments, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("slice: first argument must be array")
	}
	start, ok := object.ToInt(args[1])
	if !ok {
		return errObj("slice: second argument must be integer")
	}
	end := int64(len(arr.Elements))
	if len(args) == 3 {
		e, ok := object.ToInt(args[2])
		if !ok {
			return errObj("slice: third argument must be integer")
		}
		end = e
	}
	if start < 0 {
		start += int64(len(arr.Elements))
	}
	if end < 0 {
		end += int64(len(arr.Elements))
	}
	if start < 0 {
		start = 0
	}
	if end > int64(len(arr.Elements)) {
		end = int64(len(arr.Elements))
	}
	if start >= end {
		return &object.Array{}
	}
	result := make([]object.Object, end-start)
	copy(result, arr.Elements[start:end])
	return &object.Array{Elements: result}
}

func builtinFind(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("find: expected 2 arguments, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("find: first argument must be array")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		return errObj("find: second argument must be function")
	}
	for _, el := range arr.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) > 0 {
			scope.Set(fn.Params[0].Name.Name, el, false)
		}
		result := evalBlock(fn, scope)
		if object.IsTruthy(result) {
			return el
		}
	}
	return object.NIL
}

func builtinFindIndex(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("find_index: expected 2 arguments, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("find_index: first argument must be array")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		return errObj("find_index: second argument must be function")
	}
	for i, el := range arr.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) > 0 {
			scope.Set(fn.Params[0].Name.Name, el, false)
		}
		result := evalBlock(fn, scope)
		if object.IsTruthy(result) {
			return &object.Int{Value: int64(i)}
		}
	}
	return &object.Int{Value: -1}
}

func builtinEvery(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("every: expected 2 arguments, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("every: first argument must be array")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		return errObj("every: second argument must be function")
	}
	for _, el := range arr.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) > 0 {
			scope.Set(fn.Params[0].Name.Name, el, false)
		}
		result := evalBlock(fn, scope)
		if !object.IsTruthy(result) {
			return object.FALSE
		}
	}
	return object.TRUE
}

func builtinSome(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("some: expected 2 arguments, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("some: first argument must be array")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		return errObj("some: second argument must be function")
	}
	for _, el := range arr.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) > 0 {
			scope.Set(fn.Params[0].Name.Name, el, false)
		}
		result := evalBlock(fn, scope)
		if object.IsTruthy(result) {
			return object.TRUE
		}
	}
	return object.FALSE
}

func builtinForEach(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("foreach: expected 2 arguments, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("foreach: first argument must be array")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		return errObj("foreach: second argument must be function")
	}
	for _, el := range arr.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) > 0 {
			scope.Set(fn.Params[0].Name.Name, el, false)
		}
		evalBlock(fn, scope)
	}
	return object.NIL
}

func builtinRangeArray(args ...object.Object) object.Object {
	if len(args) < 1 || len(args) > 3 {
		return errObj("range_array: expected 1-3 arguments, got %d", len(args))
	}
	var start, end, step int64
	switch len(args) {
	case 1:
		e, ok := object.ToInt(args[0])
		if !ok {
			return errObj("range_array: argument must be integer")
		}
		start, end, step = 0, e, 1
	case 2:
		s, ok := object.ToInt(args[0])
		if !ok {
			return errObj("range_array: first argument must be integer")
		}
		e, ok := object.ToInt(args[1])
		if !ok {
			return errObj("range_array: second argument must be integer")
		}
		start, end, step = s, e, 1
	case 3:
		s, ok := object.ToInt(args[0])
		if !ok {
			return errObj("range_array: first argument must be integer")
		}
		e, ok := object.ToInt(args[1])
		if !ok {
			return errObj("range_array: second argument must be integer")
		}
		st, ok := object.ToInt(args[2])
		if !ok || st == 0 {
			return errObj("range_array: step must be non-zero integer")
		}
		start, end, step = s, e, st
	}
	var result []object.Object
	if step > 0 {
		for i := start; i < end; i += step {
			result = append(result, &object.Int{Value: i})
		}
	} else {
		for i := start; i > end; i += step {
			result = append(result, &object.Int{Value: i})
		}
	}
	return &object.Array{Elements: result}
}

func builtinZipWith(args ...object.Object) object.Object {
	if len(args) != 3 {
		return errObj("zip_with: expected 3 arguments (arr1, arr2, fn), got %d", len(args))
	}
	a, ok := args[0].(*object.Array)
	if !ok {
		return errObj("zip_with: first argument must be array")
	}
	b, ok := args[1].(*object.Array)
	if !ok {
		return errObj("zip_with: second argument must be array")
	}
	fn, ok := args[2].(*object.Fn)
	if !ok {
		return errObj("zip_with: third argument must be function")
	}
	length := len(a.Elements)
	if len(b.Elements) < length {
		length = len(b.Elements)
	}
	result := make([]object.Object, length)
	for i := 0; i < length; i++ {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) >= 2 {
			scope.Set(fn.Params[0].Name.Name, a.Elements[i], false)
			scope.Set(fn.Params[1].Name.Name, b.Elements[i], false)
		}
		result[i] = evalBlock(fn, scope)
	}
	return &object.Array{Elements: result}
}

func builtinPartition(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("partition: expected 2 arguments (arr, fn), got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("partition: first argument must be array")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		return errObj("partition: second argument must be function")
	}
	var trueElems, falseElems []object.Object
	for _, el := range arr.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) > 0 {
			scope.Set(fn.Params[0].Name.Name, el, false)
		}
		result := evalBlock(fn, scope)
		if object.IsTruthy(result) {
			trueElems = append(trueElems, el)
		} else {
			falseElems = append(falseElems, el)
		}
	}
	return &object.Array{Elements: []object.Object{
		&object.Array{Elements: trueElems},
		&object.Array{Elements: falseElems},
	}}
}

func builtinWindow(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("window: expected 2 arguments (arr, size), got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("window: first argument must be array")
	}
	size, ok := object.ToInt(args[1])
	if !ok || size <= 0 {
		return errObj("window: second argument must be positive integer")
	}
	if int(size) > len(arr.Elements) {
		return &object.Array{}
	}
	var result []object.Object
	for i := 0; i <= len(arr.Elements)-int(size); i++ {
		win := make([]object.Object, size)
		copy(win, arr.Elements[i:i+int(size)])
		result = append(result, &object.Array{Elements: win})
	}
	return &object.Array{Elements: result}
}

func builtinScan(args ...object.Object) object.Object {
	if len(args) != 3 {
		return errObj("scan: expected 3 arguments (arr, init, fn), got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("scan: first argument must be array")
	}
	fn, ok := args[2].(*object.Fn)
	if !ok {
		return errObj("scan: third argument must be function")
	}
	acc := args[1]
	result := make([]object.Object, len(arr.Elements)+1)
	result[0] = acc
	for i, el := range arr.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) >= 2 {
			scope.Set(fn.Params[0].Name.Name, acc, false)
			scope.Set(fn.Params[1].Name.Name, el, false)
		}
		acc = evalBlock(fn, scope)
		result[i+1] = acc
	}
	return &object.Array{Elements: result}
}

func builtinFlatMap(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("flat_map: expected 2 arguments (arr, fn), got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("flat_map: first argument must be array")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		return errObj("flat_map: second argument must be function")
	}
	var result []object.Object
	for _, el := range arr.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) > 0 {
			scope.Set(fn.Params[0].Name.Name, el, false)
		}
		val := evalBlock(fn, scope)
		if inner, ok := val.(*object.Array); ok {
			result = append(result, inner.Elements...)
		} else {
			result = append(result, val)
		}
	}
	return &object.Array{Elements: result}
}

func builtinFill(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("fill: expected 2 arguments (value, count), got %d", len(args))
	}
	n, ok := object.ToInt(args[1])
	if !ok || n < 0 {
		return errObj("fill: second argument must be non-negative integer")
	}
	result := make([]object.Object, n)
	for i := range result {
		result[i] = args[0]
	}
	return &object.Array{Elements: result}
}

// sort_by(arr, key_fn) — sorts array using key function for comparison
func builtinSortBy(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("sort_by: expected 2 arguments (array, key_fn), got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("sort_by: first argument must be array")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		return errObj("sort_by: second argument must be function")
	}
	result := arr.Copy()
	keys := make([]object.Object, len(result.Elements))
	for i, el := range result.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) > 0 {
			scope.Set(fn.Params[0].Name.Name, el, false)
		}
		keys[i] = evalBlock(fn, scope)
	}
	sort.SliceStable(result.Elements, func(i, j int) bool {
		return compareObj(keys[i], keys[j]) < 0
	})
	return result
}

// group_by(arr, key_fn) — groups elements by computed key into a map
func builtinGroupBy(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("group_by: expected 2 arguments (array, key_fn), got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("group_by: first argument must be array")
	}
	fn, ok := args[1].(*object.Fn)
	if !ok {
		return errObj("group_by: second argument must be function")
	}
	result := object.NewMap()
	for _, el := range arr.Elements {
		scope := environ.NewEnclosed(fn.Env)
		if len(fn.Params) > 0 {
			scope.Set(fn.Params[0].Name.Name, el, false)
		}
		key := evalBlock(fn, scope)
		existing, found := result.GetPair(key)
		if found {
			group := existing.(*object.Array)
			group.Push(el)
		} else {
			result.SetPair(key, &object.Array{Elements: []object.Object{el}})
		}
	}
	return result
}

// frequencies(arr) — counts occurrences of each element
func builtinFrequencies(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("frequencies: expected 1 argument, got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("frequencies: argument must be array")
	}
	result := object.NewMap()
	for _, el := range arr.Elements {
		existing, found := result.GetPair(el)
		if found {
			count := existing.(*object.Int)
			result.SetPair(el, &object.Int{Value: count.Value + 1})
		} else {
			result.SetPair(el, &object.Int{Value: 1})
		}
	}
	return result
}

func compareObj(a, b object.Object) int {
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
