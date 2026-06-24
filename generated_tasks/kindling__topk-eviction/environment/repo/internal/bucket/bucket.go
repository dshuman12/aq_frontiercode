// Package bucket aggregates records into time buckets.
package bucket

import (
	"sort"
	"time"

	"github.com/dleblanc/kindling/internal/record"
	"github.com/dleblanc/kindling/internal/util/timex"
)

// Cell is one (time-bucket, count) pair.
type Cell struct {
	BucketStart time.Time
	Count       uint64
}

// Aggregate buckets records by the start of their containing window
// of size dur, returning ordered cells.
func Aggregate(recs []*record.Record, dur time.Duration) []Cell {
	by := map[time.Time]*Cell{}
	for _, r := range recs {
		k := timex.Bucket(r.Timestamp, dur)
		c := by[k]
		if c == nil {
			c = &Cell{BucketStart: k}
			by[k] = c
		}
		c.Count++
	}
	out := make([]Cell, 0, len(by))
	for _, c := range by {
		out = append(out, *c)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].BucketStart.Before(out[j].BucketStart)
	})
	return out
}

// Sparse fills missing buckets between the first and last cell with
// zero-count cells.
func Sparse(cells []Cell, dur time.Duration) []Cell {
	if len(cells) <= 1 {
		return cells
	}
	first := cells[0].BucketStart
	last := cells[len(cells)-1].BucketStart
	have := map[time.Time]Cell{}
	for _, c := range cells {
		have[c.BucketStart] = c
	}
	out := make([]Cell, 0, int(last.Sub(first)/dur)+1)
	for t := first; !t.After(last); t = t.Add(dur) {
		if c, ok := have[t]; ok {
			out = append(out, c)
		} else {
			out = append(out, Cell{BucketStart: t, Count: 0})
		}
	}
	return out
}

// Total sums the counts across cells.
func Total(cells []Cell) uint64 {
	var n uint64
	for _, c := range cells {
		n += c.Count
	}
	return n
}
