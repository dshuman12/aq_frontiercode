// Package queryexec executes a parsed query against an in-memory record
// store and returns the matching records. It is the runtime
// counterpart of internal/queryplanner.
package queryexec

import (
	"errors"
	"sort"
	"strings"

	"github.com/dleblanc/kindling/internal/parse"
	"github.com/dleblanc/kindling/internal/record"
)

// Stats reports execution counters.
type Stats struct {
	Examined int
	Matched  int
	Filtered int
}

// Result wraps the matching records and stats.
type Result struct {
	Records []*record.Record
	Stats   Stats
}

// Execute filters records using q.
func Execute(q *parse.Query, records []*record.Record) (*Result, error) {
	if q == nil {
		return nil, errors.New("queryexec: nil query")
	}
	res := &Result{}
	for _, r := range records {
		res.Stats.Examined++
		if matches(q, r) {
			res.Records = append(res.Records, r)
			res.Stats.Matched++
		} else {
			res.Stats.Filtered++
		}
	}
	return res, nil
}

func matches(q *parse.Query, r *record.Record) bool {
	for _, conj := range q.Disjuncts {
		ok := true
		for _, p := range conj.Preds {
			if !matchesPred(p, r) {
				ok = false
				break
			}
		}
		if ok {
			return true
		}
	}
	return false
}

func matchesPred(p parse.Predicate, r *record.Record) bool {
	v := fieldValue(r, p.Field)
	switch p.Op {
	case parse.OpEq:
		return v == p.Value.Str
	case parse.OpNe:
		return v != p.Value.Str
	case parse.OpContains:
		return strings.Contains(v, p.Value.Str)
	}
	return false
}

func fieldValue(r *record.Record, name string) string {
	switch name {
	case "level":
		return r.Level
	case "service":
		return r.Service
	case "msg", "message":
		return r.Message
	}
	return r.Fields[name]
}

// SortBy sorts records by the named field.
func SortBy(records []*record.Record, field string, descending bool) {
	sort.SliceStable(records, func(i, j int) bool {
		a := fieldValue(records[i], field)
		b := fieldValue(records[j], field)
		if descending {
			return a > b
		}
		return a < b
	})
}

// First returns the first n records or fewer.
func First(records []*record.Record, n int) []*record.Record {
	if n <= 0 || n > len(records) {
		return records
	}
	return records[:n]
}

// FieldFrequency returns the histogram of values for the given field.
func FieldFrequency(records []*record.Record, field string) map[string]int {
	out := map[string]int{}
	for _, r := range records {
		out[fieldValue(r, field)]++
	}
	return out
}

// DistinctValues returns the sorted distinct values of field.
func DistinctValues(records []*record.Record, field string) []string {
	seen := map[string]struct{}{}
	for _, r := range records {
		seen[fieldValue(r, field)] = struct{}{}
	}
	out := make([]string, 0, len(seen))
	for v := range seen {
		out = append(out, v)
	}
	sort.Strings(out)
	return out
}
