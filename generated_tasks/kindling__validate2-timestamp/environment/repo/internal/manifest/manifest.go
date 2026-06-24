// Package manifest holds an on-disk record snapshot.
package manifest

import (
	"fmt"
	"sort"
	"strings"
)

// SchemaVersion of the on-disk manifest format.
const SchemaVersion = 3

// Entry is one record described in a manifest.
type Entry struct {
	ID        uint64
	Digest    string
	Size      uint64
	Service   string
	Level     string
	Timestamp int64
}

// Manifest is a collection of Entries.
type Manifest struct {
	Version uint32
	Entries map[string]*Entry
}

// New returns an empty manifest at the current schema version.
func New() *Manifest {
	return &Manifest{
		Version: SchemaVersion,
		Entries: map[string]*Entry{},
	}
}

// Add inserts e (keyed on digest).
func (m *Manifest) Add(e *Entry) {
	m.Entries[e.Digest] = e
}

// Len returns the number of entries.
func (m *Manifest) Len() int { return len(m.Entries) }

// TotalBytes returns the sum of every entry's size.
func (m *Manifest) TotalBytes() uint64 {
	var n uint64
	for _, e := range m.Entries {
		n += e.Size
	}
	return n
}

// ByService returns entries grouped by service.
func (m *Manifest) ByService() map[string][]*Entry {
	out := map[string][]*Entry{}
	for _, e := range m.Entries {
		out[e.Service] = append(out[e.Service], e)
	}
	for _, v := range out {
		sort.Slice(v, func(i, j int) bool { return v[i].ID < v[j].ID })
	}
	return out
}

// Render serializes the manifest as a header + sorted body.
func (m *Manifest) Render() string {
	var sb strings.Builder
	fmt.Fprintf(&sb, "# kindling manifest v%d\n", m.Version)
	fmt.Fprintf(&sb, "entries = %d\n", m.Len())
	sb.WriteByte('\n')
	keys := make([]string, 0, len(m.Entries))
	for k := range m.Entries {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		e := m.Entries[k]
		fmt.Fprintf(&sb, "[%s]\n", e.Digest)
		fmt.Fprintf(&sb, "  id = %d\n", e.ID)
		fmt.Fprintf(&sb, "  size = %d\n", e.Size)
		fmt.Fprintf(&sb, "  service = %s\n", e.Service)
		fmt.Fprintf(&sb, "  level = %s\n", e.Level)
		fmt.Fprintf(&sb, "  ts = %d\n", e.Timestamp)
		sb.WriteByte('\n')
	}
	return sb.String()
}
