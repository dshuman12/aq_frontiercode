// Package paths provides lexical path normalization.
package paths

import (
	"path/filepath"
	"strings"
)

// Normalize collapses `.` and `..` components without touching the
// filesystem.
func Normalize(p string) string {
	cleaned := filepath.Clean(p)
	if cleaned == "" {
		return "."
	}
	return cleaned
}

// StartsWith reports whether child is at or below parent after
// lexical normalization.
func StartsWith(parent, child string) bool {
	pn := Normalize(parent)
	cn := Normalize(child)
	if pn == cn {
		return true
	}
	pn = pn + string(filepath.Separator)
	return strings.HasPrefix(cn, pn)
}

// Depth returns the number of components in a normalized path.
func Depth(p string) int {
	pn := Normalize(p)
	if pn == "." || pn == "/" {
		return 0
	}
	return strings.Count(strings.TrimPrefix(pn, string(filepath.Separator)), string(filepath.Separator)) + 1
}

// Sibling returns the path with name swapped onto the same parent.
func Sibling(p, name string) string {
	parent := filepath.Dir(Normalize(p))
	return filepath.Join(parent, name)
}

// Relative converts an absolute path into one relative to root, or
// returns the original path if it lies outside.
func Relative(root, p string) (string, bool) {
	rel, err := filepath.Rel(Normalize(root), Normalize(p))
	if err != nil {
		return p, false
	}
	if strings.HasPrefix(rel, "..") {
		return p, false
	}
	return rel, true
}

// Components returns the slash-separated components of p.
func Components(p string) []string {
	pn := Normalize(p)
	if pn == "." {
		return nil
	}
	pn = strings.TrimPrefix(pn, string(filepath.Separator))
	if pn == "" {
		return nil
	}
	return strings.Split(pn, string(filepath.Separator))
}
