// Package cache implements the types.Cache contract on top of an
// on-disk content-hashed store. Each cached entry is a JSON sidecar
// pointing at a tarball of the task's outputs plus the captured stdout
// and stderr streams.
//
// The directory layout under CacheDir is:
//
//	CacheDir/
//	├── entries/<key-prefix>/<key>.json     -- CacheEntry sidecar
//	├── blobs/<key-prefix>/<key>.tar.gz     -- output tarball
//	├── stdout/<key-prefix>/<key>.log       -- captured stdout
//	└── stderr/<key-prefix>/<key>.log       -- captured stderr
//
// `key-prefix` is the first two hex characters of the cache key — same
// trick git uses for object storage. Avoids ten-thousand-file directories.
package cache

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"github.com/manojgowda/lattice/pkg/types"
)

// DiskCache is the default Cache implementation. Stores entries on local
// disk under a configurable root directory. Safe for concurrent use from
// the scheduler (which runs many tasks in parallel).
type DiskCache struct {
	root string

	// Stats counters. Atomic so the scheduler can read them without
	// taking the mutex.
	hits   atomic.Uint64
	misses atomic.Uint64
	stores atomic.Uint64

	// mu guards the in-memory index. We hold it briefly per Get/Put to
	// keep concurrent calls from racing on the directory listing.
	mu sync.Mutex
}

// New creates a DiskCache rooted at the given directory. The directory
// (and required subdirectories) is created if it doesn't exist.
func New(root string) (*DiskCache, error) {
	if root == "" {
		return nil, fmt.Errorf("cache.New: empty root")
	}
	for _, sub := range []string{"entries", "blobs", "stdout", "stderr"} {
		if err := os.MkdirAll(filepath.Join(root, sub), 0o755); err != nil {
			return nil, fmt.Errorf("cache.New: mkdir %s: %w", sub, err)
		}
	}
	return &DiskCache{root: root}, nil
}

// Hash computes the cache key for a task at its current state. The key
// is a function of:
//   - task name and command
//   - task-level environment (task.Env)
//   - sorted hashes of every file matching the task's Inputs globs
//
// Two tasks with identical inputs and command produce identical keys,
// regardless of where they live on disk or which project loaded them.
func (c *DiskCache) Hash(task *types.Task, project *types.Project) (types.CacheKey, error) {
	if task == nil {
		return "", fmt.Errorf("cache.Hash: nil task")
	}
	if project == nil {
		return "", fmt.Errorf("cache.Hash: nil project")
	}

	h := newHasher()
	h.WriteString("name=")
	h.WriteString(task.Name)
	h.WriteString("\ncmd=")
	h.WriteString(task.Command)
	h.WriteString("\ndir=")
	h.WriteString(task.Dir)

	// Hash task-level env in sorted order so map ordering doesn't
	// perturb the key.
	h.WriteString("\nenv=")
	writeSortedEnv(h, task.Env)

	// Hash every input file's content, in sorted path order. We don't
	// follow symlinks here — see hash.go for the policy.
	if err := hashInputs(h, project.Root, task.Inputs); err != nil {
		return "", fmt.Errorf("cache.Hash: %w", err)
	}

	return types.CacheKey(h.Hex()), nil
}

// Get retrieves a cache entry. Returns (nil, nil) on miss; only returns
// a non-nil error on actual I/O problems.
func (c *DiskCache) Get(key types.CacheKey) (*types.CacheEntry, error) {
	if key == "" {
		return nil, fmt.Errorf("cache.Get: empty key")
	}
	c.mu.Lock()
	defer c.mu.Unlock()

	path := c.entryPath(key)
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		c.misses.Add(1)
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("cache.Get: read %s: %w", path, err)
	}

	var entry types.CacheEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		// Corrupted entry — treat as miss but log via error path so
		// the scheduler can warn.
		c.misses.Add(1)
		return nil, fmt.Errorf("cache.Get: corrupt entry %s: %w", path, err)
	}
	c.hits.Add(1)
	return &entry, nil
}

// Put stores a cache entry. The entry's BlobPath, Stdout, and Stderr
// fields are taken as-is — the caller is responsible for having written
// those files into the cache directory before calling Put.
func (c *DiskCache) Put(entry *types.CacheEntry) error {
	if entry == nil {
		return fmt.Errorf("cache.Put: nil entry")
	}
	if entry.Key == "" {
		return fmt.Errorf("cache.Put: empty key")
	}
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now()
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	path := c.entryPath(entry.Key)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("cache.Put: mkdir: %w", err)
	}
	data, err := json.MarshalIndent(entry, "", "  ")
	if err != nil {
		return fmt.Errorf("cache.Put: marshal: %w", err)
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return fmt.Errorf("cache.Put: write tmp: %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
		return fmt.Errorf("cache.Put: rename: %w", err)
	}
	c.stores.Add(1)
	return nil
}

// Restore writes the cached outputs back to the filesystem rooted at
// projectRoot. Outputs are extracted from the tarball at entry.BlobPath.
func (c *DiskCache) Restore(entry *types.CacheEntry, projectRoot string) error {
	if entry == nil {
		return fmt.Errorf("cache.Restore: nil entry")
	}
	if entry.BlobPath == "" {
		// Some tasks have no outputs (e.g. a `lint` task that just runs
		// for side effects). Restore is a no-op in that case.
		return nil
	}
	return extractTarball(entry.BlobPath, projectRoot)
}

// Invalidate removes a cache entry and its associated blobs. Used by
// `lattice clean <task>`.
func (c *DiskCache) Invalidate(key types.CacheKey) error {
	if key == "" {
		return fmt.Errorf("cache.Invalidate: empty key")
	}
	c.mu.Lock()
	defer c.mu.Unlock()

	for _, sub := range []string{"entries", "blobs", "stdout", "stderr"} {
		ext := ".json"
		if sub == "blobs" {
			ext = ".tar.gz"
		} else if sub == "stdout" || sub == "stderr" {
			ext = ".log"
		}
		path := filepath.Join(c.root, sub, keyPrefix(key), string(key)+ext)
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("cache.Invalidate: rm %s: %w", path, err)
		}
	}
	return nil
}

// Stats returns hit/miss/store counters and a rough size of the cache
// directory.
func (c *DiskCache) Stats() types.CacheStats {
	c.mu.Lock()
	defer c.mu.Unlock()

	stats := types.CacheStats{
		Hits:   c.hits.Load(),
		Misses: c.misses.Load(),
		Stores: c.stores.Load(),
	}
	// Walk the entries directory to estimate size. Cheap enough for
	// `lattice stats` invocations; we don't memoize.
	_ = filepath.Walk(c.root, func(_ string, info os.FileInfo, err error) error {
		if err != nil || info == nil || info.IsDir() {
			return nil
		}
		stats.Bytes += uint64(info.Size())
		if stats.OldestEntry.IsZero() || info.ModTime().Before(stats.OldestEntry) {
			stats.OldestEntry = info.ModTime()
		}
		return nil
	})
	return stats
}

// entryPath returns the on-disk path for the JSON sidecar of a key.
func (c *DiskCache) entryPath(key types.CacheKey) string {
	return filepath.Join(c.root, "entries", keyPrefix(key), string(key)+".json")
}

// keyPrefix returns the first two characters of the key (or "00" for
// ultra-short keys), used to shard entries across subdirectories.
func keyPrefix(key types.CacheKey) string {
	if len(key) < 2 {
		return "00"
	}
	return string(key[:2])
}

// Compile-time check that *DiskCache satisfies the types.Cache contract.
var _ types.Cache = (*DiskCache)(nil)
