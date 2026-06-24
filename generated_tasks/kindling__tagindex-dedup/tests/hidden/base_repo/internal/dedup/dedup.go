// Package dedup deduplicates records by fingerprint.
package dedup

import (
	"github.com/dleblanc/kindling/internal/fingerprint"
	"github.com/dleblanc/kindling/internal/record"
)

// Dedup returns records with duplicate fingerprints removed.
func Dedup(recs []*record.Record) []*record.Record {
	seen := map[string]struct{}{}
	out := make([]*record.Record, 0, len(recs))
	for _, r := range recs {
		fp := fingerprint.Fields(r)
		if _, exists := seen[fp]; exists {
			continue
		}
		seen[fp] = struct{}{}
		out = append(out, r)
	}
	return out
}

// Stats summarizes a deduplication pass.
type Stats struct {
	Input   uint64
	Kept    uint64
	Dropped uint64
}

// DedupWithStats returns the deduped slice plus stats.
func DedupWithStats(recs []*record.Record) ([]*record.Record, Stats) {
	out := Dedup(recs)
	return out, Stats{
		Input:   uint64(len(recs)),
		Kept:    uint64(len(out)),
		Dropped: uint64(len(recs) - len(out)),
	}
}

// FingerprintAll returns the slice of every record's fingerprint.
func FingerprintAll(recs []*record.Record) []string {
	out := make([]string, len(recs))
	for i, r := range recs {
		out[i] = fingerprint.Fields(r)
	}
	return out
}
