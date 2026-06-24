// Package record holds the structured record type that flows through
// every other kindling subsystem.
package record

import (
	"strings"
	"time"
)

// Record is one structured log entry.
type Record struct {
	// Timestamp of the event.
	Timestamp time.Time
	// Severity / level (info / warn / error / debug).
	Level string
	// Message body.
	Message string
	// Service / component name.
	Service string
	// Free-form structured fields, key -> value.
	Fields map[string]string
}

// HasField returns true when key is present (with any value).
func (r *Record) HasField(key string) bool {
	_, ok := r.Fields[key]
	return ok
}

// Field returns the value of key, or "" if absent.
func (r *Record) Field(key string) string {
	if r.Fields == nil {
		return ""
	}
	return r.Fields[key]
}

// SetField inserts or overwrites a field.
func (r *Record) SetField(key, value string) {
	if r.Fields == nil {
		r.Fields = make(map[string]string, 4)
	}
	r.Fields[key] = value
}

// FieldNames returns the field keys in deterministic (sorted) order.
func (r *Record) FieldNames() []string {
	if len(r.Fields) == 0 {
		return nil
	}
	out := make([]string, 0, len(r.Fields))
	for k := range r.Fields {
		out = append(out, k)
	}
	// Insertion sort - small N.
	for i := 1; i < len(out); i++ {
		for j := i; j > 0 && out[j-1] > out[j]; j-- {
			out[j-1], out[j] = out[j], out[j-1]
		}
	}
	return out
}

// Match returns true if r contains all kv pairs.
func (r *Record) Match(kv map[string]string) bool {
	for k, v := range kv {
		if r.Field(k) != v {
			return false
		}
	}
	return true
}

// MatchPrefix returns true when each value in kv is a prefix of the
// corresponding field on r.
func (r *Record) MatchPrefix(kv map[string]string) bool {
	for k, v := range kv {
		if !strings.HasPrefix(r.Field(k), v) {
			return false
		}
	}
	return true
}

// Equal returns true when two records are field-by-field identical.
func (r *Record) Equal(other *Record) bool {
	if r.Level != other.Level || r.Message != other.Message ||
		r.Service != other.Service || !r.Timestamp.Equal(other.Timestamp) {
		return false
	}
	if len(r.Fields) != len(other.Fields) {
		return false
	}
	for k, v := range r.Fields {
		if other.Field(k) != v {
			return false
		}
	}
	return true
}
