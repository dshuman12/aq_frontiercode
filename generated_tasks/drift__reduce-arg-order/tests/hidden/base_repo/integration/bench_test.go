package integration

import (
	"testing"

	"github.com/Mustafa4ngin/Drift/pkg/environ"
	"github.com/Mustafa4ngin/Drift/pkg/evaluator"
	"github.com/Mustafa4ngin/Drift/pkg/lexer"
	"github.com/Mustafa4ngin/Drift/pkg/parser"
	"github.com/Mustafa4ngin/Drift/pkg/stdlib"
)

func BenchmarkLexer(b *testing.B) {
	input := `fn fibonacci(n: int) -> int { if n <= 1 { n } else { fibonacci(n - 1) + fibonacci(n - 2) } }`
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		lexer.Tokenize(input)
	}
}

func BenchmarkParser(b *testing.B) {
	input := `fn fibonacci(n: int) -> int { if n <= 1 { n } else { fibonacci(n - 1) + fibonacci(n - 2) } }`
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		parser.Parse(input)
	}
}

func BenchmarkEvalArithmetic(b *testing.B) {
	input := `1 + 2 * 3 - 4 / 2 + 10 % 3`
	prog, _ := parser.Parse(input)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		env := environ.New()
		evaluator.Eval(prog, env)
	}
}

func BenchmarkFibonacci15(b *testing.B) {
	input := `fn fib(n: int) -> int { if n <= 1 { n } else { fib(n - 1) + fib(n - 2) } }; fib(15)`
	prog, _ := parser.Parse(input)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		env := environ.New()
		stdlib.Register(env)
		stdlib.RegisterEval(evaluator.Eval)
		evaluator.Eval(prog, env)
	}
}

func BenchmarkLoopSum(b *testing.B) {
	input := `let mut sum = 0; let mut i = 0; while i < 1000 { sum += i; i += 1 }; sum`
	prog, _ := parser.Parse(input)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		env := environ.New()
		evaluator.Eval(prog, env)
	}
}

func BenchmarkArrayOperations(b *testing.B) {
	input := `let a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; sum(a)`
	prog, _ := parser.Parse(input)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		env := environ.New()
		stdlib.Register(env)
		stdlib.RegisterEval(evaluator.Eval)
		evaluator.Eval(prog, env)
	}
}

func BenchmarkStringConcat(b *testing.B) {
	input := `let mut s = ""; let mut i = 0; while i < 100 { s = s + "x"; i += 1 }; len(s)`
	prog, _ := parser.Parse(input)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		env := environ.New()
		stdlib.Register(env)
		stdlib.RegisterEval(evaluator.Eval)
		evaluator.Eval(prog, env)
	}
}

func BenchmarkMapOperations(b *testing.B) {
	input := `let m = {"a": 1, "b": 2, "c": 3, "d": 4, "e": 5}; m["c"] + m["e"]`
	prog, _ := parser.Parse(input)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		env := environ.New()
		evaluator.Eval(prog, env)
	}
}

func BenchmarkClosureCreation(b *testing.B) {
	input := `fn make(x) { fn(y) { x + y } }; let f = make(10); f(20)`
	prog, _ := parser.Parse(input)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		env := environ.New()
		evaluator.Eval(prog, env)
	}
}

func BenchmarkTernary(b *testing.B) {
	input := `let mut sum = 0; let mut i = 0; while i < 100 { sum += (i % 2 == 0) ? i : 0; i += 1 }; sum`
	prog, _ := parser.Parse(input)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		env := environ.New()
		evaluator.Eval(prog, env)
	}
}

func BenchmarkNullCoalesce(b *testing.B) {
	input := `let mut sum = 0; let mut i = 0; while i < 100 { let v = nil ?? i; sum += v; i += 1 }; sum`
	prog, _ := parser.Parse(input)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		env := environ.New()
		evaluator.Eval(prog, env)
	}
}

func BenchmarkMatchExpression(b *testing.B) {
	input := `
let mut sum = 0
let mut i = 0
while i < 100 {
    sum += match i % 4 {
        0 => 1
        1 => 2
        2 => 3
        _ => 4
    }
    i += 1
}
sum`
	prog, _ := parser.Parse(input)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		env := environ.New()
		evaluator.Eval(prog, env)
	}
}

func BenchmarkLexerLargeInput(b *testing.B) {
	// Build a large input string
	input := ""
	for i := 0; i < 100; i++ {
		input += "let x = 42 + 3 * (10 - 2); "
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		lexer.Tokenize(input)
	}
}

func BenchmarkParserLargeInput(b *testing.B) {
	input := ""
	for i := 0; i < 50; i++ {
		input += "let x = 42 + 3 * (10 - 2); "
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		parser.Parse(input)
	}
}