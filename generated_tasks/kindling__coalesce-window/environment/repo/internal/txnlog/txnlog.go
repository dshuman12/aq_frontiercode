// Package txnlog implements an in-memory transactional log used by the
// snapshotter to maintain crash-consistent index state.
//
// A "transaction" is a batch of records that must commit atomically.
// Until Commit is called, the records sit in a staging area; readers
// see the previous committed state. After Commit, the staging records
// become the new committed state and the staging area resets.
package txnlog

import (
	"errors"
	"sort"
	"sync"
	"time"
)

// Record is one entry in the log.
type Record struct {
	ID    uint64
	Time  time.Time
	Value any
}

// Snapshot is a stable view of the log.
type Snapshot struct {
	Records []Record
}

// Log is a transactional in-memory record log.
type Log struct {
	mu         sync.RWMutex
	committed  []Record
	staging    []Record
	nextID     uint64
	pendingTxn bool
}

// New constructs an empty Log.
func New() *Log { return &Log{} }

// Begin opens a transaction. ErrTxnInProgress if one is already open.
func (l *Log) Begin() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.pendingTxn {
		return ErrTxnInProgress
	}
	l.pendingTxn = true
	l.staging = nil
	return nil
}

// ErrTxnInProgress is returned when Begin is called twice without Commit.
var ErrTxnInProgress = errors.New("txnlog: transaction already in progress")

// ErrNoTxn is returned when Append is called outside a transaction.
var ErrNoTxn = errors.New("txnlog: no transaction in progress")

// Append adds a record to the active transaction.
func (l *Log) Append(value any) (uint64, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if !l.pendingTxn {
		return 0, ErrNoTxn
	}
	l.nextID++
	id := l.nextID
	l.staging = append(l.staging, Record{ID: id, Time: time.Now(), Value: value})
	return id, nil
}

// Commit applies the staged records.
func (l *Log) Commit() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if !l.pendingTxn {
		return ErrNoTxn
	}
	l.committed = append(l.committed, l.staging...)
	l.staging = nil
	l.pendingTxn = false
	return nil
}

// Rollback discards the staging area and rewinds the id counter.
func (l *Log) Rollback() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if !l.pendingTxn {
		return ErrNoTxn
	}
	l.nextID -= uint64(len(l.staging))
	l.staging = nil
	l.pendingTxn = false
	return nil
}

// Snapshot returns a stable copy of the committed log.
func (l *Log) Snapshot() Snapshot {
	l.mu.RLock()
	defer l.mu.RUnlock()
	out := make([]Record, len(l.committed))
	copy(out, l.committed)
	return Snapshot{Records: out}
}

// Lookup returns the record with the given id, or ok=false.
func (l *Log) Lookup(id uint64) (Record, bool) {
	l.mu.RLock()
	defer l.mu.RUnlock()
	idx := sort.Search(len(l.committed), func(i int) bool { return l.committed[i].ID >= id })
	if idx < len(l.committed) && l.committed[idx].ID == id {
		return l.committed[idx], true
	}
	return Record{}, false
}

// Len returns the number of committed records.
func (l *Log) Len() int {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return len(l.committed)
}

// PendingLen returns the number of records currently staged.
func (l *Log) PendingLen() int {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return len(l.staging)
}

// Truncate keeps only records with id > cutoff.
func (l *Log) Truncate(cutoff uint64) int {
	l.mu.Lock()
	defer l.mu.Unlock()
	idx := sort.Search(len(l.committed), func(i int) bool { return l.committed[i].ID > cutoff })
	removed := idx
	l.committed = append(l.committed[:0], l.committed[idx:]...)
	return removed
}
