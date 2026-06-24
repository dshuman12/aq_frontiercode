// Package fingerprint computes stable fingerprints for kindling
// records.
package fingerprint

import (
	"sort"
	"strings"

	"github.com/dleblanc/kindling/internal/hash"
	"github.com/dleblanc/kindling/internal/record"
)

// Fields takes a Record and returns a stable 12-char fingerprint over
// (level, service, message, sorted fields).
func Fields(r *record.Record) string {
	var sb strings.Builder
	sb.WriteString(r.Level)
	sb.WriteByte('|')
	sb.WriteString(r.Service)
	sb.WriteByte('|')
	sb.WriteString(r.Message)
	sb.WriteByte('|')
	keys := make([]string, 0, len(r.Fields))
	for k := range r.Fields {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		sb.WriteString(k)
		sb.WriteByte('=')
		sb.WriteString(r.Fields[k])
		sb.WriteByte(';')
	}
	return hash.Truncate(hash.Hex(hash.AlgSHA256, []byte(sb.String())), 12)
}

// Cluster groups a slice of records by their fingerprint.
func Cluster(recs []*record.Record) map[string][]*record.Record {
	out := map[string][]*record.Record{}
	for _, r := range recs {
		fp := Fields(r)
		out[fp] = append(out[fp], r)
	}
	return out
}

// LargestCluster returns the largest cluster size among recs.
func LargestCluster(recs []*record.Record) int {
	cls := Cluster(recs)
	var n int
	for _, c := range cls {
		if len(c) > n {
			n = len(c)
		}
	}
	return n
}
