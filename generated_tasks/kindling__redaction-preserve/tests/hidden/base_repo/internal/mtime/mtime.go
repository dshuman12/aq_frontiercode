// Package mtime exposes file modification-time helpers.
package mtime

import (
	"errors"
	"os"
	"time"
)

// Of returns the mtime of path.
func Of(path string) (time.Time, error) {
	info, err := os.Stat(path)
	if err != nil {
		return time.Time{}, err
	}
	return info.ModTime(), nil
}

// Set changes mtime + atime to t.
func Set(path string, t time.Time) error {
	return os.Chtimes(path, t, t)
}

// IsOlderThan reports whether path's mtime is older than maxAge.
func IsOlderThan(path string, maxAge time.Duration) (bool, error) {
	mt, err := Of(path)
	if err != nil {
		return false, err
	}
	return time.Since(mt) > maxAge, nil
}

// MissingOK runs Of, treating not-exist as nil-error/zero-time.
func MissingOK(path string) (time.Time, bool, error) {
	mt, err := Of(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return time.Time{}, false, nil
		}
		return time.Time{}, false, err
	}
	return mt, true, nil
}
