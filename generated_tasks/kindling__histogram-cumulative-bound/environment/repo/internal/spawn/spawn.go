// Package spawn wraps os/exec for kindling shell-out helpers.
package spawn

import (
	"context"
	"errors"
	"os/exec"
	"time"
)

// Result is the captured outcome of a single command.
type Result struct {
	Stdout   []byte
	Stderr   []byte
	ExitCode int
	Duration time.Duration
}

// Run executes name + args, returning the result. Honors ctx for
// cancellation.
func Run(ctx context.Context, name string, args ...string) (Result, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	start := time.Now()
	stdout, err := cmd.Output()
	r := Result{
		Stdout:   stdout,
		Duration: time.Since(start),
	}
	if exitErr := (*exec.ExitError)(nil); errors.As(err, &exitErr) {
		r.Stderr = exitErr.Stderr
		r.ExitCode = exitErr.ExitCode()
		return r, err
	}
	if err != nil {
		return r, err
	}
	return r, nil
}

// RunOutput returns the trimmed stdout of the command.
func RunOutput(ctx context.Context, name string, args ...string) (string, error) {
	r, err := Run(ctx, name, args...)
	if err != nil {
		return "", err
	}
	return string(r.Stdout), nil
}

// IsSuccess returns true when the result exited 0.
func IsSuccess(r Result) bool {
	return r.ExitCode == 0
}
