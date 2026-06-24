// Package snapshot2 manages on-disk index snapshots beyond the simple
// segment file format in internal/segments.
//
// Each snapshot consists of:
//
//   - manifest.json: file list, sha256 sums, byte sizes, schema version
//   - data/*.kseg: opaque segment files
//   - meta.txt: free-form notes (operator-supplied)
//
// snapshot2 owns the lifecycle: create/load/list/prune/verify.
package snapshot2

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

// SchemaVersion is the manifest schema version.
const SchemaVersion = 2

// FileEntry describes one file in the manifest.
type FileEntry struct {
	Path string `json:"path"`
	Size int64  `json:"size"`
	SHA  string `json:"sha"`
}

// Manifest is the snapshot index.
type Manifest struct {
	Schema    int         `json:"schema"`
	Created   time.Time   `json:"created"`
	Notes     string      `json:"notes,omitempty"`
	Entries   []FileEntry `json:"entries"`
}

// Manager controls snapshots under a root directory.
type Manager struct {
	root string
	mu   sync.Mutex
	now  func() time.Time
}

// New constructs a Manager.
func New(root string) (*Manager, error) {
	if root == "" {
		return nil, errors.New("snapshot2: root required")
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	return &Manager{root: root, now: time.Now}, nil
}

// SetClock overrides the time source.
func (m *Manager) SetClock(fn func() time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.now = fn
}

// Create assembles a new snapshot from files. Each file is copied into
// the snapshot's data/ subdirectory. Returns the snapshot's id.
func (m *Manager) Create(notes string, files []string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := m.now().UTC().Format("20060102T150405Z")
	dir := filepath.Join(m.root, id)
	dataDir := filepath.Join(dir, "data")
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return "", err
	}
	manifest := Manifest{
		Schema:  SchemaVersion,
		Created: m.now(),
		Notes:   notes,
	}
	for _, src := range files {
		entry, err := copyFile(src, dataDir)
		if err != nil {
			return "", err
		}
		manifest.Entries = append(manifest.Entries, entry)
	}
	if err := writeManifest(dir, manifest); err != nil {
		return "", err
	}
	return id, nil
}

// Load returns the manifest for the given snapshot id.
func (m *Manager) Load(id string) (*Manifest, error) {
	dir := filepath.Join(m.root, id)
	data, err := os.ReadFile(filepath.Join(dir, "manifest.json"))
	if err != nil {
		return nil, err
	}
	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, err
	}
	return &manifest, nil
}

// List returns snapshot ids in chronological order.
func (m *Manager) List() ([]string, error) {
	entries, err := os.ReadDir(m.root)
	if err != nil {
		return nil, err
	}
	var out []string
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		out = append(out, e.Name())
	}
	sort.Strings(out)
	return out, nil
}

// Verify recomputes hashes against the manifest. Returns mismatches.
func (m *Manager) Verify(id string) ([]string, error) {
	manifest, err := m.Load(id)
	if err != nil {
		return nil, err
	}
	dir := filepath.Join(m.root, id)
	var mismatches []string
	for _, e := range manifest.Entries {
		full := filepath.Join(dir, e.Path)
		actual, err := hashFile(full)
		if err != nil {
			mismatches = append(mismatches, e.Path+": "+err.Error())
			continue
		}
		if actual != e.SHA {
			mismatches = append(mismatches, e.Path+": sha mismatch")
		}
	}
	sort.Strings(mismatches)
	return mismatches, nil
}

// Prune removes snapshots older than retention. Returns ids removed.
func (m *Manager) Prune(retention time.Duration) ([]string, error) {
	if retention <= 0 {
		return nil, nil
	}
	ids, err := m.List()
	if err != nil {
		return nil, err
	}
	now := m.now()
	var removed []string
	for _, id := range ids {
		manifest, err := m.Load(id)
		if err != nil {
			continue
		}
		if now.Sub(manifest.Created) < retention {
			if err := os.RemoveAll(filepath.Join(m.root, id)); err != nil {
				return removed, err
			}
			removed = append(removed, id)
		}
	}
	return removed, nil
}

// Total reports the total bytes used across all snapshots.
func (m *Manager) Total() (int64, error) {
	ids, err := m.List()
	if err != nil {
		return 0, err
	}
	var total int64
	for _, id := range ids {
		manifest, err := m.Load(id)
		if err != nil {
			continue
		}
		for _, e := range manifest.Entries {
			total += e.Size
		}
	}
	return total, nil
}

// Notes returns the notes for a given snapshot.
func (m *Manager) Notes(id string) (string, error) {
	manifest, err := m.Load(id)
	if err != nil {
		return "", err
	}
	return manifest.Notes, nil
}

func copyFile(src, dataDir string) (FileEntry, error) {
	in, err := os.Open(src)
	if err != nil {
		return FileEntry{}, err
	}
	defer in.Close()
	base := filepath.Base(src)
	dst := filepath.Join(dataDir, base)
	out, err := os.Create(dst)
	if err != nil {
		return FileEntry{}, err
	}
	defer out.Close()
	h := sha256.New()
	mw := io.MultiWriter(out, h)
	n, err := io.Copy(mw, in)
	if err != nil {
		return FileEntry{}, err
	}
	return FileEntry{
		Path: filepath.Join("data", base),
		Size: n,
		SHA:  hex.EncodeToString(h.Sum(nil)),
	}, nil
}

func writeManifest(dir string, m Manifest) error {
	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, "manifest.json"), data, 0o644)
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

// ErrNotFound is returned for missing snapshots.
var ErrNotFound = fmt.Errorf("snapshot2: not found")
