# Drift

A statically-typed, expression-oriented programming language interpreter written in Go.

Drift combines the simplicity of dynamic languages with the safety of static typing. It features first-class functions, pattern matching, a pipe operator, and a comprehensive standard library — all interpreted through a tree-walking evaluator.

## Features

- **Expression-oriented**: Everything is an expression, including `if/else`, `match`, and ternary `? :`
- **Static typing**: Optional type annotations with type inference
- **Immutability by default**: Variables are immutable unless declared with `mut`; `const` for true constants
- **First-class functions**: Closures, higher-order functions, default parameters
- **Pattern matching**: Exhaustive `match` expressions with wildcard support
- **Pipe operator**: Chain transformations with `|>`
- **Null safety**: Null coalescing `??` for safe defaults
- **typeof operator**: Runtime type inspection with `typeof expr`
- **Error handling**: `try(fn)` for safe error recovery, `assert`/`assert_eq` for testing
- **Rich standard library**: 80+ built-in functions for strings, arrays, maps, math, and functional programming
- **Interactive REPL**: With `:load`, `:type`, `:ast`, `:time` commands

## Quick Start

```bash
# Build
go build -o drift ./cmd/drift

# Run a file
./drift examples/fibonacci.drift

# Start the REPL
./drift
```

## Language Overview

### Variables and Constants

```drift
let x: int = 42          // immutable binding with type
let mut counter = 0       // mutable binding
const PI = 3.14159        // compile-time constant

counter += 1              // OK: mutable
// x = 10                 // Error: immutable
// PI = 3.0               // Error: constant
```

### Functions

```drift
fn fibonacci(n: int) -> int {
    if n <= 1 { n } else { fibonacci(n - 1) + fibonacci(n - 2) }
}

fn greet(name: string) -> string {
    "Hello, " + name + "!"
}

// Higher-order functions
fn apply_twice(f: fn, x: int) -> int { f(f(x)) }
fn double(x: int) -> int { x * 2 }
apply_twice(double, 3)  // => 12
```

### Control Flow

```drift
// If expression (returns a value)
let label = if x > 0 { "positive" } else { "non-positive" }

// Ternary expression
let abs_val = x >= 0 ? x : -x

// While loop
let mut sum = 0
let mut i = 0
while i < 100 {
    sum += i
    i += 1
}

// For-in loop (arrays, ranges, strings)
for item in [1, 2, 3] { println(item) }
for i in 0..10 { println(i) }
for ch in "hello" { print(ch) }
```

### Pattern Matching

```drift
fn fizzbuzz(n: int) -> string {
    match n % 15 {
        0 => "FizzBuzz"
        _ => match n % 3 {
            0 => "Fizz"
            _ => match n % 5 {
                0 => "Buzz"
                _ => str(n)
            }
        }
    }
}
```

### Pipe Operator

```drift
fn double(x: int) -> int { x * 2 }
fn add_one(x: int) -> int { x + 1 }

3 |> double |> add_one |> str  // => "7"
```

### Collections

```drift
// Arrays
let nums = [1, 2, 3, 4, 5]
let doubled = map(nums, fn(x) { x * 2 })
let evens = filter(nums, fn(x) { x % 2 == 0 })
let total = reduce(nums, 0, fn(acc, x) { acc + x })

// Maps
let config = {"host": "localhost", "port": 8080}
let host = config.host          // dot access
let port = config["port"]       // index access

// Null coalescing
let name = config["name"] ?? "default"
```

### Type Operations

```drift
typeof 42           // => "int"
typeof "hello"      // => "string"
typeof [1, 2, 3]    // => "array"

is_int(42)          // => true
is_string(42)       // => false
is_number(3.14)     // => true
```

### Error Handling

```drift
// Safe error recovery
let result = try(fn() { 1 / 0 })
if is_error(result) {
    println("Error: " + error(result))
}

// Assertions
assert(1 + 1 == 2, "basic math")
assert_eq(fibonacci(10), 55, "fibonacci check")
```

## Project Structure

```
Drift/
├── cmd/drift/          # CLI entry point
├── pkg/
│   ├── token/          # Token types and definitions
│   ├── lexer/          # Tokenizer/scanner
│   ├── ast/            # Abstract syntax tree nodes
│   ├── parser/         # Recursive descent + Pratt parser
│   ├── typesys/        # Type system definitions
│   ├── checker/        # Static type checker
│   ├── object/         # Runtime value types
│   ├── evaluator/      # Tree-walking interpreter
│   ├── environ/        # Scope and environment management
│   ├── stdlib/         # Built-in functions (80+ functions)
│   ├── repl/           # Interactive REPL with commands
│   └── errors/         # Rich error types with stack traces
├── examples/           # Sample Drift programs
├── integration/        # Integration tests and benchmarks
└── LANGUAGE.md         # Full language specification
```

## Built-in Functions (80+)

| Category | Functions |
|----------|-----------|
| **Core** | `print`, `println`, `len`, `str`, `int`, `float`, `type`, `typeof` |
| **Type Checks** | `is_int`, `is_float`, `is_string`, `is_bool`, `is_array`, `is_map`, `is_fn`, `is_nil`, `is_number` |
| **Collections** | `push`, `pop`, `keys`, `values`, `contains`, `sum`, `sort`, `sort_by`, `reverse`, `unique` |
| **Array Ops** | `flat`, `enumerate`, `zip`, `chunk`, `take`, `drop`, `slice`, `fill`, `range_array` |
| **Higher-order** | `map`, `filter`, `reduce`, `find`, `find_index`, `every`, `some`, `foreach`, `group_by`, `frequencies` |
| **Functional** | `compose`, `identity`, `always`, `apply`, `tap` |
| **Strings** | `join`, `split`, `trim`, `upper`, `lower`, `replace`, `starts_with`, `ends_with`, `chars`, `lines` |
| **String Ops** | `substring`, `index_of`, `last_index_of`, `repeat`, `count_of`, `char_at`, `pad_left`, `pad_right`, `format` |
| **Maps** | `merge`, `entries`, `from_entries`, `has_key`, `map_values`, `filter_entries` |
| **Math** | `abs`, `max`, `min`, `pow`, `sqrt`, `floor`, `ceil`, `round`, `clamp` |
| **Trig/Log** | `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `log`, `log2`, `log10`, `exp` |
| **Constants** | `PI`, `E`, `INF` |
| **Errors** | `assert`, `assert_eq`, `try`, `is_error`, `error` |
| **Utility** | `is_empty`, `format` |

## REPL Commands

| Command | Description |
|---------|-------------|
| `:help` | Show available commands |
| `:quit` | Exit the REPL |
| `:env` / `:vars` | Show all variables in scope |
| `:reset` | Reset the environment |
| `:clear` | Clear the screen |
| `:load <file>` | Load and execute a .drift file |
| `:type <expr>` | Show the type of an expression |
| `:ast <expr>` | Show the parsed AST |
| `:time <expr>` | Measure execution time |

## Testing

```bash
# Run all tests
go test ./...

# Run with verbose output
go test ./... -v

# Run benchmarks
go test ./integration/ -bench=. -benchmem

# Run specific package tests
go test ./pkg/evaluator/ -v
```

## Examples

See the `examples/` directory for sample programs:
- `fibonacci.drift` — Classic fibonacci with recursion
- `fizzbuzz.drift` — FizzBuzz with pattern matching
- `primes.drift` — Prime number sieve
- `closures.drift` — Closure and counter patterns
- `sort.drift` — Sorting algorithm implementations
- `calculator.drift` — Expression calculator
- `linked_list.drift` — Linked list data structure
- `sorting.drift` — Bubble, quick, merge, insertion sort
- `functional.drift` — Functional programming patterns

## License

MIT