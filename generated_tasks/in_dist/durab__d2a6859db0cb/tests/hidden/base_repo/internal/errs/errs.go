// Package errs defines the canonical error categories used across the engine.
// Callers should compare with errors.Is rather than string-matching, and they
// should wrap with fmt.Errorf("%w: ...", errs.NotFound) at the point of use.
package errs

import "errors"

var (
	NotFound      = errors.New("not found")
	AlreadyExists = errors.New("already exists")
	Invalid       = errors.New("invalid argument")
	Conflict      = errors.New("conflict")
	Internal      = errors.New("internal")
	Unavailable   = errors.New("unavailable")
	Canceled      = errors.New("canceled")
	DeadlineExceeded = errors.New("deadline exceeded")
	Unauthorized  = errors.New("unauthorized")
	PermissionDenied = errors.New("permission denied")
)

// Is is a thin wrapper around errors.Is to keep call sites in the engine
// uniform; it also flattens go's join error trees in O(n).
func Is(err, target error) bool { return errors.Is(err, target) }
