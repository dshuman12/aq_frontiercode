// Package atomic implements atomic file write helpers.
package atomic

import (
	"fmt"
	"os"
	"path/filepath"
)

// WriteFile writes data to path atomically using rename().
func WriteFile(path string, data []byte, perm os.FileMode) error {
	dir := filepath.Dir(path)
	tmp, err := os.CreateTemp(dir, "."+filepath.Base(path)+".tmp.")
	if err != nil {
		return fmt.Errorf("atomic: create tmp: %w", err)
	}
	tmpPath := tmp.Name()
	defer func() { _ = os.Remove(tmpPath) }()
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return fmt.Errorf("atomic: write: %w", err)
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return fmt.Errorf("atomic: sync: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("atomic: close: %w", err)
	}
	if err := os.Chmod(tmpPath, perm); err != nil {
		return fmt.Errorf("atomic: chmod: %w", err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return fmt.Errorf("atomic: rename: %w", err)
	}
	return nil
}

// AppendFile opens (or creates) path and appends data.
func AppendFile(path string, data []byte, perm os.FileMode) error {
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, perm)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = f.Write(data)
	return err
}

// EnsureDir creates dir (and parents) if needed.
func EnsureDir(dir string, perm os.FileMode) error {
	return os.MkdirAll(dir, perm)
}

// RemoveTree removes a directory tree, ignoring NotExist.
func RemoveTree(p string) error {
	if err := os.RemoveAll(p); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// Exists reports whether p exists.
func Exists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}

// IsDir reports whether p is a directory.
func IsDir(p string) bool {
	info, err := os.Stat(p)
	return err == nil && info.IsDir()
}

// FileSize returns the size in bytes of p, or 0 on error.
func FileSize(p string) int64 {
	info, err := os.Stat(p)
	if err != nil {
		return 0
	}
	return info.Size()
}
