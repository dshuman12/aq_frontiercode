// Package group performs group-by aggregations over records.
package group

import (
	"sort"

	"github.com/dleblanc/kindling/internal/record"
)

// Bucket is a group of records sharing the same key.
type Bucket struct {
	Key     string
	Count   uint64
	Records []*record.Record
}

// By groups records by the value of field, returning sorted buckets
// (descending by count).
func By(field string, recs []*record.Record) []Bucket {
	by := map[string]*Bucket{}
	for _, r := range recs {
		key := keyOf(field, r)
		b := by[key]
		if b == nil {
			b = &Bucket{Key: key}
			by[key] = b
		}
		b.Count++
		b.Records = append(b.Records, r)
	}
	out := make([]Bucket, 0, len(by))
	for _, b := range by {
		out = append(out, *b)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Count != out[j].Count {
			return out[i].Count > out[j].Count
		}
		return out[i].Key < out[j].Key
	})
	return out
}

func keyOf(field string, r *record.Record) string {
	switch field {
	case "level":
		return r.Level
	case "service":
		return r.Service
	default:
		return r.Field(field)
	}
}

// TopN returns the first n buckets, or all if n >= len.
func TopN(buckets []Bucket, n int) []Bucket {
	if n <= 0 || n >= len(buckets) {
		return buckets
	}
	return buckets[:n]
}
