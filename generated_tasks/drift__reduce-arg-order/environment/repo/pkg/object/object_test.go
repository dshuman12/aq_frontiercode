package object

import (
	"testing"
)

func TestIntInspect(t *testing.T) {
	o := &Int{Value: 42}
	if o.Inspect() != "42" {
		t.Errorf("expected '42', got %q", o.Inspect())
	}
	if o.Type() != TypeInt {
		t.Errorf("expected 'int', got %q", o.Type())
	}
}

func TestFloatInspect(t *testing.T) {
	o := &Float{Value: 3.14}
	if o.Type() != TypeFloat {
		t.Errorf("expected 'float', got %q", o.Type())
	}
}

func TestStringInspect(t *testing.T) {
	o := &String{Value: "hello"}
	if o.Inspect() != "hello" {
		t.Errorf("expected 'hello', got %q", o.Inspect())
	}
}

func TestBoolInspect(t *testing.T) {
	if TRUE.Inspect() != "true" {
		t.Errorf("expected 'true', got %q", TRUE.Inspect())
	}
	if FALSE.Inspect() != "false" {
		t.Errorf("expected 'false', got %q", FALSE.Inspect())
	}
}

func TestNilInspect(t *testing.T) {
	if NIL.Inspect() != "nil" {
		t.Errorf("expected 'nil', got %q", NIL.Inspect())
	}
}

func TestNativeBool(t *testing.T) {
	if NativeBool(true) != TRUE {
		t.Error("NativeBool(true) should return TRUE")
	}
	if NativeBool(false) != FALSE {
		t.Error("NativeBool(false) should return FALSE")
	}
}

func TestArrayInspect(t *testing.T) {
	arr := &Array{Elements: []Object{&Int{1}, &Int{2}, &Int{3}}}
	if arr.Inspect() != "[1, 2, 3]" {
		t.Errorf("expected '[1, 2, 3]', got %q", arr.Inspect())
	}
}

func TestArrayPushPop(t *testing.T) {
	arr := &Array{}
	arr.Push(&Int{1})
	arr.Push(&Int{2})
	if arr.Len() != 2 {
		t.Errorf("expected len 2, got %d", arr.Len())
	}
	popped := arr.Pop()
	if popped.(*Int).Value != 2 {
		t.Errorf("expected 2, got %s", popped.Inspect())
	}
	if arr.Len() != 1 {
		t.Errorf("expected len 1, got %d", arr.Len())
	}
}

func TestArrayPopEmpty(t *testing.T) {
	arr := &Array{}
	popped := arr.Pop()
	if _, ok := popped.(*Nil); !ok {
		t.Errorf("expected Nil, got %T", popped)
	}
}

func TestArrayCopy(t *testing.T) {
	arr := &Array{Elements: []Object{&Int{1}, &Int{2}}}
	cp := arr.Copy()
	cp.Push(&Int{3})
	if arr.Len() != 2 {
		t.Error("original should not be modified")
	}
	if cp.Len() != 3 {
		t.Error("copy should have 3 elements")
	}
}

func TestArrayGet(t *testing.T) {
	arr := &Array{Elements: []Object{&Int{10}, &Int{20}}}
	if arr.Get(0).(*Int).Value != 10 {
		t.Error("Get(0) should be 10")
	}
	if arr.Get(1).(*Int).Value != 20 {
		t.Error("Get(1) should be 20")
	}
}

func TestMapSetAndGet(t *testing.T) {
	m := NewMap()
	m.SetPair(&String{Value: "a"}, &Int{Value: 1})
	v, ok := m.GetPair(&String{Value: "a"})
	if !ok {
		t.Fatal("expected to find key 'a'")
	}
	if v.(*Int).Value != 1 {
		t.Errorf("expected 1, got %s", v.Inspect())
	}
}

func TestMapGetMissing(t *testing.T) {
	m := NewMap()
	_, ok := m.GetPair(&String{Value: "nope"})
	if ok {
		t.Error("expected not found")
	}
}

func TestMapDelete(t *testing.T) {
	m := NewMap()
	m.SetPair(&String{Value: "a"}, &Int{Value: 1})
	ok := m.DeletePair(&String{Value: "a"})
	if !ok {
		t.Error("expected delete to succeed")
	}
	if m.Len() != 0 {
		t.Errorf("expected len 0, got %d", m.Len())
	}
}

func TestMapKeysValues(t *testing.T) {
	m := NewMap()
	m.SetPair(&String{Value: "a"}, &Int{Value: 1})
	m.SetPair(&String{Value: "b"}, &Int{Value: 2})
	if len(m.Keys()) != 2 {
		t.Errorf("expected 2 keys, got %d", len(m.Keys()))
	}
	if len(m.Values()) != 2 {
		t.Errorf("expected 2 values, got %d", len(m.Values()))
	}
}

func TestMapInspect(t *testing.T) {
	m := NewMap()
	m.SetPair(&String{Value: "x"}, &Int{Value: 42})
	s := m.Inspect()
	if s != "{x: 42}" {
		t.Errorf("expected '{x: 42}', got %q", s)
	}
}

func TestMapOverwrite(t *testing.T) {
	m := NewMap()
	m.SetPair(&String{Value: "a"}, &Int{Value: 1})
	m.SetPair(&String{Value: "a"}, &Int{Value: 2})
	v, _ := m.GetPair(&String{Value: "a"})
	if v.(*Int).Value != 2 {
		t.Errorf("expected 2, got %s", v.Inspect())
	}
	if m.Len() != 1 {
		t.Errorf("expected len 1, got %d", m.Len())
	}
}

func TestRangeObject(t *testing.T) {
	r := &Range{Start: 0, End: 10}
	if r.Len() != 10 {
		t.Errorf("expected len 10, got %d", r.Len())
	}
	if r.Inspect() != "0..10" {
		t.Errorf("expected '0..10', got %q", r.Inspect())
	}
}

func TestRangeNegativeLen(t *testing.T) {
	r := &Range{Start: 10, End: 0}
	if r.Len() != 0 {
		t.Errorf("expected len 0 for reversed range, got %d", r.Len())
	}
}

func TestIsTruthy(t *testing.T) {
	tests := []struct {
		obj      Object
		expected bool
	}{
		{TRUE, true},
		{FALSE, false},
		{NIL, false},
		{&Int{Value: 0}, false},
		{&Int{Value: 1}, true},
		{&Float{Value: 0}, false},
		{&Float{Value: 1.5}, true},
		{&String{Value: ""}, false},
		{&String{Value: "x"}, true},
		{&Array{}, false},
		{&Array{Elements: []Object{&Int{1}}}, true},
	}
	for _, tc := range tests {
		if IsTruthy(tc.obj) != tc.expected {
			t.Errorf("IsTruthy(%s) = %v, expected %v", tc.obj.Inspect(), !tc.expected, tc.expected)
		}
	}
}

func TestEquals(t *testing.T) {
	tests := []struct {
		a, b     Object
		expected bool
	}{
		{&Int{42}, &Int{42}, true},
		{&Int{42}, &Int{43}, false},
		{&Float{3.14}, &Float{3.14}, true},
		{&String{"hi"}, &String{"hi"}, true},
		{&String{"hi"}, &String{"bye"}, false},
		{TRUE, TRUE, true},
		{TRUE, FALSE, false},
		{NIL, NIL, true},
		{&Int{42}, &String{"42"}, false},
		{&Range{0, 10}, &Range{0, 10}, true},
		{&Range{0, 10}, &Range{0, 5}, false},
	}
	for _, tc := range tests {
		if tc.a.Equals(tc.b) != tc.expected {
			t.Errorf("%s.Equals(%s) = %v, expected %v", tc.a.Inspect(), tc.b.Inspect(), !tc.expected, tc.expected)
		}
	}
}

func TestArrayEquals(t *testing.T) {
	a := &Array{Elements: []Object{&Int{1}, &Int{2}}}
	b := &Array{Elements: []Object{&Int{1}, &Int{2}}}
	c := &Array{Elements: []Object{&Int{1}, &Int{3}}}
	if !a.Equals(b) {
		t.Error("identical arrays should be equal")
	}
	if a.Equals(c) {
		t.Error("different arrays should not be equal")
	}
}

func TestToFloat(t *testing.T) {
	f, ok := ToFloat(&Int{Value: 42})
	if !ok || f != 42.0 {
		t.Errorf("expected 42.0, got %f", f)
	}
	f2, ok := ToFloat(&Float{Value: 3.14})
	if !ok || f2 != 3.14 {
		t.Errorf("expected 3.14, got %f", f2)
	}
	_, ok = ToFloat(&String{Value: "nope"})
	if ok {
		t.Error("expected false for string")
	}
}

func TestToInt(t *testing.T) {
	i, ok := ToInt(&Int{Value: 42})
	if !ok || i != 42 {
		t.Errorf("expected 42, got %d", i)
	}
	i2, ok := ToInt(&Float{Value: 3.9})
	if !ok || i2 != 3 {
		t.Errorf("expected 3 (truncated), got %d", i2)
	}
}

func TestHashKeyConsistency(t *testing.T) {
	a := &String{Value: "hello"}
	b := &String{Value: "hello"}
	if a.HashKey() != b.HashKey() {
		t.Error("identical strings should have same hash")
	}

	c := &Int{Value: 42}
	d := &Int{Value: 42}
	if c.HashKey() != d.HashKey() {
		t.Error("identical ints should have same hash")
	}
}

func TestReturnValue(t *testing.T) {
	rv := &ReturnValue{Value: &Int{Value: 42}}
	if rv.Type() != TypeReturn {
		t.Errorf("expected 'return', got %q", rv.Type())
	}
	if rv.Inspect() != "42" {
		t.Errorf("expected '42', got %q", rv.Inspect())
	}
}

func TestSignals(t *testing.T) {
	b := &BreakSignal{}
	c := &ContinueSignal{}
	if b.Type() != TypeBreak {
		t.Error("expected break type")
	}
	if c.Type() != TypeContinue {
		t.Error("expected continue type")
	}
}

func TestBuiltinInspect(t *testing.T) {
	b := &Builtin{Name: "len", Fn: func(args ...Object) Object { return NIL }}
	if b.Inspect() != "builtin(len)" {
		t.Errorf("expected 'builtin(len)', got %q", b.Inspect())
	}
}

func TestFnInspect(t *testing.T) {
	fn := &Fn{Name: "add"}
	if fn.Type() != TypeFn {
		t.Errorf("expected 'fn', got %q", fn.Type())
	}
}

func TestFloatHashKeyConsistency(t *testing.T) {
	a := &Float{Value: 3.14}
	b := &Float{Value: 3.14}
	if a.HashKey() != b.HashKey() {
		t.Error("identical floats should have same hash")
	}
	c := &Float{Value: 0.0}
	d := &Float{Value: 1.0}
	if c.HashKey() == d.HashKey() {
		t.Error("different floats should have different hashes")
	}
}

func TestGetByString(t *testing.T) {
	m := NewMap()
	m.SetPair(&String{Value: "name"}, &String{Value: "drift"})
	v, ok := m.GetByString("name")
	if !ok {
		t.Fatal("expected to find key 'name' via GetByString")
	}
	if v.(*String).Value != "drift" {
		t.Errorf("expected 'drift', got %q", v.Inspect())
	}
	_, ok = m.GetByString("missing")
	if ok {
		t.Error("expected not found for missing key")
	}
}

func TestMapDeleteMultiple(t *testing.T) {
	m := NewMap()
	for i := 0; i < 100; i++ {
		m.SetPair(&Int{Value: int64(i)}, &Int{Value: int64(i * 10)})
	}
	for i := 0; i < 50; i++ {
		m.DeletePair(&Int{Value: int64(i)})
	}
	if m.Len() != 50 {
		t.Errorf("expected 50 remaining, got %d", m.Len())
	}
	v, ok := m.GetPair(&Int{Value: 75})
	if !ok || v.(*Int).Value != 750 {
		t.Error("remaining keys should be accessible")
	}
}

func TestArrayHashKeyNoAlloc(t *testing.T) {
	arr := &Array{Elements: []Object{&Int{1}, &Int{2}, &Int{3}}}
	h1 := arr.HashKey()
	h2 := arr.HashKey()
	if h1 != h2 {
		t.Error("hash should be deterministic")
	}
}

func TestMapDeleteNonexistent(t *testing.T) {
	m := NewMap()
	ok := m.DeletePair(&String{Value: "nope"})
	if ok {
		t.Error("expected false for nonexistent key")
	}
}