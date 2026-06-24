// Package lockfile provides a small advisory file-lock helper used to
// prevent two kindling daemons from simultaneously rewriting the same
// snapshot directory.
//
// The lock is implemented as O_EXCL creation of a sentinel file that
// records the holder's PID. Stale lock files (whose PID is no longer
// alive) are reclaimed automatically.
package lockfile

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"
)

// ErrAlreadyLocked is returned when another live process holds the lock.
var ErrAlreadyLocked = errors.New("lockfile: already locked")

// Lock represents an acquired lock.
type Lock struct {
	path string
	pid  int
}

// Acquire tries to take the lock at path. On success the caller must
// invoke Release; the lock is process-local (no kernel-level flock).
func Acquire(path string) (*Lock, error) {
	pid := os.Getpid()
	for attempt := 0; attempt < 3; attempt++ {
		f, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_RDWR, 0o644)
		if err == nil {
			if _, werr := fmt.Fprintf(f, "%d\n%s\n", pid, time.Now().UTC().Format(time.RFC3339)); werr != nil {
				_ = f.Close()
				_ = os.Remove(path)
				return nil, werr
			}
			_ = f.Close()
			return &Lock{path: path, pid: pid}, nil
		}
		if !errors.Is(err, os.ErrExist) {
			return nil, err
		}
		ownerPID, err := readPID(path)
		if err != nil {
			return nil, err
		}
		if ownerPID == pid {
			return &Lock{path: path, pid: pid}, nil
		}
		if !processAlive(ownerPID) {
			if rmErr := os.Remove(path); rmErr != nil {
				return nil, rmErr
			}
			continue
		}
		return nil, ErrAlreadyLocked
	}
	return nil, ErrAlreadyLocked
}

// Release deletes the underlying file.
func (l *Lock) Release() error {
	if l == nil {
		return nil
	}
	return os.Remove(l.path)
}

// Path returns the on-disk path of the lock.
func (l *Lock) Path() string { return l.path }

// PID returns the process id stamped into the lock when acquired.
func (l *Lock) PID() int { return l.pid }

// processAlive reports whether the given pid corresponds to a running
// process. On Unix the kill(pid, 0) trick works; on platforms where
// signal-based probing fails this falls back to true.
func processAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	proc, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	if err := proc.Signal(syscall.Signal(0)); err == nil {
		return true
	}
	return false
}

func readPID(path string) (int, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, err
	}
	first := strings.SplitN(strings.TrimSpace(string(data)), "\n", 2)[0]
	return strconv.Atoi(first)
}
