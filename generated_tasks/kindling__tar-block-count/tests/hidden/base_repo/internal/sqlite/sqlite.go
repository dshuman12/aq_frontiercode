// Package sqlite is a tiny in-memory KV store that mimics enough of
// sqlite's API to be a drop-in for kindling's lightweight metadata
// persistence. It does not parse SQL; callers use Get/Put/Delete.
package sqlite

import (
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"
)

// ErrNotFound is returned for missing keys.
var ErrNotFound = errors.New("sqlite: not found")

// ErrClosed is returned after Close.
var ErrClosed = errors.New("sqlite: closed")

// Table is a single named key/value table.
type Table struct {
	mu      sync.RWMutex
	name    string
	rows    map[string][]byte
	created time.Time
	updated time.Time
}

// Database is a collection of tables.
type Database struct {
	mu     sync.RWMutex
	name   string
	tables map[string]*Table
	closed bool
	stats  Stats
}

// Stats summarises database operations.
type Stats struct {
	Reads         uint64
	Writes        uint64
	Deletes       uint64
	TablesCreated uint64
}

// Open creates or opens a Database.
func Open(name string) (*Database, error) {
	if name == "" {
		return nil, errors.New("sqlite: name required")
	}
	return &Database{
		name:   name,
		tables: map[string]*Table{},
	}, nil
}

// Name returns the database name.
func (d *Database) Name() string { return d.name }

// CreateTable adds a new empty table.
func (d *Database) CreateTable(name string) (*Table, error) {
	if name == "" {
		return nil, errors.New("sqlite: table name required")
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.closed {
		return nil, ErrClosed
	}
	if _, ok := d.tables[name]; ok {
		return nil, fmt.Errorf("sqlite: table %q exists", name)
	}
	t := &Table{
		name:    name,
		rows:    map[string][]byte{},
		created: time.Now(),
		updated: time.Now(),
	}
	d.tables[name] = t
	d.stats.TablesCreated++
	return t, nil
}

// DropTable removes a table.
func (d *Database) DropTable(name string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.closed {
		return ErrClosed
	}
	if _, ok := d.tables[name]; !ok {
		return ErrNotFound
	}
	delete(d.tables, name)
	return nil
}

// Table returns a previously created table.
func (d *Database) Table(name string) (*Table, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	if d.closed {
		return nil, ErrClosed
	}
	t, ok := d.tables[name]
	if !ok {
		return nil, ErrNotFound
	}
	return t, nil
}

// Tables lists registered table names alphabetically.
func (d *Database) Tables() []string {
	d.mu.RLock()
	defer d.mu.RUnlock()
	out := make([]string, 0, len(d.tables))
	for n := range d.tables {
		out = append(out, n)
	}
	sort.Strings(out)
	return out
}

// Stats returns the database stats snapshot.
func (d *Database) Stats() Stats {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.stats
}

// Close marks the database as closed.
func (d *Database) Close() error {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.closed = true
	return nil
}

// Name returns the table's name.
func (t *Table) Name() string { return t.name }

// Put inserts or replaces a row.
func (t *Table) Put(key string, value []byte) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.rows[key] = append([]byte(nil), value...)
	t.updated = time.Now()
	return nil
}

// Get returns the value for key.
func (t *Table) Get(key string) ([]byte, error) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	v, ok := t.rows[key]
	if !ok {
		return nil, ErrNotFound
	}
	return append([]byte(nil), v...), nil
}

// Delete removes a row.
func (t *Table) Delete(key string) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	if _, ok := t.rows[key]; !ok {
		return ErrNotFound
	}
	delete(t.rows, key)
	t.updated = time.Now()
	return nil
}

// Has reports whether key exists.
func (t *Table) Has(key string) bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	_, ok := t.rows[key]
	return ok
}

// Len returns the number of rows.
func (t *Table) Len() int {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return len(t.rows)
}

// Keys returns all keys, sorted.
func (t *Table) Keys() []string {
	t.mu.RLock()
	defer t.mu.RUnlock()
	out := make([]string, 0, len(t.rows))
	for k := range t.rows {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// Each invokes fn for each row in key order.
func (t *Table) Each(fn func(key string, value []byte) bool) {
	for _, k := range t.Keys() {
		t.mu.RLock()
		v := append([]byte(nil), t.rows[k]...)
		t.mu.RUnlock()
		if !fn(k, v) {
			return
		}
	}
}

// Range invokes fn for keys in [lo, hi).
func (t *Table) Range(lo, hi string, fn func(key string, value []byte) bool) {
	keys := t.Keys()
	for _, k := range keys {
		if k < lo {
			continue
		}
		if hi != "" && k >= hi {
			return
		}
		t.mu.RLock()
		v := append([]byte(nil), t.rows[k]...)
		t.mu.RUnlock()
		if !fn(k, v) {
			return
		}
	}
}

// Truncate removes all rows.
func (t *Table) Truncate() {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.rows = map[string][]byte{}
	t.updated = time.Now()
}

// Created returns the table creation time.
func (t *Table) Created() time.Time { return t.created }

// Updated returns the most recent write time.
func (t *Table) Updated() time.Time {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.updated
}
