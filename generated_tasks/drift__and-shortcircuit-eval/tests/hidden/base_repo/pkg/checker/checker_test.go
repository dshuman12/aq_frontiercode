package checker

import (
	"testing"

	"github.com/Mustafa4ngin/Drift/pkg/parser"
)

func checkOK(t *testing.T, input string) {
	t.Helper()
	prog, perrs := parser.Parse(input)
	if perrs.HasErrors() {
		t.Fatalf("parse error: %s", perrs)
	}
	errs := Check(prog)
	if errs.HasErrors() {
		t.Fatalf("type errors for %q:\n%s", input, errs)
	}
}

func checkFail(t *testing.T, input string) {
	t.Helper()
	prog, perrs := parser.Parse(input)
	if perrs.HasErrors() {
		t.Fatalf("parse error: %s", perrs)
	}
	errs := Check(prog)
	if !errs.HasErrors() {
		t.Fatalf("expected type error for %q", input)
	}
}

func TestCheckIntLiteral(t *testing.T) {
	checkOK(t, "42")
}

func TestCheckFloatLiteral(t *testing.T) {
	checkOK(t, "3.14")
}

func TestCheckStringLiteral(t *testing.T) {
	checkOK(t, `"hello"`)
}

func TestCheckBoolLiteral(t *testing.T) {
	checkOK(t, "true")
	checkOK(t, "false")
}

func TestCheckNilLiteral(t *testing.T) {
	checkOK(t, "nil")
}

func TestCheckLetBinding(t *testing.T) {
	checkOK(t, "let x = 42")
}

func TestCheckLetWithTypeAnnotation(t *testing.T) {
	checkOK(t, "let x: int = 42")
}

func TestCheckLetTypeMismatch(t *testing.T) {
	checkFail(t, `let x: int = "hello"`)
}

func TestCheckArithmetic(t *testing.T) {
	checkOK(t, "1 + 2")
	checkOK(t, "1.0 + 2.0")
	checkOK(t, "1 + 2.0")
}

func TestCheckStringConcat(t *testing.T) {
	checkOK(t, `"a" + "b"`)
}

func TestCheckStringArithmeticError(t *testing.T) {
	checkFail(t, `"a" - "b"`)
}

func TestCheckComparison(t *testing.T) {
	checkOK(t, "1 < 2")
	checkOK(t, `"a" < "b"`)
	checkOK(t, "1 == 2")
}

func TestCheckLogical(t *testing.T) {
	checkOK(t, "true && false")
	checkOK(t, "true || false")
	checkOK(t, "!true")
}

func TestCheckUndefinedVariable(t *testing.T) {
	checkFail(t, "x")
}

func TestCheckVariableAfterLet(t *testing.T) {
	checkOK(t, "let x = 42; x + 1")
}

func TestCheckNegateNonNumeric(t *testing.T) {
	checkFail(t, `-"hello"`)
}

func TestCheckNegateNumeric(t *testing.T) {
	checkOK(t, "-42")
	checkOK(t, "-3.14")
}

func TestCheckIfExpr(t *testing.T) {
	checkOK(t, "if true { 1 } else { 2 }")
}

func TestCheckWhileStmt(t *testing.T) {
	checkOK(t, "let mut x = 0; while x < 5 { x += 1 }")
}

func TestCheckForStmt(t *testing.T) {
	checkOK(t, "for i in 0..10 { i }")
}

func TestCheckForArray(t *testing.T) {
	checkOK(t, "for x in [1, 2, 3] { x + 1 }")
}

func TestCheckFunction(t *testing.T) {
	checkOK(t, "fn add(a: int, b: int) -> int { a + b }")
}

func TestCheckFunctionCall(t *testing.T) {
	checkOK(t, "fn add(a: int, b: int) -> int { a + b }; add(1, 2)")
}

func TestCheckArray(t *testing.T) {
	checkOK(t, "[1, 2, 3]")
	checkOK(t, `["a", "b"]`)
}

func TestCheckArrayIndex(t *testing.T) {
	checkOK(t, "let a = [1, 2]; a[0]")
}

func TestCheckArrayIndexWithString(t *testing.T) {
	checkFail(t, `let a = [1, 2]; a["bad"]`)
}

func TestCheckMap(t *testing.T) {
	checkOK(t, `{"a": 1, "b": 2}`)
}

func TestCheckMatchExpr(t *testing.T) {
	checkOK(t, `let x = 1; match x { 1 => "one"; _ => "other" }`)
}

func TestCheckPipe(t *testing.T) {
	checkOK(t, "fn double(x: int) -> int { x * 2 }; 5 |> double")
}

func TestCheckRange(t *testing.T) {
	checkOK(t, "0..10")
}

func TestCheckRangeWithString(t *testing.T) {
	checkFail(t, `"a".."z"`)
}

func TestCheckBuiltinPrint(t *testing.T) {
	checkOK(t, `print("hello")`)
}

func TestCheckBuiltinLen(t *testing.T) {
	checkOK(t, `len([1, 2, 3])`)
}

func TestCheckDotLength(t *testing.T) {
	checkOK(t, "[1, 2, 3].length")
}

func TestCheckStringIndex(t *testing.T) {
	checkOK(t, `"hello"[0]`)
}

func TestCheckAssign(t *testing.T) {
	checkOK(t, "let mut x = 0; x = 1")
}

func TestCheckCompoundAssign(t *testing.T) {
	checkOK(t, "let mut x = 0; x += 1")
}

func TestCheckNestedScopes(t *testing.T) {
	checkOK(t, `
fn outer(a: int) -> fn {
    fn(b: int) -> int { a + b }
}
`)
}

func TestCheckComplexProgram(t *testing.T) {
	checkOK(t, `
fn fibonacci(n: int) -> int {
    if n <= 1 { n } else { fibonacci(n - 1) + fibonacci(n - 2) }
}
let result = fibonacci(10)
`)
}

func TestCheckBreakContinue(t *testing.T) {
	checkOK(t, "while true { break }")
	checkOK(t, "for i in 0..5 { continue }")
}

func TestCheckReturn(t *testing.T) {
	checkOK(t, "fn foo() -> int { return 42 }")
}

func TestCheckEmptyReturn(t *testing.T) {
	checkOK(t, "fn foo() { return }")
}

func TestCheckMultipleErrors(t *testing.T) {
	prog, _ := parser.Parse("x + y")
	errs := Check(prog)
	if errs.Count() < 2 {
		t.Errorf("expected at least 2 errors, got %d", errs.Count())
	}
}
