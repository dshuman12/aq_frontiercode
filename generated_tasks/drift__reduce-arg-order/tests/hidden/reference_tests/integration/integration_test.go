package integration

import (
	"testing"

	"github.com/Mustafa4ngin/Drift/pkg/environ"
	"github.com/Mustafa4ngin/Drift/pkg/evaluator"
	"github.com/Mustafa4ngin/Drift/pkg/object"
	"github.com/Mustafa4ngin/Drift/pkg/parser"
	"github.com/Mustafa4ngin/Drift/pkg/stdlib"
)

func run(input string) object.Object {
	prog, errs := parser.Parse(input)
	if errs.HasErrors() {
		return &object.String{Value: "PARSE ERROR: " + errs.Error()}
	}
	env := environ.New()
	stdlib.Register(env)
	stdlib.RegisterEval(evaluator.Eval)
	return evaluator.Eval(prog, env)
}

func assertIntResult(t *testing.T, input string, expected int64) {
	t.Helper()
	result := run(input)
	i, ok := result.(*object.Int)
	if !ok {
		t.Fatalf("expected Int, got %T: %s\ninput: %s", result, result.Inspect(), input)
	}
	if i.Value != expected {
		t.Errorf("expected %d, got %d\ninput: %s", expected, i.Value, input)
	}
}

func assertStrResult(t *testing.T, input string, expected string) {
	t.Helper()
	result := run(input)
	s, ok := result.(*object.String)
	if !ok {
		t.Fatalf("expected String, got %T: %s\ninput: %s", result, result.Inspect(), input)
	}
	if s.Value != expected {
		t.Errorf("expected %q, got %q\ninput: %s", expected, s.Value, input)
	}
}

func assertBoolResult(t *testing.T, input string, expected bool) {
	t.Helper()
	result := run(input)
	b, ok := result.(*object.Bool)
	if !ok {
		t.Fatalf("expected Bool, got %T: %s\ninput: %s", result, result.Inspect(), input)
	}
	if b.Value != expected {
		t.Errorf("expected %v, got %v\ninput: %s", expected, b.Value, input)
	}
}

func TestFibonacci(t *testing.T) {
	assertIntResult(t, `
fn fib(n: int) -> int {
    if n <= 1 { n } else { fib(n - 1) + fib(n - 2) }
}
fib(15)
`, 610)
}

func TestFactorial(t *testing.T) {
	assertIntResult(t, `
fn factorial(n: int) -> int {
    if n <= 1 { 1 } else { n * factorial(n - 1) }
}
factorial(10)
`, 3628800)
}

func TestGCD(t *testing.T) {
	assertIntResult(t, `
fn gcd(a: int, b: int) -> int {
    if b == 0 { a } else { gcd(b, a % b) }
}
gcd(48, 18)
`, 6)
}

func TestIsPrime(t *testing.T) {
	assertBoolResult(t, `
fn is_prime(n: int) -> bool {
    if n < 2 { return false }
    let mut i = 2
    while i * i <= n {
        if n % i == 0 { return false }
        i += 1
    }
    true
}
is_prime(97)
`, true)

	assertBoolResult(t, `
fn is_prime(n: int) -> bool {
    if n < 2 { return false }
    let mut i = 2
    while i * i <= n {
        if n % i == 0 { return false }
        i += 1
    }
    true
}
is_prime(100)
`, false)
}

func TestBubbleSort(t *testing.T) {
	assertIntResult(t, `
fn bubble_sort(arr: [int]) -> [int] {
    let n = len(arr)
    let mut i = 0
    while i < n {
        let mut j = 0
        while j < n - i - 1 {
            if arr[j] > arr[j + 1] {
                let tmp = arr[j]
                arr[j] = arr[j + 1]
                arr[j + 1] = tmp
            }
            j += 1
        }
        i += 1
    }
    arr
}
let sorted = bubble_sort([5, 3, 8, 1, 9, 2])
sorted[0]
`, 1)
}

func TestClosureCounter(t *testing.T) {
	assertIntResult(t, `
fn make_counter() -> fn {
    let mut count = 0
    fn() -> int {
        count += 1
        count
    }
}
let counter = make_counter()
counter()
counter()
counter()
`, 3)
}

func TestHigherOrderFunctions(t *testing.T) {
	assertIntResult(t, `
fn apply_twice(f: fn, x: int) -> int {
    f(f(x))
}
fn double(x: int) -> int { x * 2 }
apply_twice(double, 3)
`, 12)
}

func TestPipeChain(t *testing.T) {
	assertIntResult(t, `
fn double(x: int) -> int { x * 2 }
fn add_one(x: int) -> int { x + 1 }
fn square(x: int) -> int { x * x }
3 |> double |> add_one |> square
`, 49)
}

func TestMatchFizzBuzz(t *testing.T) {
	assertStrResult(t, `
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
fizzbuzz(15)
`, "FizzBuzz")
}

func TestArrayOperations(t *testing.T) {
	assertIntResult(t, `
let a = [1, 2, 3, 4, 5]
let total = sum(a)
let n = len(a)
total * n
`, 75)
}

func TestMapOperations(t *testing.T) {
	assertIntResult(t, `
let m = {"a": 1, "b": 2, "c": 3}
let k = keys(m)
len(k)
`, 3)
}

func TestStringBuilding(t *testing.T) {
	assertStrResult(t, `
let words = ["hello", "beautiful", "world"]
join(words, " ")
`, "hello beautiful world")
}

func TestNestedDataStructures(t *testing.T) {
	assertIntResult(t, `
let matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
matrix[1][1]
`, 5)
}

func TestRecursiveSum(t *testing.T) {
	assertIntResult(t, `
fn sum_list(arr: [int], idx: int) -> int {
    if idx >= len(arr) { 0 }
    else { arr[idx] + sum_list(arr, idx + 1) }
}
sum_list([1, 2, 3, 4, 5], 0)
`, 15)
}

func TestMathFunctions(t *testing.T) {
	assertIntResult(t, `abs(-42)`, 42)
	assertIntResult(t, `max(10, 20)`, 20)
	assertIntResult(t, `min(10, 20)`, 10)
	assertIntResult(t, `pow(2, 8)`, 256)
	assertIntResult(t, `floor(3.7)`, 3)
	assertIntResult(t, `ceil(3.2)`, 4)
	assertIntResult(t, `round(3.5)`, 4)
	assertIntResult(t, `clamp(15, 0, 10)`, 10)
}

func TestStringFunctions(t *testing.T) {
	assertStrResult(t, `upper("hello")`, "HELLO")
	assertStrResult(t, `lower("HELLO")`, "hello")
	assertStrResult(t, `trim("  hello  ")`, "hello")
	assertStrResult(t, `replace("hello world", "world", "Go")`, "hello Go")
	assertBoolResult(t, `starts_with("hello", "hel")`, true)
	assertBoolResult(t, `ends_with("hello", "llo")`, true)
}

func TestForEachPattern(t *testing.T) {
	assertIntResult(t, `
let mut total = 0
let items = [10, 20, 30, 40, 50]
for item in items {
    total += item
}
total
`, 150)
}

func TestWhileWithBreak(t *testing.T) {
	assertIntResult(t, `
let mut sum = 0
let mut n = 1
while true {
    sum += n
    if sum > 100 { break }
    n += 1
}
n
`, 14)
}

func TestScopeIsolation(t *testing.T) {
	assertIntResult(t, `
let x = 10
fn modify() -> int {
    let x = 20
    x
}
modify() + x
`, 30)
}

func TestMutualRecursion(t *testing.T) {
	assertBoolResult(t, `
fn is_even(n: int) -> bool {
    if n == 0 { true } else { is_odd(n - 1) }
}
fn is_odd(n: int) -> bool {
    if n == 0 { false } else { is_even(n - 1) }
}
is_even(10)
`, true)
}

func TestComplexPipe(t *testing.T) {
	assertIntResult(t, `
fn inc(x: int) -> int { x + 1 }
fn dbl(x: int) -> int { x * 2 }
let result = 1 |> inc |> dbl |> inc |> dbl
result
`, 10)
}

func TestNegativeArrayIndex(t *testing.T) {
	assertIntResult(t, `
let a = [10, 20, 30, 40, 50]
a[-1] + a[-2]
`, 90)
}

func TestMatchWithExpressions(t *testing.T) {
	assertIntResult(t, `
let x = 3
match x {
    1 => 100
    2 => 200
    3 => 300
    _ => 0
}
`, 300)
}

func TestRangeIteration(t *testing.T) {
	assertIntResult(t, `
let mut product = 1
for i in 1..6 {
    product *= i
}
product
`, 120)
}

func TestContainsWithMap(t *testing.T) {
	assertBoolResult(t, `
let config = {"debug": true, "verbose": false}
contains(config, "debug")
`, true)
}

func TestSortAndReverse(t *testing.T) {
	assertIntResult(t, `
let arr = [5, 2, 8, 1, 9]
let sorted_arr = sort(arr)
let rev = reverse(sorted_arr)
rev[0]
`, 9)
}

func TestSumOfSquares(t *testing.T) {
	assertIntResult(t, `
let mut total = 0
for i in 1..11 {
    total += i * i
}
total
`, 385)
}

func TestMapFnCallback(t *testing.T) {
	assertIntResult(t, `
let arr = [1, 2, 3, 4, 5]
let doubled = map(arr, fn(x) { x * 2 })
sum(doubled)
`, 30)
}

func TestFilterFnCallback(t *testing.T) {
	assertIntResult(t, `
let arr = [1, 2, 3, 4, 5, 6]
let evens = filter(arr, fn(x) { x % 2 == 0 })
sum(evens)
`, 12)
}

func TestReduceFnCallback(t *testing.T) {
	assertIntResult(t, `
let arr = [1, 2, 3, 4, 5]
reduce(arr, 0, fn(acc, x) { acc + x })
`, 15)
}

func TestDotAccessInLoop(t *testing.T) {
	assertIntResult(t, `
let m = {"val": 10}
let mut total = 0
for i in 0..100 {
    total += m.val
}
total
`, 1000)
}

func TestConstDeclaration(t *testing.T) {
	assertIntResult(t, `const x = 42; x`, 42)
}

func TestTypeofOperator(t *testing.T) {
	assertStrResult(t, `typeof 42`, "int")
	assertStrResult(t, `typeof "hi"`, "string")
	assertStrResult(t, `typeof [1,2]`, "array")
	assertStrResult(t, `typeof true`, "bool")
	assertStrResult(t, `typeof nil`, "nil")
}

func TestTernaryExpression(t *testing.T) {
	assertIntResult(t, `5 > 3 ? 100 : 200`, 100)
	assertIntResult(t, `1 == 2 ? 10 : 20`, 20)
	assertStrResult(t, `true ? "yes" : "no"`, "yes")
}

func TestNullCoalescing(t *testing.T) {
	assertIntResult(t, `nil ?? 42`, 42)
	assertIntResult(t, `10 ?? 42`, 10)
	assertStrResult(t, `nil ?? nil ?? "fallback"`, "fallback")
}

func TestStringMultiplication(t *testing.T) {
	assertStrResult(t, `"ha" * 3`, "hahaha")
	assertStrResult(t, `3 * "abc"`, "abcabcabc")
}

func TestFormatFunction(t *testing.T) {
	assertStrResult(t, `format("Hello {0}!", "World")`, "Hello World!")
	assertStrResult(t, `format("{0} + {1} = {2}", 1, 2, 3)`, "1 + 2 = 3")
}

func TestQuickSort(t *testing.T) {
	assertIntResult(t, `
fn qsort(arr) {
    if len(arr) <= 1 { return arr }
    let pivot = arr[0]
    let mut less = []
    let mut greater = []
    for i in 1..len(arr) {
        if arr[i] <= pivot {
            push(less, arr[i])
        } else {
            push(greater, arr[i])
        }
    }
    qsort(less) + [pivot] + qsort(greater)
}
let sorted = qsort([5, 3, 8, 1, 9, 2, 7, 4, 6])
sorted[0]
`, 1)
}

func TestMergeSort(t *testing.T) {
	assertIntResult(t, `
fn merge_sorted(a, b) {
    let mut result = []
    let mut i = 0
    let mut j = 0
    while i < len(a) && j < len(b) {
        if a[i] <= b[j] {
            push(result, a[i])
            i += 1
        } else {
            push(result, b[j])
            j += 1
        }
    }
    while i < len(a) { push(result, a[i]); i += 1 }
    while j < len(b) { push(result, b[j]); j += 1 }
    result
}

fn msort(arr) {
    if len(arr) <= 1 { return arr }
    let mid = len(arr) / 2
    let left = msort(slice(arr, 0, mid))
    let right = msort(slice(arr, mid))
    merge_sorted(left, right)
}
let sorted = msort([38, 27, 43, 3, 9, 82, 10])
sorted[0] + sorted[6]
`, 85)
}

func TestDataProcessingPipeline(t *testing.T) {
	assertIntResult(t, `
let data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
let result = filter(data, fn(x) { x % 2 == 0 })
let doubled = map(result, fn(x) { x * 2 })
sum(doubled)
`, 60)
}

func TestFrequenciesIntegration(t *testing.T) {
	assertIntResult(t, `
let words = ["apple", "banana", "apple", "cherry", "banana", "apple"]
let freq = frequencies(words)
let k = keys(freq)
len(k)
`, 3)
}

func TestStringIteration(t *testing.T) {
	assertIntResult(t, `
let mut count = 0
for ch in "hello" {
    count += 1
}
count
`, 5)
}