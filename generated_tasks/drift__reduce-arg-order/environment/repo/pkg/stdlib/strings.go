package stdlib

import (
	"strings"
	"unicode/utf8"

	"github.com/Mustafa4ngin/Drift/pkg/object"
)

func builtinSubstring(args ...object.Object) object.Object {
	if len(args) < 2 || len(args) > 3 {
		return errObj("substring: expected 2-3 arguments, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("substring: first argument must be string")
	}
	runes := []rune(s.Value)
	startI, _ := object.ToInt(args[1])
	if startI < 0 {
		startI = 0
	}
	endI := int64(len(runes))
	if len(args) == 3 {
		e, ok := object.ToInt(args[2])
		if !ok {
			return errObj("substring: third argument must be integer")
		}
		endI = e
	}
	if startI > int64(len(runes)) {
		startI = int64(len(runes))
	}
	if endI > int64(len(runes)) {
		endI = int64(len(runes))
	}
	if startI > endI {
		startI, endI = endI, startI
	}
	return &object.String{Value: string(runes[startI:endI])}
}

func builtinIndexOf(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("index_of: expected 2 arguments, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("index_of: first argument must be string")
	}
	sub, ok := args[1].(*object.String)
	if !ok {
		return errObj("index_of: second argument must be string")
	}
	byteIdx := strings.Index(s.Value, sub.Value)
	if byteIdx < 0 {
		return &object.Int{Value: -1}
	}
	return &object.Int{Value: int64(utf8.RuneCountInString(s.Value[:byteIdx]))}
}

func builtinLastIndexOf(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("last_index_of: expected 2 arguments, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("last_index_of: first argument must be string")
	}
	sub, ok := args[1].(*object.String)
	if !ok {
		return errObj("last_index_of: second argument must be string")
	}
	byteIdx := strings.LastIndex(s.Value, sub.Value)
	if byteIdx < 0 {
		return &object.Int{Value: -1}
	}
	return &object.Int{Value: int64(utf8.RuneCountInString(s.Value[:byteIdx]))}
}

func builtinRepeat(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("repeat: expected 2 arguments, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("repeat: first argument must be string")
	}
	n, ok := object.ToInt(args[1])
	if !ok {
		return errObj("repeat: second argument must be integer")
	}
	if n < 0 {
		n = 0
	}
	return &object.String{Value: strings.Repeat(s.Value, int(n))}
}

func builtinCountOf(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("count_of: expected 2 arguments, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("count_of: first argument must be string")
	}
	sub, ok := args[1].(*object.String)
	if !ok {
		return errObj("count_of: second argument must be string")
	}
	return &object.Int{Value: int64(strings.Count(s.Value, sub.Value))}
}

func builtinCharAt(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("char_at: expected 2 arguments, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("char_at: first argument must be string")
	}
	idx, ok := object.ToInt(args[1])
	if !ok {
		return errObj("char_at: second argument must be integer")
	}
	runes := []rune(s.Value)
	if idx < 0 {
		idx += int64(len(runes))
	}
	if idx < 0 || int(idx) >= len(runes) {
		return object.NIL
	}
	return &object.String{Value: string(runes[idx])}
}

func builtinPadLeft(args ...object.Object) object.Object {
	if len(args) < 2 || len(args) > 3 {
		return errObj("pad_left: expected 2-3 arguments, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("pad_left: first argument must be string")
	}
	width, ok := object.ToInt(args[1])
	if !ok {
		return errObj("pad_left: second argument must be integer")
	}
	padChar := " "
	if len(args) == 3 {
		pc, ok := args[2].(*object.String)
		if !ok {
			return errObj("pad_left: third argument must be string")
		}
		if pc.Value != "" {
			padChar = string([]rune(pc.Value)[0])
		}
	}
	runeLen := utf8.RuneCountInString(s.Value)
	if int64(runeLen) >= width {
		return s
	}
	pad := strings.Repeat(padChar, int(width)-runeLen)
	return &object.String{Value: pad + s.Value}
}

func builtinPadRight(args ...object.Object) object.Object {
	if len(args) < 2 || len(args) > 3 {
		return errObj("pad_right: expected 2-3 arguments, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("pad_right: first argument must be string")
	}
	width, ok := object.ToInt(args[1])
	if !ok {
		return errObj("pad_right: second argument must be integer")
	}
	padChar := " "
	if len(args) == 3 {
		pc, ok := args[2].(*object.String)
		if !ok {
			return errObj("pad_right: third argument must be string")
		}
		if pc.Value != "" {
			padChar = string([]rune(pc.Value)[0])
		}
	}
	runeLen := utf8.RuneCountInString(s.Value)
	if int64(runeLen) >= width {
		return s
	}
	pad := strings.Repeat(padChar, int(width)-runeLen)
	return &object.String{Value: s.Value + pad}
}

func builtinIsEmpty(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("is_empty: expected 1 argument, got %d", len(args))
	}
	switch o := args[0].(type) {
	case *object.String:
		return object.NativeBool(o.Value == "")
	case *object.Array:
		return object.NativeBool(len(o.Elements) == 0)
	case *object.Map:
		return object.NativeBool(o.Len() == 0)
	default:
		return errObj("is_empty: unsupported type %s", args[0].Type())
	}
}

func builtinLines(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("lines: expected 1 argument, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("lines: argument must be string")
	}
	parts := strings.Split(s.Value, "\n")
	elems := make([]object.Object, len(parts))
	for i, p := range parts {
		elems[i] = &object.String{Value: p}
	}
	return &object.Array{Elements: elems}
}

func builtinJoin(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("join: expected 2 arguments (array, separator), got %d", len(args))
	}
	arr, ok := args[0].(*object.Array)
	if !ok {
		return errObj("join: first argument must be array")
	}
	sep, ok := args[1].(*object.String)
	if !ok {
		return errObj("join: second argument must be string")
	}
	parts := make([]string, len(arr.Elements))
	for i, el := range arr.Elements {
		parts[i] = el.Inspect()
	}
	return &object.String{Value: strings.Join(parts, sep.Value)}
}

func builtinSplit(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("split: expected 2 arguments (string, separator), got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("split: first argument must be string")
	}
	sep, ok := args[1].(*object.String)
	if !ok {
		return errObj("split: second argument must be string")
	}
	parts := strings.Split(s.Value, sep.Value)
	elems := make([]object.Object, len(parts))
	for i, p := range parts {
		elems[i] = &object.String{Value: p}
	}
	return &object.Array{Elements: elems}
}

func builtinTrim(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("trim: expected 1 argument, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("trim: argument must be string")
	}
	return &object.String{Value: strings.TrimSpace(s.Value)}
}

func builtinUpper(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("upper: expected 1 argument, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("upper: argument must be string")
	}
	return &object.String{Value: strings.ToUpper(s.Value)}
}

func builtinLower(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("lower: expected 1 argument, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("lower: argument must be string")
	}
	return &object.String{Value: strings.ToLower(s.Value)}
}

func builtinReplace(args ...object.Object) object.Object {
	if len(args) != 3 {
		return errObj("replace: expected 3 arguments (string, old, new), got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("replace: first argument must be string")
	}
	old, ok := args[1].(*object.String)
	if !ok {
		return errObj("replace: second argument must be string")
	}
	newS, ok := args[2].(*object.String)
	if !ok {
		return errObj("replace: third argument must be string")
	}
	return &object.String{Value: strings.ReplaceAll(s.Value, old.Value, newS.Value)}
}

func builtinStartsWith(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("starts_with: expected 2 arguments, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("starts_with: first argument must be string")
	}
	prefix, ok := args[1].(*object.String)
	if !ok {
		return errObj("starts_with: second argument must be string")
	}
	return object.NativeBool(strings.HasPrefix(s.Value, prefix.Value))
}

func builtinEndsWith(args ...object.Object) object.Object {
	if len(args) != 2 {
		return errObj("ends_with: expected 2 arguments, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("ends_with: first argument must be string")
	}
	suffix, ok := args[1].(*object.String)
	if !ok {
		return errObj("ends_with: second argument must be string")
	}
	return object.NativeBool(strings.HasSuffix(s.Value, suffix.Value))
}

func builtinChars(args ...object.Object) object.Object {
	if len(args) != 1 {
		return errObj("chars: expected 1 argument, got %d", len(args))
	}
	s, ok := args[0].(*object.String)
	if !ok {
		return errObj("chars: argument must be string")
	}
	runes := []rune(s.Value)
	elems := make([]object.Object, len(runes))
	for i, r := range runes {
		elems[i] = &object.String{Value: string(r)}
	}
	return &object.Array{Elements: elems}
}