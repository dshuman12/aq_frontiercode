package typesys

import "testing"

func TestTypeString(t *testing.T) {
	tests := []struct{ typ *Type; expected string }{
		{TInt, "int"},
		{TFloat, "float"},
		{TString, "string"},
		{TBool, "bool"},
		{TNil, "nil"},
		{TVoid, "void"},
		{TAny, "any"},
		{TRange, "range"},
		{ArrayOf(TInt), "[int]"},
		{MapOf(TString, TInt), "map[string]int"},
		{FnType([]*Type{TInt, TInt}, TInt), "fn(int, int) -> int"},
	}
	for _, tc := range tests {
		if s := tc.typ.String(); s != tc.expected {
			t.Errorf("expected %q, got %q", tc.expected, s)
		}
	}
}

func TestTypeEquals(t *testing.T) {
	tests := []struct{ a, b *Type; expected bool }{
		{TInt, TInt, true},
		{TInt, TFloat, false},
		{TAny, TInt, true},
		{TInt, TAny, true},
		{ArrayOf(TInt), ArrayOf(TInt), true},
		{ArrayOf(TInt), ArrayOf(TFloat), false},
		{MapOf(TString, TInt), MapOf(TString, TInt), true},
		{FnType([]*Type{TInt}, TInt), FnType([]*Type{TInt}, TInt), true},
		{FnType([]*Type{TInt}, TInt), FnType([]*Type{TFloat}, TInt), false},
	}
	for _, tc := range tests {
		if tc.a.Equals(tc.b) != tc.expected {
			t.Errorf("%s.Equals(%s): expected %v", tc.a, tc.b, tc.expected)
		}
	}
}

func TestIsNumeric(t *testing.T) {
	if !IsNumeric(TInt) { t.Error("int should be numeric") }
	if !IsNumeric(TFloat) { t.Error("float should be numeric") }
	if IsNumeric(TString) { t.Error("string should not be numeric") }
	if !IsNumeric(TAny) { t.Error("any should be numeric") }
}

func TestIsComparable(t *testing.T) {
	if !IsComparable(TInt) { t.Error("int should be comparable") }
	if !IsComparable(TString) { t.Error("string should be comparable") }
	if IsComparable(TBool) { t.Error("bool should not be comparable") }
}

func TestResolveFromName(t *testing.T) {
	if ResolveFromName("int") != TInt { t.Error("expected TInt") }
	if ResolveFromName("unknown") != TAny { t.Error("expected TAny for unknown") }
}

func TestPromoteNumeric(t *testing.T) {
	if PromoteNumeric(TInt, TInt) != TInt { t.Error("int+int -> int") }
	if PromoteNumeric(TInt, TFloat) != TFloat { t.Error("int+float -> float") }
	if PromoteNumeric(TFloat, TFloat) != TFloat { t.Error("float+float -> float") }
}