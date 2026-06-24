// Package color provides ANSI color helpers used by interactive
// kindling output.
package color

import "os"

// Code is an ANSI SGR sequence.
type Code string

const (
	Reset   Code = "\x1b[0m"
	Bold    Code = "\x1b[1m"
	Dim     Code = "\x1b[2m"
	Red     Code = "\x1b[31m"
	Green   Code = "\x1b[32m"
	Yellow  Code = "\x1b[33m"
	Blue    Code = "\x1b[34m"
	Magenta Code = "\x1b[35m"
	Cyan    Code = "\x1b[36m"
	Gray    Code = "\x1b[90m"
)

// Enabled reports whether color output should be used. Honors NO_COLOR.
func Enabled() bool {
	return os.Getenv("NO_COLOR") == ""
}

// Wrap wraps s in c + reset, or returns s unchanged if disabled.
func Wrap(c Code, s string) string {
	if !Enabled() {
		return s
	}
	return string(c) + s + string(Reset)
}

// LevelColor returns the color associated with a log level token.
func LevelColor(level string) Code {
	switch level {
	case "error", "fatal":
		return Red
	case "warn", "warning":
		return Yellow
	case "info":
		return Green
	case "debug":
		return Cyan
	default:
		return Gray
	}
}

// Disable turns color output off for the remainder of the process.
// Used in tests.
func Disable() {
	_ = os.Setenv("NO_COLOR", "1")
}

// Enable turns color output back on.
func Enable() {
	_ = os.Unsetenv("NO_COLOR")
}
