// Package health implements the kindling healthcheck.
package health

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// Status reports the result of one healthcheck pass.
type Status struct {
	OK      bool
	Reasons []string
}

// Add appends a failure reason and clears OK.
func (s *Status) Add(reason string) {
	s.OK = false
	s.Reasons = append(s.Reasons, reason)
}

// Check inspects the data dir + cache and returns a Status.
func Check(dataDir, cacheDir string, lockMaxAge time.Duration) Status {
	s := Status{OK: true}
	if dataDir == "" {
		s.Add("data dir is empty")
	} else if err := stat(dataDir); err != nil {
		s.Add(fmt.Sprintf("data dir: %s", err))
	}
	if cacheDir != "" {
		if err := stat(cacheDir); err != nil {
			s.Add(fmt.Sprintf("cache dir: %s", err))
		}
	}
	lockPath := filepath.Join(dataDir, ".lock")
	if info, err := os.Stat(lockPath); err == nil {
		age := time.Since(info.ModTime())
		if age > lockMaxAge {
			s.Add(fmt.Sprintf("stale lockfile %s (%s old)", lockPath, age.Round(time.Second)))
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		s.Add(fmt.Sprintf("lockfile stat: %s", err))
	}
	return s
}

func stat(p string) error {
	info, err := os.Stat(p)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("not a directory: %s", p)
	}
	return nil
}

// Render formats a Status as a single line.
func Render(s Status, verbose bool) string {
	if s.OK {
		if verbose {
			return "healthcheck: OK\n"
		}
		return ""
	}
	if !verbose {
		return ""
	}
	out := "healthcheck: FAIL\n"
	for _, r := range s.Reasons {
		out += "  " + r + "\n"
	}
	return out
}
