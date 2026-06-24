package repl

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/Mustafa4ngin/Drift/pkg/checker"
	"github.com/Mustafa4ngin/Drift/pkg/environ"
	"github.com/Mustafa4ngin/Drift/pkg/evaluator"
	"github.com/Mustafa4ngin/Drift/pkg/object"
	"github.com/Mustafa4ngin/Drift/pkg/parser"
	"github.com/Mustafa4ngin/Drift/pkg/stdlib"
)

const prompt = "drift> "
const continuePrompt = "  ...> "

type REPL struct {
	env    *environ.Env
	writer io.Writer
}

func New(w io.Writer) *REPL {
	env := environ.New()
	stdlib.Register(env)
	stdlib.RegisterEval(evaluator.Eval)
	return &REPL{env: env, writer: w}
}

func (r *REPL) Start(reader io.Reader) {
	scanner := bufio.NewScanner(reader)
	fmt.Fprintf(r.writer, "Drift v0.1.0 — type :help for commands, :quit to exit\n")

	var buffer strings.Builder
	inBlock := false
	var openBraces, openParens, openBrackets int

	for {
		if inBlock {
			fmt.Fprint(r.writer, continuePrompt)
		} else {
			fmt.Fprint(r.writer, prompt)
		}

		if !scanner.Scan() {
			break
		}

		line := scanner.Text()

		if !inBlock && strings.HasPrefix(line, ":") {
			if r.handleCommand(line) {
				break
			}
			continue
		}

		buffer.WriteString(line)
		buffer.WriteString("\n")

		openBraces += strings.Count(line, "{") - strings.Count(line, "}")
		openParens += strings.Count(line, "(") - strings.Count(line, ")")
		openBrackets += strings.Count(line, "[") - strings.Count(line, "]")

		if openBraces > 0 || openParens > 0 || openBrackets > 0 {
			inBlock = true
			continue
		}

		inBlock = false
		openBraces, openParens, openBrackets = 0, 0, 0
		input := buffer.String()
		buffer.Reset()

		if strings.TrimSpace(input) == "" {
			continue
		}

		r.Eval(input)
	}

	fmt.Fprintln(r.writer, "\nBye!")
}

func (r *REPL) Eval(input string) object.Object {
	prog, parseErrs := parser.Parse(input)
	if parseErrs.HasErrors() {
		fmt.Fprintf(r.writer, "%s\n", parseErrs)
		return nil
	}

	typeErrs := checker.Check(prog)
	if typeErrs.HasErrors() {
		fmt.Fprintf(r.writer, "Warning: %s\n", typeErrs)
	}

	result := evaluator.Eval(prog, r.env)
	if result != nil && result.Type() != "nil" && result.Type() != "error" {
		fmt.Fprintf(r.writer, "%s\n", result.Inspect())
	}
	if result != nil && result.Type() == "error" {
		fmt.Fprintf(r.writer, "%s\n", result.Inspect())
	}
	return result
}

func (r *REPL) handleCommand(line string) bool {
	cmd := strings.TrimSpace(line)
	switch cmd {
	case ":quit", ":q", ":exit":
		return true
	case ":help", ":h":
		r.printHelp()
	case ":env":
		r.printEnv()
	case ":reset":
		r.env = environ.New()
		stdlib.Register(r.env)
		stdlib.RegisterEval(evaluator.Eval)
		fmt.Fprintln(r.writer, "Environment reset.")
	case ":clear":
		fmt.Fprintf(r.writer, "\033[2J\033[H")
	case ":vars":
		r.printEnv()
	default:
		if strings.HasPrefix(cmd, ":load ") {
			r.loadFile(strings.TrimPrefix(cmd, ":load "))
			return false
		}
		if strings.HasPrefix(cmd, ":type ") {
			r.showType(strings.TrimPrefix(cmd, ":type "))
			return false
		}
		if strings.HasPrefix(cmd, ":time ") {
			r.timeExpr(strings.TrimPrefix(cmd, ":time "))
			return false
		}
		if strings.HasPrefix(cmd, ":ast ") {
			r.showAST(strings.TrimPrefix(cmd, ":ast "))
			return false
		}
		fmt.Fprintf(r.writer, "Unknown command: %s (type :help for available commands)\n", cmd)
	}
	return false
}

func (r *REPL) printHelp() {
	fmt.Fprintln(r.writer, `Commands:
  :help, :h       Show this help
  :quit, :q       Exit the REPL
  :env, :vars     Show all variables in scope
  :reset          Reset the environment
  :clear          Clear the screen
  :load <file>    Execute a .drift file
  :type <expr>    Show the type of an expression
  :time <expr>    Measure execution time
  :ast <expr>     Show the parsed AST

Language features:
  let x = 42                Variable binding
  let mut y = 0             Mutable variable
  const PI = 3.14           Constant declaration
  fn add(a, b) { a + b }   Function definition
  if cond { a } else { b }  Conditional
  cond ? then : else         Ternary expression
  x ?? default               Null coalescing
  typeof x                   Type inspection
  match x { 1 => ... }      Pattern matching
  x |> f                    Pipe operator
  [1, 2, 3]                 Array literal
  {"a": 1}                  Map literal`)
}

func (r *REPL) printEnv() {
	names := r.env.LocalNames()
	if len(names) == 0 {
		fmt.Fprintln(r.writer, "(no user-defined variables)")
		return
	}
	for _, name := range names {
		val, _ := r.env.Get(name)
		fmt.Fprintf(r.writer, "  %s = %s\n", name, val.Inspect())
	}
}

func (r *REPL) loadFile(path string) {
	path = strings.TrimSpace(path)
	data, err := os.ReadFile(path)
	if err != nil {
		fmt.Fprintf(r.writer, "Error loading file: %s\n", err)
		return
	}
	fmt.Fprintf(r.writer, "Loading %s...\n", path)
	r.Eval(string(data))
}

func (r *REPL) showType(expr string) {
	expr = strings.TrimSpace(expr)
	// Check if it's a variable name
	val, ok := r.env.Get(expr)
	if ok {
		fmt.Fprintf(r.writer, "%s : %s\n", expr, val.Type())
		return
	}
	// Try evaluating the expression
	result := r.Eval(expr)
	if result != nil {
		fmt.Fprintf(r.writer, ": %s\n", result.Type())
	}
}

func (r *REPL) timeExpr(expr string) {
	expr = strings.TrimSpace(expr)
	start := time.Now()
	result := r.Eval(expr)
	elapsed := time.Since(start)
	if result != nil && result.Type() != "nil" {
		fmt.Fprintf(r.writer, "Result: %s\n", result.Inspect())
	}
	fmt.Fprintf(r.writer, "Time: %s\n", elapsed)
}

func (r *REPL) showAST(input string) {
	input = strings.TrimSpace(input)
	prog, errs := parser.Parse(input)
	if errs.HasErrors() {
		fmt.Fprintf(r.writer, "Parse error: %s\n", errs)
		return
	}
	fmt.Fprintf(r.writer, "%s\n", prog.String())
}

func EvalString(input string) (object.Object, string) {
	env := environ.New()
	stdlib.Register(env)
	stdlib.RegisterEval(evaluator.Eval)

	prog, parseErrs := parser.Parse(input)
	if parseErrs.HasErrors() {
		return nil, parseErrs.Error()
	}

	result := evaluator.Eval(prog, env)
	if result != nil && result.Type() == "error" {
		return nil, result.Inspect()
	}
	return result, ""
}
