// Package glob is the shared glob expander used by pkg/parser (for
// validating Inputs/Outputs at config time), pkg/cache (for hashing
// inputs), and pkg/watcher (for matching events to tasks).
//
// We support standard `*`, `?`, and `[abc]` patterns, plus the
// `**` doublestar (any-depth match). Brace expansion (`{a,b,c}`) is
// NOT yet implemented — patterns containing `{` are currently passed
// through to filepath.Match unchanged, which means `dist/{a,b}.txt`
// will literally match a file named `{a,b}.txt`. This is on the
// roadmap; until then, document multiple globs as separate Inputs
// entries.
package glob

import (
	"errors"
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"
)

// ErrInvalidPattern is returned by Match when the pattern is malformed.
var ErrInvalidPattern = errors.New("invalid glob pattern")

// Match reports whether path matches the given glob pattern. The
// pattern is interpreted relative to the same root as path; Match does
// NOT perform any I/O.
//
// Supported syntax:
//
//	*       single path segment, any chars except /
//	?       single character, not /
//	[abc]   character class
//	[a-z]   character range
//	**      zero or more path segments
//	a/b/c   literal path
//
// Brace expansion is not currently supported. See package doc.
func Match(pattern, path string) (bool, error) {
	pattern = filepath.ToSlash(pattern)
	path = filepath.ToSlash(path)
	return matchSegments(splitSegments(pattern), splitSegments(path))
}

// Expand walks the filesystem rooted at root and returns the paths
// (relative to root) matching the pattern. Hidden files (those whose
// basename starts with `.`) are skipped unless the pattern explicitly
// matches them. Symlinks are NOT followed; the pattern matches the
// symlink path itself, not its target.
func Expand(root, pattern string) ([]string, error) {
	if pattern == "" {
		return nil, nil
	}
	out := []string{}
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			// I/O error walking — skip the path but propagate as-is.
			return err
		}
		rel, _ := filepath.Rel(root, path)
		rel = filepath.ToSlash(rel)
		if rel == "." {
			return nil
		}
		// Skip dotfiles unless pattern starts with `.`
		base := filepath.Base(rel)
		if strings.HasPrefix(base, ".") && !strings.HasPrefix(pattern, ".") && !strings.Contains(pattern, "/.") {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		ok, err := Match(pattern, rel)
		if err != nil {
			return err
		}
		if ok && !d.IsDir() {
			out = append(out, rel)
		}
		return nil
	})
	return out, err
}

// splitSegments splits a path or pattern on '/', collapsing empty
// segments at the start/end (so "/a/b/" matches "a/b").
func splitSegments(s string) []string {
	parts := strings.Split(s, "/")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p == "" {
			continue
		}
		out = append(out, p)
	}
	return out
}

// matchSegments compares pattern segments to path segments, with
// support for `**` (matches zero or more segments).
func matchSegments(patternSegs, pathSegs []string) (bool, error) {
	pi, xi := 0, 0
	starPi, starXi := -1, -1

	for xi < len(pathSegs) {
		if pi < len(patternSegs) {
			ps := patternSegs[pi]
			if ps == "**" {
				starPi = pi
				starXi = xi
				pi++
				continue
			}
			ok, err := matchSegment(ps, pathSegs[xi])
			if err != nil {
				return false, err
			}
			if ok {
				pi++
				xi++
				continue
			}
		}
		if starPi >= 0 {
			pi = starPi + 1
			starXi++
			xi = starXi
			continue
		}
		return false, nil
	}
	// Consume trailing **
	for pi < len(patternSegs) && patternSegs[pi] == "**" {
		pi++
	}
	return pi == len(patternSegs), nil
}

// matchSegment matches a single pattern segment against a single path
// segment using filepath.Match semantics.
func matchSegment(pattern, segment string) (bool, error) {
	ok, err := filepath.Match(pattern, segment)
	if err != nil {
		return false, fmt.Errorf("%w: %v", ErrInvalidPattern, err)
	}
	return ok, nil
}
