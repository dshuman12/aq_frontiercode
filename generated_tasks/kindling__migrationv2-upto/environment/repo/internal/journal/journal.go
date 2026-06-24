// Package journal records every kindling write op for later replay.
package journal

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"
)

// Outcome of one journal entry.
type Outcome string

const (
	OutcomeApplied Outcome = "Applied"
	OutcomeSkipped Outcome = "Skipped"
	OutcomeFailed  Outcome = "Failed"
)

// Entry is one journal record.
type Entry struct {
	Timestamp time.Time
	Outcome   Outcome
	Op        string
	Detail    string
	Reason    string
}

// Render renders an entry as a tab-separated line.
func (e Entry) Render() string {
	return fmt.Sprintf("%d\t%s\t%s\t%s\t%s\n",
		e.Timestamp.Unix(), e.Outcome, e.Op, e.Detail, e.Reason)
}

// Parse parses one journal line.
func Parse(line string) (Entry, error) {
	parts := strings.Split(strings.TrimRight(line, "\n"), "\t")
	if len(parts) < 4 {
		return Entry{}, fmt.Errorf("journal: short line %q", line)
	}
	var ts int64
	if _, err := fmt.Sscanf(parts[0], "%d", &ts); err != nil {
		return Entry{}, err
	}
	e := Entry{
		Timestamp: time.Unix(ts, 0).UTC(),
		Outcome:   Outcome(parts[1]),
		Op:        parts[2],
		Detail:    parts[3],
	}
	if len(parts) > 4 {
		e.Reason = parts[4]
	}
	return e, nil
}

// Store is a thread-safe append-only journal file.
type Store struct {
	mu   sync.Mutex
	path string
}

// Open returns a store at path.
func Open(path string) *Store {
	return &Store{path: path}
}

// Append writes one entry.
func (s *Store) Append(e Entry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	f, err := os.OpenFile(s.path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = f.WriteString(e.Render())
	return err
}

// ReadAll returns every parsed entry, plus the count of skipped malformed lines.
func (s *Store) ReadAll() ([]Entry, int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	f, err := os.Open(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, 0, nil
		}
		return nil, 0, err
	}
	defer f.Close()
	var out []Entry
	skipped := 0
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		e, err := Parse(line)
		if err != nil {
			skipped++
			continue
		}
		out = append(out, e)
	}
	return out, skipped, scanner.Err()
}

// Stats summarizes a slice of entries.
type Stats struct {
	Total   uint64
	Applied uint64
	Skipped uint64
	Failed  uint64
}

// Summarize folds entries into Stats.
func Summarize(entries []Entry) Stats {
	var s Stats
	for _, e := range entries {
		s.Total++
		switch e.Outcome {
		case OutcomeApplied:
			s.Applied++
		case OutcomeSkipped:
			s.Skipped++
		case OutcomeFailed:
			s.Failed++
		}
	}
	return s
}
