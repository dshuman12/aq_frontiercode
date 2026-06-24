// Package schemastore registers and retrieves versioned schemas for
// the records flowing through kindling. Each schema is identified by a
// (subject, version) pair. Subjects evolve forward only: registering a
// version that strictly extends the prior version's fields is allowed,
// renaming or dropping fields is rejected.
package schemastore

import (
	"errors"
	"fmt"
	"sort"
	"sync"
)

// Type is the wire-level type of a field.
type Type string

const (
	TString Type = "string"
	TInt    Type = "int"
	TFloat  Type = "float"
	TBool   Type = "bool"
	TBytes  Type = "bytes"
	TTime   Type = "time"
	TArray  Type = "array"
	TObject Type = "object"
)

// Field is one field in a schema.
type Field struct {
	Name     string
	Type     Type
	Optional bool
	Doc      string
}

// Schema is one version of a subject.
type Schema struct {
	Subject string
	Version int
	Fields  []Field
}

// Validate checks Schema for self-consistency.
func (s *Schema) Validate() error {
	if s.Subject == "" {
		return errors.New("schemastore: subject required")
	}
	if s.Version <= 0 {
		return errors.New("schemastore: version must be positive")
	}
	seen := map[string]struct{}{}
	for _, f := range s.Fields {
		if f.Name == "" {
			return errors.New("schemastore: empty field name")
		}
		if _, dup := seen[f.Name]; dup {
			return fmt.Errorf("schemastore: duplicate field %q", f.Name)
		}
		seen[f.Name] = struct{}{}
		if !typeValid(f.Type) {
			return fmt.Errorf("schemastore: bad type %q", f.Type)
		}
	}
	return nil
}

func typeValid(t Type) bool {
	switch t {
	case TString, TInt, TFloat, TBool, TBytes, TTime, TArray, TObject:
		return true
	}
	return false
}

// Store maintains schemas keyed by (subject, version).
type Store struct {
	mu       sync.RWMutex
	versions map[string][]*Schema // subject -> ordered
}

// New constructs an empty Store.
func New() *Store { return &Store{versions: map[string][]*Schema{}} }

// Register validates s and stores it. The next-allowed version for
// subject is len(existing) + 1; mismatched versions are rejected.
func (s *Store) Register(schema *Schema) error {
	if err := schema.Validate(); err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	existing := s.versions[schema.Subject]
	want := len(existing) + 1
	if schema.Version != want {
		return fmt.Errorf("schemastore: expected version %d, got %d", want, schema.Version)
	}
	if len(existing) > 0 {
		if err := compatible(existing[len(existing)-1], schema); err != nil {
			return err
		}
	}
	s.versions[schema.Subject] = append(existing, schema)
	return nil
}

// Get returns the schema for (subject, version).
func (s *Store) Get(subject string, version int) (*Schema, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	versions, ok := s.versions[subject]
	if !ok {
		return nil, fmt.Errorf("schemastore: unknown subject %q", subject)
	}
	if version < 1 || version > len(versions) {
		return nil, fmt.Errorf("schemastore: version %d out of range", version)
	}
	return versions[version-1], nil
}

// Latest returns the highest-version schema for subject.
func (s *Store) Latest(subject string) (*Schema, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	versions, ok := s.versions[subject]
	if !ok || len(versions) == 0 {
		return nil, fmt.Errorf("schemastore: unknown subject %q", subject)
	}
	return versions[len(versions)-1], nil
}

// Subjects returns the registered subject names sorted alphabetically.
func (s *Store) Subjects() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]string, 0, len(s.versions))
	for k := range s.versions {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// Diff returns the new fields added between a and b. b is assumed to be
// a later version of a; rename/remove is rejected by Register so this
// call cannot encounter them when both a and b come from the same Store.
func Diff(a, b *Schema) []Field {
	if a == nil {
		return append([]Field(nil), b.Fields...)
	}
	have := map[string]Type{}
	for _, f := range a.Fields {
		have[f.Name] = f.Type
	}
	var added []Field
	for _, f := range b.Fields {
		if _, ok := have[f.Name]; !ok {
			added = append(added, f)
		}
	}
	return added
}

func compatible(prev, next *Schema) error {
	prevByName := map[string]Field{}
	for _, f := range prev.Fields {
		prevByName[f.Name] = f
	}
	for _, p := range prev.Fields {
		found := false
		for _, n := range next.Fields {
			if n.Name == p.Name {
				if n.Type != p.Type {
					return fmt.Errorf("schemastore: field %q type changed (%s -> %s)", p.Name, p.Type, n.Type)
				}
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("schemastore: field %q removed", p.Name)
		}
	}
	for _, n := range next.Fields {
		if old, ok := prevByName[n.Name]; ok && old.Type != n.Type {
			return fmt.Errorf("schemastore: field %q type changed", n.Name)
		}
	}
	return nil
}
