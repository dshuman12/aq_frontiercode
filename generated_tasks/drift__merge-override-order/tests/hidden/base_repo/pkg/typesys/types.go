package typesys

import (
	"fmt"
	"strings"
)

type Kind int

const (
	KindInt Kind = iota
	KindFloat
	KindString
	KindBool
	KindNil
	KindVoid
	KindArray
	KindMap
	KindFn
	KindAny
	KindRange
)

type Type struct {
	Kind   Kind
	Elem   *Type   // for arrays
	Key    *Type   // for maps
	Val    *Type   // for maps
	Params []*Type // for functions (parameter types)
	Ret    *Type   // for functions (return type)
}

var (
	TInt    = &Type{Kind: KindInt}
	TFloat  = &Type{Kind: KindFloat}
	TString = &Type{Kind: KindString}
	TBool   = &Type{Kind: KindBool}
	TNil    = &Type{Kind: KindNil}
	TVoid   = &Type{Kind: KindVoid}
	TAny    = &Type{Kind: KindAny}
	TRange  = &Type{Kind: KindRange}
)

func ArrayOf(elem *Type) *Type {
	return &Type{Kind: KindArray, Elem: elem}
}

func MapOf(key, val *Type) *Type {
	return &Type{Kind: KindMap, Key: key, Val: val}
}

func FnType(params []*Type, ret *Type) *Type {
	return &Type{Kind: KindFn, Params: params, Ret: ret}
}

func (t *Type) String() string {
	switch t.Kind {
	case KindInt:
		return "int"
	case KindFloat:
		return "float"
	case KindString:
		return "string"
	case KindBool:
		return "bool"
	case KindNil:
		return "nil"
	case KindVoid:
		return "void"
	case KindAny:
		return "any"
	case KindRange:
		return "range"
	case KindArray:
		if t.Elem != nil {
			return fmt.Sprintf("[%s]", t.Elem)
		}
		return "[]"
	case KindMap:
		if t.Key != nil && t.Val != nil {
			return fmt.Sprintf("map[%s]%s", t.Key, t.Val)
		}
		return "map"
	case KindFn:
		params := make([]string, len(t.Params))
		for i, p := range t.Params {
			params[i] = p.String()
		}
		ret := "void"
		if t.Ret != nil {
			ret = t.Ret.String()
		}
		return fmt.Sprintf("fn(%s) -> %s", strings.Join(params, ", "), ret)
	default:
		return "unknown"
	}
}

func (t *Type) Equals(other *Type) bool {
	if t.Kind == KindAny || other.Kind == KindAny {
		return true
	}
	if t.Kind != other.Kind {
		return false
	}
	switch t.Kind {
	case KindArray:
		if t.Elem == nil || other.Elem == nil {
			return true
		}
		return t.Elem.Equals(other.Elem)
	case KindMap:
		if t.Key == nil || other.Key == nil {
			return true
		}
		return t.Key.Equals(other.Key) && t.Val.Equals(other.Val)
	case KindFn:
		if len(t.Params) != len(other.Params) {
			return false
		}
		for i := range t.Params {
			if !t.Params[i].Equals(other.Params[i]) {
				return false
			}
		}
		if t.Ret == nil || other.Ret == nil {
			return true
		}
		return t.Ret.Equals(other.Ret)
	}
	return true
}

func IsNumeric(t *Type) bool {
	return t.Kind == KindInt || t.Kind == KindFloat || t.Kind == KindAny
}

func IsComparable(t *Type) bool {
	return t.Kind == KindInt || t.Kind == KindFloat || t.Kind == KindString || t.Kind == KindAny
}

func ResolveFromName(name string) *Type {
	switch name {
	case "int":
		return TInt
	case "float":
		return TFloat
	case "string":
		return TString
	case "bool":
		return TBool
	case "void":
		return TVoid
	case "any":
		return TAny
	case "nil":
		return TNil
	default:
		return TAny
	}
}

func PromoteNumeric(a, b *Type) *Type {
	if a.Kind == KindFloat || b.Kind == KindFloat {
		return TFloat
	}
	return TInt
}
