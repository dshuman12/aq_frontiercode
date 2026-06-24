// Package retentionplan models the retention policies kindling applies
// to its on-disk snapshots and produces the list of files to delete.
//
// Policies:
//
//   - MaxAge: drop files older than the threshold.
//   - MaxBytes: drop oldest first until under the byte budget.
//   - PerLabel: keep at most N files per label group.
//
// The planner is purely functional: it inspects the input slice and
// returns instructions; callers perform the deletions.
package retentionplan

import (
	"sort"
	"time"
)

// File describes one candidate.
type File struct {
	Path  string
	Size  int64
	Mtime time.Time
	Label string
}

// Policy defines one retention bound.
type Policy struct {
	MaxAge   time.Duration
	MaxBytes int64
	PerLabel int
}

// Action describes what to do with a single file.
type Action struct {
	File   File
	Reason string
}

// Plan returns the actions to apply.
func Plan(files []File, p Policy, now time.Time) []Action {
	if len(files) == 0 {
		return nil
	}
	sorted := append([]File(nil), files...)
	sort.SliceStable(sorted, func(i, j int) bool {
		return sorted[i].Mtime.Before(sorted[j].Mtime)
	})

	dropped := map[string]bool{}
	var out []Action

	if p.MaxAge > 0 {
		for _, f := range sorted {
			if now.Sub(f.Mtime) > p.MaxAge {
				out = append(out, Action{File: f, Reason: "age"})
				dropped[f.Path] = true
			}
		}
	}

	if p.PerLabel > 0 {
		byLabel := map[string][]File{}
		for _, f := range sorted {
			if dropped[f.Path] {
				continue
			}
			byLabel[f.Label] = append(byLabel[f.Label], f)
		}
		for _, files := range byLabel {
			sort.SliceStable(files, func(i, j int) bool {
				return files[i].Mtime.After(files[j].Mtime)
			})
			for _, f := range files[min(p.PerLabel, len(files)):] {
				out = append(out, Action{File: f, Reason: "per-label"})
				dropped[f.Path] = true
			}
		}
	}

	if p.MaxBytes > 0 {
		var totalBytes int64
		for _, f := range sorted {
			if !dropped[f.Path] {
				totalBytes += f.Size
			}
		}
		for _, f := range sorted {
			if totalBytes <= p.MaxBytes {
				break
			}
			if dropped[f.Path] {
				continue
			}
			out = append(out, Action{File: f, Reason: "bytes"})
			dropped[f.Path] = true
			totalBytes -= f.Size
		}
	}

	sort.SliceStable(out, func(i, j int) bool {
		return out[i].File.Path < out[j].File.Path
	})
	return out
}

// Survivors returns the files NOT in the action list.
func Survivors(files []File, actions []Action) []File {
	dropped := map[string]bool{}
	for _, a := range actions {
		dropped[a.File.Path] = true
	}
	var out []File
	for _, f := range files {
		if dropped[f.Path] {
			continue
		}
		out = append(out, f)
	}
	return out
}

// EstimateBytesFreed sums the sizes in actions.
func EstimateBytesFreed(actions []Action) int64 {
	var total int64
	for _, a := range actions {
		total += a.File.Size
	}
	return total
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
