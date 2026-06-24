// Package source tracks source locations attached to log records.
//
// A Location is host:port:file:line form, generally cheap to format and
// pleasant to grep for. Locations are interned in a map so that repeated
// references to the same site are stored as a single small integer.
package source

import (
	"fmt"
	"strconv"
	"strings"
	"sync"
)

// Location identifies a single producing site.
type Location struct {
	Host string
	Port int
	File string
	Line int
}

// String renders host:port:file:line.
func (l Location) String() string {
	port := strconv.Itoa(l.Port)
	line := strconv.Itoa(l.Line)
	return l.Host + ":" + port + ":" + l.File + ":" + line
}

// Parse parses host:port:file:line back into a Location. The host portion
// may contain colons (IPv6), so we anchor parsing at the rightmost three
// colon-separated tokens.
func Parse(s string) (Location, error) {
	parts := strings.Split(s, ":")
	if len(parts) < 4 {
		return Location{}, fmt.Errorf("source: expected at least 4 segments in %q", s)
	}
	host := strings.Join(parts[:len(parts)-3], ":")
	port, err := strconv.Atoi(parts[len(parts)-3])
	if err != nil {
		return Location{}, fmt.Errorf("source: bad port: %w", err)
	}
	line, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		return Location{}, fmt.Errorf("source: bad line: %w", err)
	}
	return Location{
		Host: host,
		Port: port,
		File: parts[len(parts)-2],
		Line: line,
	}, nil
}

// Table interns Locations into uint32 ids. Safe for concurrent use.
type Table struct {
	mu    sync.RWMutex
	byID  []Location
	byKey map[string]uint32
}

// NewTable constructs an empty Table.
func NewTable() *Table {
	return &Table{byKey: map[string]uint32{}}
}

// Intern returns the id for loc, allocating one if needed.
func (t *Table) Intern(loc Location) uint32 {
	key := loc.String()
	t.mu.RLock()
	if id, ok := t.byKey[key]; ok {
		t.mu.RUnlock()
		return id
	}
	t.mu.RUnlock()
	t.mu.Lock()
	defer t.mu.Unlock()
	if id, ok := t.byKey[key]; ok {
		return id
	}
	id := uint32(len(t.byID))
	t.byID = append(t.byID, loc)
	t.byKey[key] = id
	return id
}

// Lookup returns the Location for id; ok=false when id is out of range.
func (t *Table) Lookup(id uint32) (Location, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	if int(id) >= len(t.byID) {
		return Location{}, false
	}
	return t.byID[id], true
}

// Len returns the number of interned locations.
func (t *Table) Len() int {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return len(t.byID)
}

// Snapshot returns a copy of all interned locations in id order.
func (t *Table) Snapshot() []Location {
	t.mu.RLock()
	defer t.mu.RUnlock()
	out := make([]Location, len(t.byID))
	copy(out, t.byID)
	return out
}
