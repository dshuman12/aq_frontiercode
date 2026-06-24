package main

import (
	"fmt"
	"os"

	"github.com/Mustafa4ngin/Drift/pkg/checker"
	"github.com/Mustafa4ngin/Drift/pkg/environ"
	"github.com/Mustafa4ngin/Drift/pkg/evaluator"
	"github.com/Mustafa4ngin/Drift/pkg/parser"
	"github.com/Mustafa4ngin/Drift/pkg/repl"
	"github.com/Mustafa4ngin/Drift/pkg/stdlib"
)

func main() {
	if len(os.Args) < 2 {
		r := repl.New(os.Stdout)
		r.Start(os.Stdin)
		return
	}

	filename := os.Args[1]
	data, err := os.ReadFile(filename)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading file: %s\n", err)
		os.Exit(1)
	}

	input := string(data)
	prog, parseErrs := parser.Parse(input)
	if parseErrs.HasErrors() {
		fmt.Fprintln(os.Stderr, parseErrs)
		os.Exit(1)
	}

	typeErrs := checker.Check(prog)
	if typeErrs.HasErrors() {
		fmt.Fprintf(os.Stderr, "Type warnings:\n%s\n", typeErrs)
	}

	env := environ.New()
	stdlib.Register(env)
	stdlib.RegisterEval(evaluator.Eval)
	result := evaluator.Eval(prog, env)
	if result != nil && result.Type() == "error" {
		fmt.Fprintln(os.Stderr, result.Inspect())
		os.Exit(1)
	}
}