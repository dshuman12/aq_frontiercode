// Package iter provides lazy slice iteration helpers used to compose
// pipelines without materialising intermediate results.
//
// Go 1.22 introduced range-over-func; this package supplies the
// adapters kindling needs to bridge between materialised slices and
// pull-based iterators.
package iter

import (
	"errors"
	"sort"
)

// Seq is a pull-based iterator: calling next returns the next value and
// true, or the zero value and false at the end of the sequence.
type Seq[T any] func() (T, bool)

// FromSlice produces a Seq over s.
func FromSlice[T any](s []T) Seq[T] {
	i := 0
	return func() (T, bool) {
		var zero T
		if i >= len(s) {
			return zero, false
		}
		v := s[i]
		i++
		return v, true
	}
}

// ToSlice materialises seq.
func ToSlice[T any](seq Seq[T]) []T {
	var out []T
	for {
		v, ok := seq()
		if !ok {
			return out
		}
		out = append(out, v)
	}
}

// Map lazily applies fn to seq.
func Map[T, U any](seq Seq[T], fn func(T) U) Seq[U] {
	return func() (U, bool) {
		var zero U
		v, ok := seq()
		if !ok {
			return zero, false
		}
		return fn(v), true
	}
}

// Filter keeps values for which fn returns true.
func Filter[T any](seq Seq[T], fn func(T) bool) Seq[T] {
	return func() (T, bool) {
		for {
			v, ok := seq()
			if !ok {
				var zero T
				return zero, false
			}
			if fn(v) {
				return v, true
			}
		}
	}
}

// Take returns the first n values.
func Take[T any](seq Seq[T], n int) Seq[T] {
	i := 0
	return func() (T, bool) {
		var zero T
		if i >= n {
			return zero, false
		}
		v, ok := seq()
		if !ok {
			return zero, false
		}
		i++
		return v, true
	}
}

// Drop discards the first n values.
func Drop[T any](seq Seq[T], n int) Seq[T] {
	skipped := false
	return func() (T, bool) {
		if !skipped {
			for i := 0; i < n; i++ {
				if _, ok := seq(); !ok {
					var zero T
					return zero, false
				}
			}
			skipped = true
		}
		return seq()
	}
}

// Concat concatenates seqs in order.
func Concat[T any](seqs ...Seq[T]) Seq[T] {
	idx := 0
	return func() (T, bool) {
		for idx < len(seqs) {
			v, ok := seqs[idx]()
			if ok {
				return v, true
			}
			idx++
		}
		var zero T
		return zero, false
	}
}

// Reduce folds seq with the given accumulator.
func Reduce[T, U any](seq Seq[T], init U, fn func(U, T) U) U {
	acc := init
	for {
		v, ok := seq()
		if !ok {
			return acc
		}
		acc = fn(acc, v)
	}
}

// Count consumes seq and returns the number of values.
func Count[T any](seq Seq[T]) int {
	n := 0
	for {
		_, ok := seq()
		if !ok {
			return n
		}
		n++
	}
}

// Find returns the first value for which pred holds.
func Find[T any](seq Seq[T], pred func(T) bool) (T, bool) {
	for {
		v, ok := seq()
		if !ok {
			var zero T
			return zero, false
		}
		if pred(v) {
			return v, true
		}
	}
}

// Sort materialises seq, sorts it with less, and returns a fresh Seq.
func Sort[T any](seq Seq[T], less func(a, b T) bool) Seq[T] {
	s := ToSlice(seq)
	sort.SliceStable(s, func(i, j int) bool { return less(s[i], s[j]) })
	return FromSlice(s)
}

// Window groups seq into successive batches of size n.
func Window[T any](seq Seq[T], n int) Seq[[]T] {
	if n <= 0 {
		n = 1
	}
	return func() ([]T, bool) {
		batch := make([]T, 0, n)
		for i := 0; i < n; i++ {
			v, ok := seq()
			if !ok {
				if len(batch) == 0 {
					return nil, false
				}
				return batch, true
			}
			batch = append(batch, v)
		}
		return batch, true
	}
}

// ErrEmpty is returned when an operation requires a non-empty sequence.
var ErrEmpty = errors.New("iter: empty sequence")

// First returns the first value of seq or ErrEmpty.
func First[T any](seq Seq[T]) (T, error) {
	v, ok := seq()
	if !ok {
		var zero T
		return zero, ErrEmpty
	}
	return v, nil
}
