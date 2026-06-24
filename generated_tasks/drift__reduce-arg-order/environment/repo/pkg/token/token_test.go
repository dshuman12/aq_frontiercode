package token

import "testing"

func TestTypeString(t *testing.T) {
	if Plus.String() != "+" { t.Errorf("expected '+', got %q", Plus.String()) }
	if Let.String() != "let" { t.Errorf("expected 'let', got %q", Let.String()) }
	if EOF.String() != "EOF" { t.Errorf("expected 'EOF', got %q", EOF.String()) }
}

func TestLookupIdent(t *testing.T) {
	if LookupIdent("let") != Let { t.Error("expected Let") }
	if LookupIdent("fn") != Fn { t.Error("expected Fn") }
	if LookupIdent("foo") != Ident { t.Error("expected Ident") }
}

func TestIsKeyword(t *testing.T) {
	if !IsKeyword("let") { t.Error("'let' should be keyword") }
	if IsKeyword("foo") { t.Error("'foo' should not be keyword") }
}

func TestPosString(t *testing.T) {
	p := Pos{Line: 1, Column: 5}
	if p.String() != "1:5" { t.Errorf("expected '1:5', got %q", p.String()) }
}

func TestSpanString(t *testing.T) {
	s := Span{Start: Pos{Line: 1, Column: 1}, End: Pos{Line: 1, Column: 5}}
	if s.String() != "1:1-5" { t.Errorf("expected '1:1-5', got %q", s.String()) }
}

func TestTokenIs(t *testing.T) {
	tok := New(Plus, "+", Span{})
	if !tok.Is(Plus) { t.Error("expected Is(Plus) = true") }
	if tok.Is(Minus) { t.Error("expected Is(Minus) = false") }
}

func TestTokenIsOneOf(t *testing.T) {
	tok := New(Plus, "+", Span{})
	if !tok.IsOneOf(Plus, Minus) { t.Error("expected IsOneOf(Plus, Minus) = true") }
	if tok.IsOneOf(Star, Slash) { t.Error("expected IsOneOf(Star, Slash) = false") }
}

func TestIsOperator(t *testing.T) {
	if !IsOperator(Plus) { t.Error("Plus should be operator") }
	if IsOperator(Let) { t.Error("Let should not be operator") }
}

func TestIsComparisonOp(t *testing.T) {
	if !IsComparisonOp(Eq) { t.Error("Eq should be comparison") }
	if IsComparisonOp(Plus) { t.Error("Plus should not be comparison") }
}

func TestIsAssignOp(t *testing.T) {
	if !IsAssignOp(Assign) { t.Error("Assign should be assign op") }
	if !IsAssignOp(PlusAssign) { t.Error("PlusAssign should be assign op") }
	if IsAssignOp(Plus) { t.Error("Plus should not be assign op") }
}