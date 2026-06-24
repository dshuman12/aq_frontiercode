package repl

import (
	"bytes"
	"strings"
	"testing"

	"github.com/Mustafa4ngin/Drift/pkg/object"
)

func TestEvalString(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"42", "42"},
		{"1 + 2", "3"},
		{`"hello"`, "hello"},
		{"true", "true"},
		{"nil", "nil"},
	}
	for _, tc := range tests {
		result, errMsg := EvalString(tc.input)
		if errMsg != "" {
			t.Fatalf("input %q: error: %s", tc.input, errMsg)
		}
		if result.Inspect() != tc.expected {
			t.Errorf("input %q: expected %q, got %q", tc.input, tc.expected, result.Inspect())
		}
	}
}

func TestEvalStringError(t *testing.T) {
	_, errMsg := EvalString("1 / 0")
	if errMsg == "" {
		t.Error("expected error for division by zero")
	}
}

func TestEvalStringParseError(t *testing.T) {
	_, errMsg := EvalString("let =")
	if errMsg == "" {
		t.Error("expected parse error")
	}
}

func TestEvalStringWithStdlib(t *testing.T) {
	result, err := EvalString("len([1, 2, 3])")
	if err != "" {
		t.Fatalf("error: %s", err)
	}
	assertInt(t, result, 3)
}

func TestEvalStringFunction(t *testing.T) {
	result, err := EvalString("fn f(x: int) -> int { x * 2 }; f(5)")
	if err != "" {
		t.Fatalf("error: %s", err)
	}
	assertInt(t, result, 10)
}

func TestEvalStringComplex(t *testing.T) {
	input := `
let mut sum = 0
for i in 0..10 {
    sum += i
}
sum
`
	result, err := EvalString(input)
	if err != "" {
		t.Fatalf("error: %s", err)
	}
	assertInt(t, result, 45)
}

func TestREPLQuit(t *testing.T) {
	input := ":quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "Bye!") {
		t.Error("expected 'Bye!' on quit")
	}
}

func TestREPLHelp(t *testing.T) {
	input := ":help\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "Commands:") {
		t.Error("expected help output")
	}
}

func TestREPLExpression(t *testing.T) {
	input := "42\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "42") {
		t.Error("expected '42' in output")
	}
}

func TestREPLEnv(t *testing.T) {
	input := "let x = 42\n:env\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "x = 42") {
		t.Errorf("expected 'x = 42' in output, got: %s", output.String())
	}
}

func TestREPLReset(t *testing.T) {
	input := "let x = 42\n:reset\n:env\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "Environment reset") {
		t.Error("expected reset message")
	}
}

func TestREPLMultiline(t *testing.T) {
	input := "fn f(x: int) -> int {\n  x * 2\n}\nf(5)\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "10") {
		t.Errorf("expected '10' in output, got: %s", output.String())
	}
}

func TestREPLUnknownCommand(t *testing.T) {
	input := ":unknown\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "Unknown command") {
		t.Error("expected unknown command message")
	}
}

func TestREPLEmptyInput(t *testing.T) {
	input := "\n\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "Bye!") {
		t.Error("expected clean exit")
	}
}

func TestREPLParseError(t *testing.T) {
	input := "let =\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "ParseError") {
		t.Error("expected parse error in output")
	}
}

func TestREPLMultilineDeepNesting(t *testing.T) {
	input := "if true {\n  if true {\n    42\n  }\n}\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "42") {
		t.Errorf("expected '42' in deep nesting output, got: %s", output.String())
	}
}

func TestEvalStringUnicode(t *testing.T) {
	result, err := EvalString(`len("héllo")`)
	if err != "" {
		t.Fatalf("error: %s", err)
	}
	assertInt(t, result, 5)
}

func TestREPLTypeCommand(t *testing.T) {
	input := "let x = 42\n:type x\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "int") {
		t.Errorf("expected 'int' in type output, got: %s", output.String())
	}
}

func TestREPLASTCommand(t *testing.T) {
	input := ":ast 1 + 2\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "+") {
		t.Errorf("expected AST output with '+', got: %s", output.String())
	}
}

func TestREPLTimeCommand(t *testing.T) {
	input := ":time 1 + 2\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "Time:") {
		t.Errorf("expected 'Time:' in output, got: %s", output.String())
	}
}

func TestREPLVarsAlias(t *testing.T) {
	input := "let y = 99\n:vars\n:quit\n"
	var output bytes.Buffer
	r := New(&output)
	r.Start(strings.NewReader(input))
	if !strings.Contains(output.String(), "y = 99") {
		t.Errorf("expected 'y = 99' in vars output, got: %s", output.String())
	}
}

func TestEvalStringConst(t *testing.T) {
	result, err := EvalString("const x = 42; x")
	if err != "" {
		t.Fatalf("error: %s", err)
	}
	assertInt(t, result, 42)
}

func TestEvalStringTernary(t *testing.T) {
	result, err := EvalString("true ? 10 : 20")
	if err != "" {
		t.Fatalf("error: %s", err)
	}
	assertInt(t, result, 10)
}

func assertInt(t *testing.T, obj object.Object, expected int64) {
	t.Helper()
	i, ok := obj.(*object.Int)
	if !ok {
		t.Fatalf("expected Int, got %T: %s", obj, obj.Inspect())
	}
	if i.Value != expected {
		t.Errorf("expected %d, got %d", expected, i.Value)
	}
}