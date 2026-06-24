package errs

import "errors"

var (
	NotFound         = errors.New("not found")
	AlreadyExists    = errors.New("already exists")
	Invalid          = errors.New("invalid argument")
	Conflict         = errors.New("conflict")
	Internal         = errors.New("internal")
	Unavailable      = errors.New("unavailable")
	Canceled         = errors.New("canceled")
	DeadlineExceeded = errors.New("deadline exceeded")
	Unauthorized     = errors.New("unauthorized")
	PermissionDenied = errors.New("permission denied")
)

func Is(err, target error) bool { return errors.Is(err, target) }
