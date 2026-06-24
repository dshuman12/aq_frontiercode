// Package topk implements the Space-Saving algorithm for streaming heavy
// hitters. It identifies the top-k most frequent items in a stream using
// O(k) memory.
//
// The algorithm: maintain a fixed-size table of (item, count) pairs. On
// each new item, increment its counter if present, otherwise evict the
// pair with the smallest counter and replace its item, inheriting the old
// counter. The inherited counter is an upper bound on the new item's
// actual frequency; subtracting the original count gives a lower bound.
package topk

import (
	"sort"
)

// Item is one entry in the top-k table.
type Item struct {
	Key     string
	Count   uint64
	Inherit uint64 // initial counter when the slot was claimed
}

// LowerBound returns Count - Inherit, a lower bound on the actual frequency.
func (i Item) LowerBound() uint64 {
	if i.Count < i.Inherit {
		return 0
	}
	return i.Count - i.Inherit
}

// Tracker tracks the top-k heavy hitters.
type Tracker struct {
	k     int
	byKey map[string]int
	items []Item
}

// New constructs a Tracker with capacity k.
func New(k int) *Tracker {
	if k <= 0 {
		k = 1
	}
	return &Tracker{
		k:     k,
		byKey: make(map[string]int, k),
		items: make([]Item, 0, k),
	}
}

// Observe records key.
func (t *Tracker) Observe(key string) {
	t.ObserveN(key, 1)
}

// ObserveN records key n times.
func (t *Tracker) ObserveN(key string, n uint64) {
	if idx, ok := t.byKey[key]; ok {
		t.items[idx].Count += n
		return
	}
	if len(t.items) < t.k {
		t.items = append(t.items, Item{Key: key, Count: n})
		t.byKey[key] = len(t.items) - 1
		return
	}
	minIdx := 0
	for i, it := range t.items {
		if it.Count < t.items[minIdx].Count {
			minIdx = i
		}
	}
	delete(t.byKey, t.items[minIdx].Key)
	t.items[minIdx] = Item{Key: key, Count: t.items[minIdx].Count + n, Inherit: t.items[minIdx].Count}
	t.byKey[key] = minIdx
}

// Snapshot returns the current items in descending count order.
func (t *Tracker) Snapshot() []Item {
	out := make([]Item, len(t.items))
	copy(out, t.items)
	sort.Slice(out, func(i, j int) bool { return out[i].Count > out[j].Count })
	return out
}

// Len returns the number of tracked items.
func (t *Tracker) Len() int { return len(t.items) }

// Reset clears the tracker.
func (t *Tracker) Reset() {
	t.byKey = make(map[string]int, t.k)
	t.items = t.items[:0]
}
