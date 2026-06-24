// Package errors holds the small set of error sentinels and helpers
// used across the kindling crate.
package errors

import (
	"errors"
	"fmt"
)

// Sentinel errors. Wrapped errors that include one of these will
// satisfy errors.Is.
var (
	// ErrNotFound is returned when a lookup misses.
	ErrNotFound = errors.New("not found")
	// ErrInvalidQuery is returned when a query string fails to parse.
	ErrInvalidQuery = errors.New("invalid query")
	// ErrInvalidConfig is returned when an env var fails validation.
	ErrInvalidConfig = errors.New("invalid config")
	// ErrSchemaMismatch is returned when the on-disk schema version
	// does not match the active code's expectation.
	ErrSchemaMismatch = errors.New("schema mismatch")
	// ErrCorruptIndex is returned when the index file is unreadable.
	ErrCorruptIndex = errors.New("corrupt index")
	// ErrUnsupported is returned for not-implemented operations.
	ErrUnsupported = errors.New("unsupported")
)

// Wrapf wraps `err` with a formatted message.
func Wrapf(err error, format string, args ...any) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("%s: %w", fmt.Sprintf(format, args...), err)
}

// Is mirrors errors.Is for callers that import only this package.
func Is(err, target error) bool {
	return errors.Is(err, target)
}

// As mirrors errors.As.
func As(err error, target any) bool {
	return errors.As(err, target)
}
