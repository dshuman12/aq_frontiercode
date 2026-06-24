# Drift — Developer Notes

## Overview

Drift is a statically-typed, expression-oriented programming language interpreter written in Go.
It features a Pratt parser, tree-walking evaluator, static type checker, and interactive REPL.

**Language:** Go 1.22  
**Build:** `go build ./cmd/drift/`  
**Test:** `go test ./...`  
**Run:** `./drift` (REPL) or `./drift <file.drift>` (file)  

## Statistics

| Metric | Value |
|--------|-------|
| LOC | ~8,900 |
| Test count | 367 (all passing) |
| Source files | 30 |
| Packages | 12 |
| Commits | 25+ |

## Module Map

### `pkg/token/` — Token Definitions
- `token.go` (~227 lines): Token types (50+ variants), keyword map, Pos/Span types, utility functions
- `token_test.go` (~58 lines): 12 tests

**Key types:** `Type`, `Token`, `Pos`, `Span`  
**Cross-cutting:** Every other package depends on token types and span positions.

### `pkg/errors/` — Error Reporting
- `errors.go` (~195 lines): DriftError with phase/message/span/source/hints, ErrorList, convenience constructors
- `errors_test.go` (~110 lines): 9 tests

**Key types:** `DriftError`, `ErrorList`, `Phase`  
**Cross-cutting:** Used by lexer (LexError), parser (ParseError), checker (TypeError), evaluator (RuntimeError).

### `pkg/lexer/` — Tokenizer
- `lexer.go` (~310 lines): UTF-8 lexer with nested block comments, hex/binary/float literals, escape sequences
- `lexer_test.go` (~380 lines): 30 tests

**Key types:** `Lexer`  
**Dependencies:** token, errors  
**Cross-cutting:** Changing a token type requires updating lexer scanning logic.

### `pkg/ast/` — Abstract Syntax Tree
- `ast.go` (~480 lines): 20+ node types (statements + expressions), generic walker, FindIdents/CountNodes
- `ast_test.go` (~330 lines): 27 tests

**Key types:** `Node`, `Expr`, `Stmt`, `Program`, all concrete node types  
**Cross-cutting:** Adding a new expression type requires changes in parser, checker, and evaluator.

### `pkg/parser/` — Parser
- `parser.go` (~490 lines): Pratt parser with 11 precedence levels, recursive descent for statements
- `precedence.go` (~45 lines): Precedence constants and token-to-precedence mapping
- `parser_test.go` (~410 lines): 45 tests

**Key types:** `Parser`, `Precedence`  
**Dependencies:** token, ast, errors, lexer  
**Cross-cutting:** Operator precedence changes affect all expression evaluation.

### `pkg/typesys/` — Type System
- `types.go` (~168 lines): Type definitions (int, float, string, bool, array, map, fn, any), equality, promotion
- `types_test.go` (~67 lines): 6 tests

**Key types:** `Type`, `Kind`  
**Cross-cutting:** Type changes affect checker validation and evaluator behavior.

### `pkg/checker/` — Static Type Checker
- `checker.go` (~340 lines): Scoped type environment, expression/statement type checking, built-in signatures
- `checker_test.go` (~220 lines): 38 tests

**Dependencies:** ast, errors, token, typesys  
**Cross-cutting:** Adding a built-in function requires updating checker's scope initialization.

### `pkg/environ/` — Environment/Scope
- `environ.go` (~175 lines): Scoped binding system with mutable/immutable, parent lookup, clone, merge
- `environ_test.go` (~245 lines): 22 tests

**Key types:** `Env`, `Binding`, `Value` interface  
**Cross-cutting:** Closure capture, function scope creation, REPL state persistence.

### `pkg/object/` — Runtime Objects
- `object.go` (~370 lines): Int, Float, String, Bool, Nil, Array, Map, Fn, Builtin, Range, signals
- `object_test.go` (~310 lines): 35 tests

**Key types:** `Object` interface, all concrete value types  
**Cross-cutting:** New value types need hash/equality methods and evaluator support.

### `pkg/evaluator/` — Tree-Walking Evaluator
- `evaluator.go` (~520 lines): Full evaluation of all AST nodes, arithmetic, closures, loops, match, pipe
- `evaluator_test.go` (~375 lines): 55 tests

**Dependencies:** ast, environ, object, token  
**Cross-cutting:** The central execution engine — most language changes converge here.

### `pkg/stdlib/` — Standard Library
- `stdlib.go` (~320 lines): Core builtins (print, len, push, pop, contains, sum, map, filter, reduce, sort)
- `strings.go` (~165 lines): String operations (join, split, trim, upper, lower, replace, starts_with, etc.)
- `math.go` (~185 lines): Math operations (abs, max, min, pow, sqrt, floor, ceil, round, clamp)
- `stdlib_test.go` (~285 lines): 42 tests

**Cross-cutting:** Adding builtins requires both stdlib registration and checker signature updates.

### `pkg/repl/` — Interactive REPL
- `repl.go` (~175 lines): Multiline input, commands (:help, :env, :reset), EvalString
- `repl_test.go` (~175 lines): 15 tests

**Dependencies:** parser, checker, evaluator, environ, stdlib

### `cmd/drift/` — CLI Entry Point
- `main.go` (~50 lines): File runner + REPL launcher

### `integration/` — Integration Tests
- `integration_test.go` (~350 lines): 30 end-to-end tests (fibonacci, sort, closures, pipes, etc.)
- `bench_test.go` (~75 lines): 6 benchmarks

## Dependency Chain

```
token ← errors ← lexer ← parser
                     ↓
                    ast ← checker (uses typesys)
                     ↓
          environ ← object ← evaluator ← stdlib ← repl ← main
```

**Critical paths:**
- Adding a new operator: token → lexer → parser → ast → evaluator → checker
- Adding a built-in function: stdlib → checker (signature) → evaluator (if special handling needed)
- Changing type system: typesys → checker → evaluator (runtime type behavior)

## Dockerfile

`environment/Dockerfile` uses `golang:1.22.3-bookworm`. Builds binary and runs all tests.

## Task Writing Notes

- Token types at `pkg/token/token.go:10-55` — all operator/keyword constants
- Keyword map at `pkg/token/token.go:100-115` — string-to-Type mapping
- Precedence table at `pkg/parser/precedence.go:20-40` — controls parse tree shape
- Built-in registrations at `pkg/stdlib/stdlib.go:15-40` and `pkg/checker/checker.go:30-50`
- Evaluator dispatch at `pkg/evaluator/evaluator.go:15-50` — main switch on node type
- Array/Map mutation methods at `pkg/object/object.go:130-190`