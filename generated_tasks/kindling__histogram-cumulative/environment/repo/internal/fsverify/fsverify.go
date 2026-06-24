// Package fsverify computes and validates checksums for a tree of
// files. It is used by kindling's snapshot loader to detect bit rot
// before replaying old indexes into memory.
package fsverify

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

// Manifest is the verified state of a tree.
type Manifest struct {
	Root  string
	Files []FileHash
}

// FileHash is one entry.
type FileHash struct {
	Path string
	Size int64
	SHA  string
}

// Build walks root and returns the Manifest.
func Build(root string) (*Manifest, error) {
	if root == "" {
		return nil, errors.New("fsverify: empty root")
	}
	abs, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	var entries []FileHash
	err = filepath.Walk(abs, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		sum, err := hashFile(path)
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(abs, path)
		rel = filepath.ToSlash(rel)
		entries = append(entries, FileHash{Path: rel, Size: info.Size(), SHA: sum})
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Path < entries[j].Path })
	return &Manifest{Root: abs, Files: entries}, nil
}

// Verify recomputes hashes and returns the list of mismatches.
func Verify(manifest *Manifest) ([]string, error) {
	if manifest == nil {
		return nil, errors.New("fsverify: nil manifest")
	}
	var mismatches []string
	mu := sync.Mutex{}
	wg := sync.WaitGroup{}
	sem := make(chan struct{}, 8)
	for _, e := range manifest.Files {
		wg.Add(1)
		sem <- struct{}{}
		go func(e FileHash) {
			defer wg.Done()
			defer func() { <-sem }()
			full := filepath.Join(manifest.Root, e.Path)
			info, err := os.Stat(full)
			if err != nil {
				mu.Lock()
				mismatches = append(mismatches, e.Path+": missing")
				mu.Unlock()
				return
			}
			if info.Size() != e.Size {
				mu.Lock()
				mismatches = append(mismatches, e.Path+": size changed")
				mu.Unlock()
				return
			}
			sum, err := hashFile(full)
			if err != nil {
				mu.Lock()
				mismatches = append(mismatches, e.Path+": "+err.Error())
				mu.Unlock()
				return
			}
			if sum != e.SHA {
				mu.Lock()
				mismatches = append(mismatches, e.Path+": sha mismatch")
				mu.Unlock()
			}
		}(e)
	}
	wg.Wait()
	sort.Strings(mismatches)
	return mismatches, nil
}

// Render returns a stable text dump of the manifest.
func Render(manifest *Manifest) string {
	var b strings.Builder
	for _, e := range manifest.Files {
		b.WriteString(e.SHA)
		b.WriteByte(' ')
		b.WriteString(e.Path)
		b.WriteByte('\n')
	}
	return b.String()
}

func hashFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}
