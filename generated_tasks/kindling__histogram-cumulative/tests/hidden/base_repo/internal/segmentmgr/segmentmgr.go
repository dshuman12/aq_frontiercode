// Package segmentmgr orchestrates the lifecycle of on-disk segment
// files: creation, listing, retention pruning, and atomic swap-in.
package segmentmgr

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// Segment describes one segment.
type Segment struct {
	Path    string
	Size    int64
	ModTime time.Time
	Seq     uint64
}

// Manager tracks segments under a directory.
type Manager struct {
	dir      string
	mu       sync.Mutex
	prefix   string
	suffix   string
	maxBytes int64
	maxAge   time.Duration
}

// Options configures Manager.
type Options struct {
	Prefix   string
	Suffix   string
	MaxBytes int64         // total disk budget; 0 disables
	MaxAge   time.Duration // age cutoff; 0 disables
}

// New constructs a Manager rooted at dir.
func New(dir string, opt Options) (*Manager, error) {
	if dir == "" {
		return nil, errors.New("segmentmgr: dir required")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	prefix := opt.Prefix
	if prefix == "" {
		prefix = "seg-"
	}
	suffix := opt.Suffix
	if suffix == "" {
		suffix = ".kseg"
	}
	return &Manager{
		dir:      dir,
		prefix:   prefix,
		suffix:   suffix,
		maxBytes: opt.MaxBytes,
		maxAge:   opt.MaxAge,
	}, nil
}

// List returns segments sorted by sequence ascending.
func (m *Manager) List() ([]Segment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	entries, err := os.ReadDir(m.dir)
	if err != nil {
		return nil, err
	}
	var out []Segment
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasPrefix(name, m.prefix) || !strings.HasSuffix(name, m.suffix) {
			continue
		}
		seqStr := strings.TrimSuffix(strings.TrimPrefix(name, m.prefix), m.suffix)
		seq, err := parseSeq(seqStr)
		if err != nil {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		out = append(out, Segment{
			Path:    filepath.Join(m.dir, name),
			Size:    info.Size(),
			ModTime: info.ModTime(),
			Seq:     seq,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Seq < out[j].Seq })
	return out, nil
}

// Allocate returns the path for the next segment file.
func (m *Manager) Allocate() (string, uint64, error) {
	segs, err := m.List()
	if err != nil {
		return "", 0, err
	}
	next := uint64(1)
	if len(segs) > 0 {
		next = segs[len(segs)-1].Seq + 1
	}
	name := fmt.Sprintf("%s%016d%s", m.prefix, next, m.suffix)
	return filepath.Join(m.dir, name), next, nil
}

// Prune deletes segments that exceed retention. Returns the segments removed.
func (m *Manager) Prune(now time.Time) ([]Segment, error) {
	segs, err := m.List()
	if err != nil {
		return nil, err
	}
	var removed []Segment
	if m.maxAge > 0 {
		survivors := segs[:0]
		for _, s := range segs {
			if now.Sub(s.ModTime) > m.maxAge {
				if err := os.Remove(s.Path); err != nil {
					return removed, err
				}
				removed = append(removed, s)
				continue
			}
			survivors = append(survivors, s)
		}
		segs = survivors
	}
	if m.maxBytes > 0 {
		var total int64
		for _, s := range segs {
			total += s.Size
		}
		// Drop oldest until under budget.
		for i := 0; i < len(segs) && total > m.maxBytes; i++ {
			if err := os.Remove(segs[i].Path); err != nil {
				return removed, err
			}
			removed = append(removed, segs[i])
			total -= segs[i].Size
		}
	}
	return removed, nil
}

// Replace atomically renames tmp to the canonical name for seq.
func (m *Manager) Replace(tmp string, seq uint64) error {
	name := fmt.Sprintf("%s%016d%s", m.prefix, seq, m.suffix)
	final := filepath.Join(m.dir, name)
	return os.Rename(tmp, final)
}

func parseSeq(s string) (uint64, error) {
	var v uint64
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("segmentmgr: bad seq %q", s)
		}
		v = v*10 + uint64(c-'0')
	}
	return v, nil
}
