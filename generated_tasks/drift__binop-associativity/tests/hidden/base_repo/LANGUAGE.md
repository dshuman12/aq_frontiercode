# Drift Language Specification

## Overview

Drift is a dynamically-typed, expression-oriented programming language with first-class functions, closures, and a rich standard library. It features a clean syntax inspired by Rust and JavaScript.

## Types

| Type    | Example           | Description                 |
|---------|-------------------|-----------------------------|
| `int`   | `42`, `0xff`      | 64-bit signed integer       |
| `float` | `3.14`, `1e-5`    | 64-bit IEEE 754             |
| `string`| `"hello"`         | UTF-8 string                |
| `bool`  | `true`, `false`   | Boolean                     |
| `nil`   | `nil`             | Absence of value            |
| `array` | `[1, 2, 3]`       | Ordered, growable sequence  |
| `map`   | `{"a": 1}`        | Ordered key-value store     |
| `fn`    | `fn(x) { x + 1 }`| First-class function        |
| `range` | `0..10`           | Integer range (exclusive)   |

## Variables

```drift
let x = 42              // immutable binding
let mut y = 0           // mutable binding
const PI = 3.14159      // constant (immutable)
```

## Operators

### Arithmetic
`+`, `-`, `*`, `/`, `%`

### Comparison
`==`, `!=`, `<`, `>`, `<=`, `>=`

### Logical
`&&`, `||`, `!`

### Assignment
`=`, `+=`, `-=`, `*=`, `/=`

### Special
- `|>` — pipe operator: `x |> f` is equivalent to `f(x)`
- `..` — range: `0..10` creates range from 0 to 9
- `?` `:` — ternary: `cond ? then : else`
- `??` — null coalescing: `expr ?? default`
- `typeof` — type inspection: `typeof expr` returns type name

## String Operations

```drift
"hello" + " world"     // concatenation
"abc" * 3              // repetition → "abcabcabc"
"hello"[0]             // indexing → "h"
"hello".length         // length → 5
```

## Control Flow

### If/Else (expression)
```drift
let result = if x > 0 { "positive" } else { "non-positive" }
```

### Ternary
```drift
let sign = x > 0 ? 1 : -1
```

### While Loop
```drift
while condition { body }
```

### For Loop
```drift
for item in collection { body }
for i in 0..10 { body }
for ch in "hello" { body }
```

### Match Expression
```drift
match value {
    1 => "one"
    2 => "two"
    _ => "other"
}
```

### Break/Continue
```drift
while true {
    if done { break }
    if skip { continue }
}
```

## Functions

```drift
fn add(a, b) { a + b }
fn greet(name: string) -> string { "Hello " + name }
let lambda = fn(x) { x * 2 }
```

## Pipe Operator

```drift
let result = data
    |> fn(x) { filter(x, fn(v) { v > 0 }) }
    |> fn(x) { map(x, fn(v) { v * 2 }) }
    |> sum
```

## Standard Library

### I/O
`print`, `println`

### Type Conversion
`str`, `int`, `float`, `type`, `typeof`

### Type Checking
`is_int`, `is_float`, `is_string`, `is_bool`, `is_array`, `is_map`, `is_fn`, `is_nil`, `is_number`

### Arrays
`len`, `push`, `pop`, `sort`, `sort_by`, `reverse`, `flat`, `unique`, `take`, `drop`, `slice`, `chunk`, `zip`, `enumerate`, `fill`, `range_array`

### Functional
`map`, `filter`, `reduce`, `find`, `find_index`, `every`, `some`, `foreach`, `compose`, `identity`, `always`, `apply`, `tap`

### Maps
`keys`, `values`, `contains`, `has_key`, `merge`, `entries`, `from_entries`, `map_values`, `filter_entries`

### Strings
`join`, `split`, `trim`, `upper`, `lower`, `replace`, `starts_with`, `ends_with`, `chars`, `substring`, `index_of`, `last_index_of`, `repeat`, `count_of`, `char_at`, `pad_left`, `pad_right`, `is_empty`, `lines`, `format`

### Math
`abs`, `max`, `min`, `pow`, `sqrt`, `floor`, `ceil`, `round`, `clamp`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `log`, `log2`, `log10`, `exp`, `random`

### Constants
`PI`, `E`, `INF`

### Data
`sum`, `frequencies`, `group_by`

### Error Handling
`assert`, `assert_eq`, `try`, `error`, `is_error`