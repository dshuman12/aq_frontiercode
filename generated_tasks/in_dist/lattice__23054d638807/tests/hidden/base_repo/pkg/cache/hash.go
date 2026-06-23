package cache

import (
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"

	"github.com/zeebo/blake3"
)

// hasher wraps a blake3 hasher with a couple of convenience methods so
// the call sites in cache.go stay readable.
type hasher struct {
	h *blake3.Hasher
}

func newHasher() *hasher {
	return &hasher{h: blake3.New()}
}

func (h *hasher) WriteString(s string) {
	_, _ = h.h.WriteString(s)
}

func (h *hasher) WriteBytes(b []byte) {
	_, _ = h.h.Write(b)
}

func (h *hasher) Hex() string {
	return hex.EncodeToString(h.h.Sum(nil))
}

// writeSortedEnv hashes a map[string]string in sorted-by-key order so
// map iteration order doesn't perturb the result.
func writeSortedEnv(h *hasher, env map[string]string) {
	if len(env) == 0 {
		h.WriteString("(none)")
		return
	}
	keys := make([]string, 0, len(env))
	for k := range env {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		h.WriteString(k)
		h.WriteString("=")
		h.WriteString(env[k])
		h.WriteString(";")
	}
}

// hashInputs walks every file matching the task's input globs and feeds
// (path + content-hash) pairs into the running hasher in sorted order.
//
// Glob semantics: we use Go's filepath.Glob, which means ** is NOT
// supported. Tasks that need recursive globs use multiple top-level
// patterns (e.g. ["pkg/**/*.go", "internal/**/*.go"]). The walker below
// expands ** by hand.
func hashInputs(h *hasher, root string, inputs []string) error {
	if len(inputs) == 0 {
		h.WriteString("\ninputs=(none)")
		return nil
	}

	files, err := expandGlobs(root, inputs)
	if err != nil {
		return err
	}
	sort.Strings(files)

	h.WriteString("\ninputs=")
	for _, f := range files {
		fileHash, err := hashFile(f)
		if err != nil {
			return fmt.Errorf("hash %s: %w", f, err)
		}
		h.WriteString(f)
		h.WriteString("@")
		h.WriteString(fileHash)
		h.WriteString(";")
	}
	return nil
}

// hashFile returns the blake3 hex digest of a single file's contents.
func hashFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := blake3.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// expandGlobs takes user-supplied glob patterns (relative to root) and
// returns the deduped, absolute set of files matching them. Recognises
// `**` as a recursive marker. Patterns starting with `!` are exclusions
// applied after the include set is built.
//
// Hidden files (basename starting with ".") are NOT matched by default
// — pass an explicit pattern like `.github/**/*.yml` to pick them up.
// Symlinks are followed for the purpose of file matching but the hash
// of a symlinked file is the hash of the resolved file's contents.
func expandGlobs(root string, patterns []string) ([]string, error) {
	if root == "" {
		root = "."
	}
	var includes, excludes []string
	for _, p := range patterns {
		if len(p) > 0 && p[0] == '!' {
			excludes = append(excludes, p[1:])
			continue
		}
		includes = append(includes, p)
	}

	matched := make(map[string]struct{})
	for _, pat := range includes {
		// Detect `**` and route to the recursive walker.
		if containsDoubleStar(pat) {
			if err := walkRecursive(root, pat, matched); err != nil {
				return nil, err
			}
			continue
		}
		// Plain glob — let the stdlib handle it.
		abs := pat
		if !filepath.IsAbs(pat) {
			abs = filepath.Join(root, pat)
		}
		hits, err := filepath.Glob(abs)
		if err != nil {
			return nil, fmt.Errorf("bad glob %q: %w", pat, err)
		}
		for _, h := range hits {
			info, err := os.Stat(h)
			if err != nil || info.IsDir() {
				continue
			}
			matched[h] = struct{}{}
		}
	}

	// Apply excludes.
	for _, pat := range excludes {
		for path := range matched {
			rel, err := filepath.Rel(root, path)
			if err != nil {
				continue
			}
			ok, _ := filepath.Match(pat, rel)
			if ok {
				delete(matched, path)
			}
		}
	}

	out := make([]string, 0, len(matched))
	for k := range matched {
		out = append(out, k)
	}
	return out, nil
}

// containsDoubleStar reports whether the pattern uses `**`.
func containsDoubleStar(pat string) bool {
	for i := 0; i < len(pat)-1; i++ {
		if pat[i] == '*' && pat[i+1] == '*' {
			return true
		}
	}
	return false
}

// walkRecursive expands a `**`-bearing pattern by walking the file tree
// and matching the suffix portion against each candidate file.
//
// Limitation: only one `**` per pattern is supported. `a/**/b/**/c` will
// only expand the first one.
func walkRecursive(root, pattern string, out map[string]struct{}) error {
	// Split the pattern at `**`. Prefix is the directory to start from,
	// suffix is the file-name pattern to match against the basename.
	idx := -1
	for i := 0; i < len(pattern)-1; i++ {
		if pattern[i] == '*' && pattern[i+1] == '*' {
			idx = i
			break
		}
	}
	if idx < 0 {
		return nil // shouldn't happen given the precondition
	}
	prefix := pattern[:idx]
	prefix = filepath.Clean(filepath.Join(root, prefix))

	// Suffix is everything after `**/` (or `**`).
	suffix := pattern[idx+2:]
	if len(suffix) > 0 && suffix[0] == '/' {
		suffix = suffix[1:]
	}
	if suffix == "" {
		// Pattern was something like `pkg/**` — match any file under
		// the prefix.
		suffix = "*"
	}

	return filepath.Walk(prefix, func(path string, info os.FileInfo, err error) error {
		if err != nil || info == nil || info.IsDir() {
			return nil
		}
		base := filepath.Base(path)
		if ok, _ := filepath.Match(suffix, base); ok {
			out[path] = struct{}{}
		}
		return nil
	})
}
