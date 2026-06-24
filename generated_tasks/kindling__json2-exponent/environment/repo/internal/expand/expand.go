// Package expand walks a directory tree and yields paths matching
// glob patterns.
package expand

import (
	"io/fs"
	"path/filepath"
	"strings"

	"github.com/dleblanc/kindling/internal/glob"
)

// Match walks root and returns every relative path matching any pattern.
func Match(root string, patterns []string) ([]string, error) {
	var out []string
	err := filepath.Walk(root, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return nil
		}
		base := filepath.Base(rel)
		if glob.MatchesAny(patterns, base) {
			out = append(out, rel)
		}
		return nil
	})
	return out, err
}

// MatchExt walks root and returns paths with the given extension.
func MatchExt(root, ext string) ([]string, error) {
	if !strings.HasPrefix(ext, ".") {
		ext = "." + ext
	}
	var out []string
	err := filepath.Walk(root, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		if strings.EqualFold(filepath.Ext(path), ext) {
			rel, err := filepath.Rel(root, path)
			if err != nil {
				return nil
			}
			out = append(out, rel)
		}
		return nil
	})
	return out, err
}

// MatchAny returns true if root contains at least one path matching pattern.
func MatchAny(root, pattern string) bool {
	hits, err := Match(root, []string{pattern})
	return err == nil && len(hits) > 0
}
