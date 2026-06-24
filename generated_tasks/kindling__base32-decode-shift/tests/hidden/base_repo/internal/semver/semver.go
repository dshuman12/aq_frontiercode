// Package semver implements a minimal SemVer parser.
package semver

import (
	"fmt"
	"strings"
)

// Version is a parsed M.m.p triple.
type Version struct {
	Major, Minor, Patch int
}

// Parse converts s into a Version.
func Parse(s string) (Version, error) {
	parts := strings.Split(s, ".")
	if len(parts) != 3 {
		return Version{}, fmt.Errorf("semver: expected 3 dotted parts, got %q", s)
	}
	v := Version{}
	if _, err := fmt.Sscanf(parts[0], "%d", &v.Major); err != nil {
		return Version{}, fmt.Errorf("semver: bad major %q", parts[0])
	}
	if _, err := fmt.Sscanf(parts[1], "%d", &v.Minor); err != nil {
		return Version{}, fmt.Errorf("semver: bad minor %q", parts[1])
	}
	if _, err := fmt.Sscanf(parts[2], "%d", &v.Patch); err != nil {
		return Version{}, fmt.Errorf("semver: bad patch %q", parts[2])
	}
	return v, nil
}

// String renders the version.
func (v Version) String() string {
	return fmt.Sprintf("%d.%d.%d", v.Major, v.Minor, v.Patch)
}

// Less reports whether v < other.
func (v Version) Less(other Version) bool {
	if v.Major != other.Major {
		return v.Major < other.Major
	}
	if v.Minor != other.Minor {
		return v.Minor < other.Minor
	}
	return v.Patch < other.Patch
}

// Equal reports whether v == other.
func (v Version) Equal(other Version) bool {
	return v == other
}

// Range is `[Min, Max)`.
type Range struct {
	Min, Max Version
}

// Contains reports whether v falls in [Min, Max).
func (r Range) Contains(v Version) bool {
	if v.Less(r.Min) {
		return false
	}
	if !v.Less(r.Max) {
		return false
	}
	return true
}
