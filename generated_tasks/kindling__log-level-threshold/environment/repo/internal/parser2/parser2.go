// Package parser2 is a small parser combinator library used to
// prototype query-language extensions before integrating them into the
// core parse package.
//
// Parsers are typed functions: given a remaining input slice they
// return the parsed value, the new remaining input, and an error. A
// handful of combinators (Seq, Alt, Many, Map) compose them.
package parser2

import (
	"errors"
	"fmt"
	"strings"
	"unicode"
)

// Result is the output of one parser.
type Result[T any] struct {
	Value T
	Rest  string
}

// Parser parses a value of type T.
type Parser[T any] func(string) (Result[T], error)

// Lit matches s exactly and returns it as the value.
func Lit(s string) Parser[string] {
	return func(in string) (Result[string], error) {
		if !strings.HasPrefix(in, s) {
			return Result[string]{}, fmt.Errorf("parser2: expected %q", s)
		}
		return Result[string]{Value: s, Rest: in[len(s):]}, nil
	}
}

// Whitespace consumes ASCII whitespace; result is the count consumed.
func Whitespace(in string) (Result[int], error) {
	n := 0
	for n < len(in) && unicode.IsSpace(rune(in[n])) {
		n++
	}
	return Result[int]{Value: n, Rest: in[n:]}, nil
}

// Ident consumes a [_A-Za-z][_A-Za-z0-9-]* token.
func Ident(in string) (Result[string], error) {
	if in == "" || !(in[0] == '_' || unicode.IsLetter(rune(in[0]))) {
		return Result[string]{}, errors.New("parser2: expected identifier")
	}
	end := 1
	for end < len(in) {
		c := in[end]
		if c == '_' || c == '-' || unicode.IsLetter(rune(c)) || unicode.IsDigit(rune(c)) {
			end++
			continue
		}
		break
	}
	return Result[string]{Value: in[:end], Rest: in[end:]}, nil
}

// Map applies fn to the value of inner.
func Map[T, U any](inner Parser[T], fn func(T) U) Parser[U] {
	return func(in string) (Result[U], error) {
		r, err := inner(in)
		if err != nil {
			return Result[U]{}, err
		}
		return Result[U]{Value: fn(r.Value), Rest: r.Rest}, nil
	}
}

// Many runs inner zero or more times, gathering results.
func Many[T any](inner Parser[T]) Parser[[]T] {
	return func(in string) (Result[[]T], error) {
		var out []T
		rest := in
		for {
			r, err := inner(rest)
			if err != nil {
				return Result[[]T]{Value: out, Rest: rest}, nil
			}
			if r.Rest == rest {
				return Result[[]T]{Value: out, Rest: rest}, nil
			}
			out = append(out, r.Value)
			rest = r.Rest
		}
	}
}

// Many1 runs inner one or more times.
func Many1[T any](inner Parser[T]) Parser[[]T] {
	return func(in string) (Result[[]T], error) {
		r, err := inner(in)
		if err != nil {
			return Result[[]T]{}, err
		}
		out := []T{r.Value}
		rest := r.Rest
		for {
			rr, err := inner(rest)
			if err != nil {
				break
			}
			if rr.Rest == rest {
				break
			}
			out = append(out, rr.Value)
			rest = rr.Rest
		}
		return Result[[]T]{Value: out, Rest: rest}, nil
	}
}

// Optional makes inner optional; the value flag indicates presence.
func Optional[T any](inner Parser[T]) Parser[Maybe[T]] {
	return func(in string) (Result[Maybe[T]], error) {
		r, err := inner(in)
		if err != nil {
			return Result[Maybe[T]]{Value: Maybe[T]{}, Rest: in}, nil
		}
		return Result[Maybe[T]]{Value: Maybe[T]{Value: r.Value, Has: true}, Rest: r.Rest}, nil
	}
}

// Maybe is an optional value.
type Maybe[T any] struct {
	Value T
	Has   bool
}

// SepBy runs item one or more times separated by sep.
func SepBy[T, S any](item Parser[T], sep Parser[S]) Parser[[]T] {
	return func(in string) (Result[[]T], error) {
		first, err := item(in)
		if err != nil {
			return Result[[]T]{}, err
		}
		out := []T{first.Value}
		rest := first.Rest
		for {
			sr, err := sep(rest)
			if err != nil {
				break
			}
			next, err := item(sr.Rest)
			if err != nil {
				break
			}
			out = append(out, next.Value)
			rest = next.Rest
		}
		return Result[[]T]{Value: out, Rest: rest}, nil
	}
}

// Seq2 runs a then b, returning a tuple-like value.
func Seq2[A, B any](a Parser[A], b Parser[B]) Parser[Pair[A, B]] {
	return func(in string) (Result[Pair[A, B]], error) {
		ar, err := a(in)
		if err != nil {
			return Result[Pair[A, B]]{}, err
		}
		br, err := b(ar.Rest)
		if err != nil {
			return Result[Pair[A, B]]{}, err
		}
		return Result[Pair[A, B]]{Value: Pair[A, B]{First: ar.Value, Second: br.Value}, Rest: br.Rest}, nil
	}
}

// Pair is a tuple of two values.
type Pair[A, B any] struct {
	First  A
	Second B
}

// Alt2 tries a then b.
func Alt2[T any](a, b Parser[T]) Parser[T] {
	return func(in string) (Result[T], error) {
		if r, err := a(in); err == nil {
			return r, nil
		}
		return b(in)
	}
}

// EndOfInput succeeds only when in is exhausted.
func EndOfInput(in string) (Result[struct{}], error) {
	if in == "" {
		return Result[struct{}]{}, nil
	}
	return Result[struct{}]{}, fmt.Errorf("parser2: trailing input %q", in)
}
