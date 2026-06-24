// Package scan implements directory walking for kindling.
package scan

import (
	"io/fs"
	"os"
	"path/filepath"
)

// Hit is one located file.
type Hit struct {
	Path  string
	Size  int64
	Mtime int64
}

// Config controls a scan.
type Config struct {
	Root      string
	MaxDepth  int
	MinSize   int64
	Excludes  []string
}

// DefaultConfig returns sensible defaults.
func DefaultConfig(root string) Config {
	return Config{Root: root, MaxDepth: 64, MinSize: 0}
}

// Scan walks cfg.Root and returns all files matching cfg.
func Scan(cfg Config) ([]Hit, error) {
	var out []Hit
	err := filepath.Walk(cfg.Root, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			depth := walkDepth(cfg.Root, path)
			if depth > cfg.MaxDepth {
				return filepath.SkipDir
			}
			return nil
		}
		if info.Size() < cfg.MinSize {
			return nil
		}
		for _, p := range cfg.Excludes {
			if matched, _ := filepath.Match(p, filepath.Base(path)); matched {
				return nil
			}
		}
		out = append(out, Hit{
			Path:  path,
			Size:  info.Size(),
			Mtime: info.ModTime().Unix(),
		})
		return nil
	})
	if err != nil && !os.IsNotExist(err) {
		return nil, err
	}
	return out, nil
}

func walkDepth(root, p string) int {
	rel, err := filepath.Rel(root, p)
	if err != nil {
		return 0
	}
	if rel == "." {
		return 0
	}
	count := 1
	for _, ch := range rel {
		if ch == os.PathSeparator {
			count++
		}
	}
	return count
}
