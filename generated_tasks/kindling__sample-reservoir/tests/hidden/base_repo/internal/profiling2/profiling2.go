// Package profiling2 collects lightweight runtime profile snapshots
// (memstats, goroutine counts, alloc rates) for inclusion in operator
// reports. It is the runtime companion of internal/profiling.
package profiling2

import (
	"fmt"
	"runtime"
	"sort"
	"sync"
	"time"
)

// Snapshot captures one point in time.
type Snapshot struct {
	Time      time.Time
	Goroutines int
	HeapAlloc uint64
	HeapInUse uint64
	NumGC     uint32
	Custom    map[string]float64
}

// Collector aggregates snapshots over time.
type Collector struct {
	mu        sync.Mutex
	snapshots []Snapshot
	max       int
}

// New constructs a Collector that retains up to max snapshots.
func New(max int) *Collector {
	if max <= 0 {
		max = 1024
	}
	return &Collector{max: max}
}

// Take captures the current runtime stats.
func (c *Collector) Take() Snapshot {
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)
	s := Snapshot{
		Time:      time.Now(),
		Goroutines: runtime.NumGoroutine(),
		HeapAlloc: ms.HeapAlloc,
		HeapInUse: ms.HeapInuse,
		NumGC:     ms.NumGC,
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.snapshots = append(c.snapshots, s)
	if len(c.snapshots) > c.max {
		c.snapshots = c.snapshots[len(c.snapshots)-c.max:]
	}
	return s
}

// Snapshots returns a copy of the retained samples.
func (c *Collector) Snapshots() []Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := make([]Snapshot, len(c.snapshots))
	copy(out, c.snapshots)
	return out
}

// Stats summarises retained samples.
type Stats struct {
	N             int
	MeanGoroutines float64
	MeanHeap      float64
	MaxHeap       uint64
	GCDelta       uint32
}

// Summarise computes Stats over the retained snapshots.
func (c *Collector) Summarise() Stats {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.snapshots) == 0 {
		return Stats{}
	}
	var sumG, sumH float64
	var maxH uint64
	for _, s := range c.snapshots {
		sumG += float64(s.Goroutines)
		sumH += float64(s.HeapAlloc)
		if s.HeapAlloc > maxH {
			maxH = s.HeapAlloc
		}
	}
	first := c.snapshots[0]
	last := c.snapshots[len(c.snapshots)-1]
	return Stats{
		N:              len(c.snapshots),
		MeanGoroutines: sumG / float64(len(c.snapshots)),
		MeanHeap:       sumH / float64(len(c.snapshots)),
		MaxHeap:        maxH,
		GCDelta:        last.NumGC - first.NumGC,
	}
}

// FormatHistogram returns a stable histogram render of goroutine counts.
func FormatHistogram(snaps []Snapshot) string {
	counts := map[int]int{}
	for _, s := range snaps {
		counts[s.Goroutines]++
	}
	keys := make([]int, 0, len(counts))
	for k := range counts {
		keys = append(keys, k)
	}
	sort.Ints(keys)
	out := ""
	for _, k := range keys {
		out += fmt.Sprintf("g=%d count=%d\n", k, counts[k])
	}
	return out
}
