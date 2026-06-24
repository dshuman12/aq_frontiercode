package object

import (
	"encoding/binary"
	"fmt"
	"hash/fnv"
	"math"
	"strings"

	"github.com/Mustafa4ngin/Drift/pkg/ast"
	"github.com/Mustafa4ngin/Drift/pkg/environ"
)

const (
	TypeInt      = "int"
	TypeFloat    = "float"
	TypeString   = "string"
	TypeBool     = "bool"
	TypeNil      = "nil"
	TypeArray    = "array"
	TypeMap      = "map"
	TypeFn       = "fn"
	TypeBuiltin  = "builtin"
	TypeReturn   = "return"
	TypeBreak    = "break"
	TypeContinue = "continue"
	TypeRange    = "range"
)

type Object interface {
	environ.Value
	HashKey() uint64
	Equals(other Object) bool
}

type Int struct{ Value int64 }

func (o *Int) Type() string    { return TypeInt }
func (o *Int) Inspect() string { return fmt.Sprintf("%d", o.Value) }
func (o *Int) HashKey() uint64 { return uint64(o.Value) }
func (o *Int) Equals(other Object) bool {
	if oi, ok := other.(*Int); ok {
		return o.Value == oi.Value
	}
	return false
}

type Float struct{ Value float64 }

func (o *Float) Type() string    { return TypeFloat }
func (o *Float) Inspect() string { return fmt.Sprintf("%g", o.Value) }
func (o *Float) HashKey() uint64 {
	return math.Float64bits(o.Value)
}
func (o *Float) Equals(other Object) bool {
	if of, ok := other.(*Float); ok {
		return o.Value == of.Value
	}
	return false
}

type String struct{ Value string }

func (o *String) Type() string    { return TypeString }
func (o *String) Inspect() string { return o.Value }
func (o *String) HashKey() uint64 {
	h := fnv.New64a()
	h.Write([]byte(o.Value))
	return h.Sum64()
}
func (o *String) Equals(other Object) bool {
	if os, ok := other.(*String); ok {
		return o.Value == os.Value
	}
	return false
}

type Bool struct{ Value bool }

func (o *Bool) Type() string    { return TypeBool }
func (o *Bool) Inspect() string { return fmt.Sprintf("%t", o.Value) }
func (o *Bool) HashKey() uint64 {
	if o.Value {
		return 1
	}
	return 0
}
func (o *Bool) Equals(other Object) bool {
	if ob, ok := other.(*Bool); ok {
		return o.Value == ob.Value
	}
	return false
}

var (
	TRUE  = &Bool{Value: true}
	FALSE = &Bool{Value: false}
	NIL   = &Nil{}
)

func NativeBool(b bool) *Bool {
	if b {
		return TRUE
	}
	return FALSE
}

type Nil struct{}

func (o *Nil) Type() string          { return TypeNil }
func (o *Nil) Inspect() string       { return "nil" }
func (o *Nil) HashKey() uint64       { return 0 }
func (o *Nil) Equals(other Object) bool {
	_, ok := other.(*Nil)
	return ok
}

type Array struct {
	Elements []Object
}

func (o *Array) Type() string { return TypeArray }
func (o *Array) Inspect() string {
	elems := make([]string, len(o.Elements))
	for i, e := range o.Elements {
		elems[i] = e.Inspect()
	}
	return "[" + strings.Join(elems, ", ") + "]"
}
func (o *Array) HashKey() uint64 {
	h := fnv.New64a()
	var b [8]byte
	for _, e := range o.Elements {
		binary.LittleEndian.PutUint64(b[:], e.HashKey())
		h.Write(b[:])
	}
	return h.Sum64()
}
func (o *Array) Equals(other Object) bool {
	oa, ok := other.(*Array)
	if !ok || len(o.Elements) != len(oa.Elements) {
		return false
	}
	for i := range o.Elements {
		if !o.Elements[i].Equals(oa.Elements[i]) {
			return false
		}
	}
	return true
}
func (o *Array) Len() int       { return len(o.Elements) }
func (o *Array) Get(i int) Object { return o.Elements[i] }
func (o *Array) Push(v Object) { o.Elements = append(o.Elements, v) }
func (o *Array) Pop() Object {
	if len(o.Elements) == 0 {
		return NIL
	}
	last := o.Elements[len(o.Elements)-1]
	o.Elements = o.Elements[:len(o.Elements)-1]
	return last
}
func (o *Array) Copy() *Array {
	elems := make([]Object, len(o.Elements))
	copy(elems, o.Elements)
	return &Array{Elements: elems}
}

type MapPair struct {
	Key   Object
	Value Object
}

type Map struct {
	Pairs map[uint64]*MapPair
	Order []uint64
}

func NewMap() *Map {
	return &Map{Pairs: make(map[uint64]*MapPair)}
}

func (o *Map) Type() string { return TypeMap }
func (o *Map) Inspect() string {
	pairs := make([]string, 0, len(o.Pairs))
	for _, k := range o.Order {
		p := o.Pairs[k]
		pairs = append(pairs, fmt.Sprintf("%s: %s", p.Key.Inspect(), p.Value.Inspect()))
	}
	return "{" + strings.Join(pairs, ", ") + "}"
}
func (o *Map) HashKey() uint64 {
	h := fnv.New64a()
	var b [16]byte
	for _, k := range o.Order {
		p := o.Pairs[k]
		binary.LittleEndian.PutUint64(b[:8], p.Key.HashKey())
		binary.LittleEndian.PutUint64(b[8:], p.Value.HashKey())
		h.Write(b[:])
	}
	return h.Sum64()
}
func (o *Map) Equals(other Object) bool {
	om, ok := other.(*Map)
	if !ok || len(o.Pairs) != len(om.Pairs) {
		return false
	}
	for k, p := range o.Pairs {
		op, ok := om.Pairs[k]
		if !ok || !p.Value.Equals(op.Value) {
			return false
		}
	}
	return true
}
func (o *Map) SetPair(key, value Object) {
	k := key.HashKey()
	if _, exists := o.Pairs[k]; !exists {
		o.Order = append(o.Order, k)
	}
	o.Pairs[k] = &MapPair{Key: key, Value: value}
}
func (o *Map) GetPair(key Object) (Object, bool) {
	p, ok := o.Pairs[key.HashKey()]
	if !ok {
		return nil, false
	}
	return p.Value, true
}

func (o *Map) GetByString(name string) (Object, bool) {
	h := fnv.New64a()
	h.Write([]byte(name))
	p, ok := o.Pairs[h.Sum64()]
	if !ok {
		return nil, false
	}
	return p.Value, true
}
func (o *Map) DeletePair(key Object) bool {
	k := key.HashKey()
	if _, ok := o.Pairs[k]; !ok {
		return false
	}
	delete(o.Pairs, k)
	for i, h := range o.Order {
		if h == k {
			copy(o.Order[i:], o.Order[i+1:])
			o.Order = o.Order[:len(o.Order)-1]
			break
		}
	}
	return true
}
func (o *Map) Len() int { return len(o.Pairs) }
func (o *Map) Keys() []Object {
	keys := make([]Object, 0, len(o.Order))
	for _, k := range o.Order {
		keys = append(keys, o.Pairs[k].Key)
	}
	return keys
}
func (o *Map) Values() []Object {
	vals := make([]Object, 0, len(o.Order))
	for _, k := range o.Order {
		vals = append(vals, o.Pairs[k].Value)
	}
	return vals
}

type Fn struct {
	Params []*ast.Param
	Body   *ast.Block
	Env    *environ.Env
	Name   string
}

func (o *Fn) Type() string { return TypeFn }
func (o *Fn) Inspect() string {
	params := make([]string, len(o.Params))
	for i, p := range o.Params {
		params[i] = p.String()
	}
	name := o.Name
	if name == "" {
		name = "<anonymous>"
	}
	return fmt.Sprintf("fn %s(%s)", name, strings.Join(params, ", "))
}
func (o *Fn) HashKey() uint64       { return 0 }
func (o *Fn) Equals(other Object) bool { return o == other }

type BuiltinFunc func(args ...Object) Object

type Builtin struct {
	Name string
	Fn   BuiltinFunc
}

func (o *Builtin) Type() string          { return TypeBuiltin }
func (o *Builtin) Inspect() string       { return fmt.Sprintf("builtin(%s)", o.Name) }
func (o *Builtin) HashKey() uint64       { return 0 }
func (o *Builtin) Equals(other Object) bool { return o == other }

type ReturnValue struct {
	Value Object
}

func (o *ReturnValue) Type() string          { return TypeReturn }
func (o *ReturnValue) Inspect() string       { return o.Value.Inspect() }
func (o *ReturnValue) HashKey() uint64       { return 0 }
func (o *ReturnValue) Equals(other Object) bool { return false }

type BreakSignal struct{}

func (o *BreakSignal) Type() string          { return TypeBreak }
func (o *BreakSignal) Inspect() string       { return "break" }
func (o *BreakSignal) HashKey() uint64       { return 0 }
func (o *BreakSignal) Equals(other Object) bool { return false }

type ContinueSignal struct{}

func (o *ContinueSignal) Type() string          { return TypeContinue }
func (o *ContinueSignal) Inspect() string       { return "continue" }
func (o *ContinueSignal) HashKey() uint64       { return 0 }
func (o *ContinueSignal) Equals(other Object) bool { return false }

type Range struct {
	Start int64
	End   int64
}

func (o *Range) Type() string          { return TypeRange }
func (o *Range) Inspect() string       { return fmt.Sprintf("%d..%d", o.Start, o.End) }
func (o *Range) HashKey() uint64       { return uint64(o.Start)*31 + uint64(o.End) }
func (o *Range) Equals(other Object) bool {
	or, ok := other.(*Range)
	if !ok {
		return false
	}
	return o.Start == or.Start && o.End == or.End
}
func (o *Range) Len() int {
	if o.End >= o.Start {
		return int(o.End - o.Start)
	}
	return 0
}

func IsTruthy(obj Object) bool {
	switch o := obj.(type) {
	case *Bool:
		return o.Value
	case *Nil:
		return false
	case *Int:
		return o.Value != 0
	case *Float:
		return o.Value != 0
	case *String:
		return o.Value != ""
	case *Array:
		return len(o.Elements) > 0
	case *Map:
		return len(o.Pairs) > 0
	default:
		return true
	}
}

func IsError(obj Object) bool {
	return obj != nil && obj.Type() == "error"
}

func ToFloat(obj Object) (float64, bool) {
	switch o := obj.(type) {
	case *Int:
		return float64(o.Value), true
	case *Float:
		return o.Value, true
	default:
		return 0, false
	}
}

func ToInt(obj Object) (int64, bool) {
	switch o := obj.(type) {
	case *Int:
		return o.Value, true
	case *Float:
		return int64(o.Value), true
	default:
		return 0, false
	}
}