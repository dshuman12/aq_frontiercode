package lexer

import (
	"testing"

	"github.com/Mustafa4ngin/Drift/pkg/token"
)

func TestSingleCharTokens(t *testing.T) {
	input := "+-*/%(){}[],;:"
	expected := []token.Type{
		token.Plus, token.Minus, token.Star, token.Slash, token.Percent,
		token.LParen, token.RParen, token.LBrace, token.RBrace,
		token.LBracket, token.RBracket, token.Comma, token.Semicolon, token.Colon,
		token.EOF,
	}
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, exp := range expected {
		if tokens[i].Type != exp {
			t.Errorf("token[%d]: expected %s, got %s", i, exp, tokens[i].Type)
		}
	}
}

func TestTwoCharOperators(t *testing.T) {
	tests := []struct {
		input string
		typ   token.Type
		lit   string
	}{
		{"==", token.Eq, "=="},
		{"!=", token.NotEq, "!="},
		{"<=", token.LtEq, "<="},
		{">=", token.GtEq, ">="},
		{"&&", token.And, "&&"},
		{"||", token.Or, "||"},
		{"->", token.Arrow, "->"},
		{"=>", token.FatArrow, "=>"},
		{"|>", token.Pipe, "|>"},
		{"..", token.DotDot, ".."},
		{"+=", token.PlusAssign, "+="},
		{"-=", token.MinusAssign, "-="},
		{"*=", token.StarAssign, "*="},
		{"/=", token.SlashAssign, "/="},
	}
	for _, tt := range tests {
		tokens, errs := Tokenize(tt.input)
		if errs.HasErrors() {
			t.Errorf("input %q: unexpected errors: %s", tt.input, errs)
			continue
		}
		if tokens[0].Type != tt.typ {
			t.Errorf("input %q: expected type %s, got %s", tt.input, tt.typ, tokens[0].Type)
		}
		if tokens[0].Literal != tt.lit {
			t.Errorf("input %q: expected literal %q, got %q", tt.input, tt.lit, tokens[0].Literal)
		}
	}
}

func TestIntegerLiterals(t *testing.T) {
	tests := []struct {
		input string
		lit   string
	}{
		{"0", "0"},
		{"42", "42"},
		{"1_000_000", "1_000_000"},
		{"0xff", "0xff"},
		{"0xFF", "0xFF"},
		{"0b1010", "0b1010"},
		{"0B110", "0B110"},
	}
	for _, tt := range tests {
		tokens, errs := Tokenize(tt.input)
		if errs.HasErrors() {
			t.Errorf("input %q: unexpected errors: %s", tt.input, errs)
			continue
		}
		if tokens[0].Type != token.Int {
			t.Errorf("input %q: expected INT, got %s", tt.input, tokens[0].Type)
		}
		if tokens[0].Literal != tt.lit {
			t.Errorf("input %q: expected literal %q, got %q", tt.input, tt.lit, tokens[0].Literal)
		}
	}
}

func TestFloatLiterals(t *testing.T) {
	tests := []struct {
		input string
		lit   string
	}{
		{"3.14", "3.14"},
		{"0.5", "0.5"},
		{"1_000.50", "1_000.50"},
		{"1e10", "1e10"},
		{"2.5e-3", "2.5e-3"},
		{"1E+5", "1E+5"},
	}
	for _, tt := range tests {
		tokens, errs := Tokenize(tt.input)
		if errs.HasErrors() {
			t.Errorf("input %q: unexpected errors: %s", tt.input, errs)
			continue
		}
		if tokens[0].Type != token.Float {
			t.Errorf("input %q: expected FLOAT, got %s", tt.input, tokens[0].Type)
		}
		if tokens[0].Literal != tt.lit {
			t.Errorf("input %q: expected literal %q, got %q", tt.input, tt.lit, tokens[0].Literal)
		}
	}
}

func TestStringLiterals(t *testing.T) {
	tests := []struct {
		input string
		lit   string
	}{
		{`"hello"`, "hello"},
		{`""`, ""},
		{`"hello world"`, "hello world"},
		{`"tab\there"`, "tab\there"},
		{`"new\nline"`, "new\nline"},
		{`"escaped\""`, `escaped"`},
		{`"back\\"`, "back\\"},
		{`"null\0byte"`, "null\x00byte"},
	}
	for _, tt := range tests {
		tokens, errs := Tokenize(tt.input)
		if errs.HasErrors() {
			t.Errorf("input %q: unexpected errors: %s", tt.input, errs)
			continue
		}
		if tokens[0].Type != token.String {
			t.Errorf("input %q: expected STRING, got %s", tt.input, tokens[0].Type)
		}
		if tokens[0].Literal != tt.lit {
			t.Errorf("input %q: expected literal %q, got %q", tt.input, tt.lit, tokens[0].Literal)
		}
	}
}

func TestUnterminatedString(t *testing.T) {
	tokens, errs := Tokenize(`"unterminated`)
	if !errs.HasErrors() {
		t.Fatal("expected error for unterminated string")
	}
	if tokens[0].Type != token.Illegal {
		t.Errorf("expected ILLEGAL token, got %s", tokens[0].Type)
	}
}

func TestStringWithNewline(t *testing.T) {
	input := "\"hello\nworld\""
	_, errs := Tokenize(input)
	if !errs.HasErrors() {
		t.Fatal("expected error for newline in string")
	}
}

func TestKeywords(t *testing.T) {
	tests := []struct {
		input string
		typ   token.Type
	}{
		{"let", token.Let},
		{"mut", token.Mut},
		{"fn", token.Fn},
		{"return", token.Return},
		{"if", token.If},
		{"else", token.Else},
		{"while", token.While},
		{"for", token.For},
		{"in", token.In},
		{"match", token.Match},
		{"break", token.Break},
		{"continue", token.Continue},
		{"true", token.True},
		{"false", token.False},
		{"nil", token.Nil},
	}
	for _, tt := range tests {
		tokens, errs := Tokenize(tt.input)
		if errs.HasErrors() {
			t.Errorf("input %q: unexpected errors", tt.input)
			continue
		}
		if tokens[0].Type != tt.typ {
			t.Errorf("input %q: expected %s, got %s", tt.input, tt.typ, tokens[0].Type)
		}
	}
}

func TestIdentifiers(t *testing.T) {
	tests := []string{"x", "foo", "bar_baz", "_private", "camelCase", "PascalCase", "x1"}
	for _, id := range tests {
		tokens, errs := Tokenize(id)
		if errs.HasErrors() {
			t.Errorf("input %q: unexpected errors", id)
			continue
		}
		if tokens[0].Type != token.Ident {
			t.Errorf("input %q: expected IDENT, got %s", id, tokens[0].Type)
		}
		if tokens[0].Literal != id {
			t.Errorf("input %q: expected literal %q, got %q", id, id, tokens[0].Literal)
		}
	}
}

func TestLineComments(t *testing.T) {
	input := "x // this is a comment\ny"
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	if len(tokens) != 3 { // x, y, EOF
		t.Fatalf("expected 3 tokens, got %d", len(tokens))
	}
	if tokens[0].Literal != "x" {
		t.Errorf("expected 'x', got %q", tokens[0].Literal)
	}
	if tokens[1].Literal != "y" {
		t.Errorf("expected 'y', got %q", tokens[1].Literal)
	}
}

func TestBlockComments(t *testing.T) {
	input := "x /* block comment */ y"
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	if len(tokens) != 3 {
		t.Fatalf("expected 3 tokens, got %d", len(tokens))
	}
	if tokens[0].Literal != "x" || tokens[1].Literal != "y" {
		t.Errorf("expected x and y, got %q and %q", tokens[0].Literal, tokens[1].Literal)
	}
}

func TestNestedBlockComments(t *testing.T) {
	input := "a /* outer /* inner */ still comment */ b"
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	if len(tokens) != 3 {
		t.Fatalf("expected 3 tokens, got %d", len(tokens))
	}
}

func TestTokenPositions(t *testing.T) {
	input := "let x = 42"
	tokens, _ := Tokenize(input)
	if tokens[0].Span.Start.Line != 1 || tokens[0].Span.Start.Column != 1 {
		t.Errorf("'let' position: expected 1:1, got %s", tokens[0].Span.Start)
	}
	if tokens[1].Span.Start.Line != 1 || tokens[1].Span.Start.Column != 5 {
		t.Errorf("'x' position: expected 1:5, got %s", tokens[1].Span.Start)
	}
}

func TestMultilinePositions(t *testing.T) {
	input := "x\ny\nz"
	tokens, _ := Tokenize(input)
	if tokens[0].Span.Start.Line != 1 {
		t.Errorf("'x' line: expected 1, got %d", tokens[0].Span.Start.Line)
	}
	if tokens[1].Span.Start.Line != 2 {
		t.Errorf("'y' line: expected 2, got %d", tokens[1].Span.Start.Line)
	}
	if tokens[2].Span.Start.Line != 3 {
		t.Errorf("'z' line: expected 3, got %d", tokens[2].Span.Start.Line)
	}
}

func TestComplexExpression(t *testing.T) {
	input := "fn fibonacci(n: int) -> int { if n <= 1 { n } else { fibonacci(n - 1) + fibonacci(n - 2) } }"
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	expected := []token.Type{
		token.Fn, token.Ident, token.LParen, token.Ident, token.Colon,
		token.Ident, token.RParen, token.Arrow, token.Ident, token.LBrace,
		token.If, token.Ident, token.LtEq, token.Int, token.LBrace,
		token.Ident, token.RBrace, token.Else, token.LBrace, token.Ident,
		token.LParen, token.Ident, token.Minus, token.Int, token.RParen,
		token.Plus, token.Ident, token.LParen, token.Ident, token.Minus,
		token.Int, token.RParen, token.RBrace, token.RBrace, token.EOF,
	}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, exp := range expected {
		if tokens[i].Type != exp {
			t.Errorf("token[%d]: expected %s, got %s (%q)", i, exp, tokens[i].Type, tokens[i].Literal)
		}
	}
}

func TestLetStatement(t *testing.T) {
	input := `let mut x: int = 42`
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	expected := []token.Type{
		token.Let, token.Mut, token.Ident, token.Colon,
		token.Ident, token.Assign, token.Int, token.EOF,
	}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, exp := range expected {
		if tokens[i].Type != exp {
			t.Errorf("token[%d]: expected %s, got %s", i, exp, tokens[i].Type)
		}
	}
}

func TestPipeOperator(t *testing.T) {
	input := `x |> transform |> filter`
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	expected := []token.Type{
		token.Ident, token.Pipe, token.Ident, token.Pipe, token.Ident, token.EOF,
	}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d", len(expected), len(tokens))
	}
}

func TestMatchExpression(t *testing.T) {
	input := `match x { 0 => "zero" _ => "other" }`
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	expected := []token.Type{
		token.Match, token.Ident, token.LBrace,
		token.Int, token.FatArrow, token.String,
		token.Ident, token.FatArrow, token.String,
		token.RBrace, token.EOF,
	}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d", len(expected), len(tokens))
	}
}

func TestIllegalCharacter(t *testing.T) {
	input := "x @ y"
	tokens, errs := Tokenize(input)
	if !errs.HasErrors() {
		t.Fatal("expected error for illegal character")
	}
	if tokens[1].Type != token.Illegal {
		t.Errorf("expected ILLEGAL, got %s", tokens[1].Type)
	}
}

func TestInvalidEscapeSequence(t *testing.T) {
	input := `"hello\qworld"`
	_, errs := Tokenize(input)
	if !errs.HasErrors() {
		t.Fatal("expected error for invalid escape")
	}
}

func TestEmptyInput(t *testing.T) {
	tokens, errs := Tokenize("")
	if errs.HasErrors() {
		t.Fatal("unexpected errors for empty input")
	}
	if len(tokens) != 1 || tokens[0].Type != token.EOF {
		t.Error("expected single EOF token")
	}
}

func TestWhitespaceOnly(t *testing.T) {
	tokens, errs := Tokenize("   \t\n\r\n   ")
	if errs.HasErrors() {
		t.Fatal("unexpected errors")
	}
	if len(tokens) != 1 || tokens[0].Type != token.EOF {
		t.Error("expected single EOF token")
	}
}

func TestUnicodeIdentifiers(t *testing.T) {
	input := "nombre"
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatal("unexpected errors")
	}
	if tokens[0].Type != token.Ident || tokens[0].Literal != "nombre" {
		t.Errorf("expected IDENT 'nombre', got %s %q", tokens[0].Type, tokens[0].Literal)
	}
}

func TestDotVsDotDot(t *testing.T) {
	input := "a.b 0..10"
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	if tokens[1].Type != token.Dot {
		t.Errorf("expected DOT, got %s", tokens[1].Type)
	}
	if tokens[4].Type != token.DotDot {
		t.Errorf("expected DOTDOT, got %s", tokens[4].Type)
	}
}

func TestAssignVsEq(t *testing.T) {
	input := "x = 5\ny == 10"
	tokens, _ := Tokenize(input)
	if tokens[1].Type != token.Assign {
		t.Errorf("expected ASSIGN, got %s", tokens[1].Type)
	}
	if tokens[4].Type != token.Eq {
		t.Errorf("expected EQ, got %s", tokens[4].Type)
	}
}

func TestConsecutiveOperators(t *testing.T) {
	input := "a+-b"
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	expected := []token.Type{token.Ident, token.Plus, token.Minus, token.Ident, token.EOF}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, exp := range expected {
		if tokens[i].Type != exp {
			t.Errorf("token[%d]: expected %s, got %s", i, exp, tokens[i].Type)
		}
	}
}

func TestArrayLiteral(t *testing.T) {
	input := "[1, 2, 3]"
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatal("unexpected errors")
	}
	expected := []token.Type{
		token.LBracket, token.Int, token.Comma, token.Int, token.Comma,
		token.Int, token.RBracket, token.EOF,
	}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d", len(expected), len(tokens))
	}
}

func TestBangVsNotEq(t *testing.T) {
	input := "!x != y"
	tokens, _ := Tokenize(input)
	if tokens[0].Type != token.Bang {
		t.Errorf("expected BANG, got %s", tokens[0].Type)
	}
	if tokens[2].Type != token.NotEq {
		t.Errorf("expected NOTEQ, got %s", tokens[2].Type)
	}
}

func TestInvalidExponent(t *testing.T) {
	input := "1e"
	_, errs := Tokenize(input)
	if !errs.HasErrors() {
		t.Fatal("expected error for invalid exponent")
	}
}

func TestLonePipe(t *testing.T) {
	input := "x | y"
	_, errs := Tokenize(input)
	if !errs.HasErrors() {
		t.Fatal("expected error for lone pipe")
	}
}

func TestLoneAmpersand(t *testing.T) {
	input := "x & y"
	_, errs := Tokenize(input)
	if !errs.HasErrors() {
		t.Fatal("expected error for lone ampersand")
	}
}

func TestNewTokenTypes(t *testing.T) {
	tests := []struct {
		input string
		typ   token.Type
		lit   string
	}{
		{"?", token.Question, "?"},
		{"??", token.QuestionQuestion, "??"},
		{"?.", token.QuestionDot, "?."},
		{"...", token.Ellipsis, "..."},
		{"const", token.Const, "const"},
		{"typeof", token.Typeof, "typeof"},
	}
	for _, tt := range tests {
		tokens, errs := Tokenize(tt.input)
		if errs.HasErrors() {
			t.Errorf("input %q: unexpected errors: %s", tt.input, errs)
			continue
		}
		if tokens[0].Type != tt.typ {
			t.Errorf("input %q: expected %s, got %s", tt.input, tt.typ, tokens[0].Type)
		}
		if tokens[0].Literal != tt.lit {
			t.Errorf("input %q: expected literal %q, got %q", tt.input, tt.lit, tokens[0].Literal)
		}
	}
}

func TestTernaryTokenSequence(t *testing.T) {
	input := "x ? 1 : 2"
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	expected := []token.Type{
		token.Ident, token.Question, token.Int, token.Colon, token.Int, token.EOF,
	}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, exp := range expected {
		if tokens[i].Type != exp {
			t.Errorf("token[%d]: expected %s, got %s", i, exp, tokens[i].Type)
		}
	}
}

func TestConstDeclaration(t *testing.T) {
	input := "const PI = 3.14"
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	expected := []token.Type{token.Const, token.Ident, token.Assign, token.Float, token.EOF}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d", len(expected), len(tokens))
	}
}

func TestEllipsisVsDotDot(t *testing.T) {
	input := "a..b ...c"
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	if tokens[1].Type != token.DotDot {
		t.Errorf("expected DotDot, got %s", tokens[1].Type)
	}
	if tokens[3].Type != token.Ellipsis {
		t.Errorf("expected Ellipsis, got %s", tokens[3].Type)
	}
}

func TestUnicodeStringContent(t *testing.T) {
	input := `"héllo wörld"`
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	if tokens[0].Literal != "héllo wörld" {
		t.Errorf("expected unicode content, got %q", tokens[0].Literal)
	}
}

func TestMultipleStrings(t *testing.T) {
	input := `"a" + "b" + "c"`
	tokens, errs := Tokenize(input)
	if errs.HasErrors() {
		t.Fatalf("unexpected errors: %s", errs)
	}
	if len(tokens) != 6 { // "a" + "b" + "c" EOF
		t.Fatalf("expected 6 tokens, got %d", len(tokens))
	}
}
