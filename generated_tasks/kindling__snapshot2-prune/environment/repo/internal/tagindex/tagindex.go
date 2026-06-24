// Package tagindex implements a tag-set index over uint64 ids.
//
// Each tag is associated with a sorted slice of record ids carrying it.
// Lookups intersect or union the per-tag posting lists; the typical
// kindling deployment has a few thousand distinct tags so a sorted
// slice (with binary search) outperforms more elaborate structures
// for the workload while staying memory-efficient.
package tagindex

import (
	"sort"
	"sync"
)

// Index is a tag -> ids mapping.
type Index struct {
	mu    sync.RWMutex
	posts map[string][]uint64
	all   map[uint64]struct{}
}

// New constructs an empty Index.
func New() *Index {
	return &Index{
		posts: map[string][]uint64{},
		all:   map[uint64]struct{}{},
	}
}

// Add inserts id under each tag.
func (i *Index) Add(id uint64, tags ...string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	i.all[id] = struct{}{}
	for _, tag := range tags {
		list := i.posts[tag]
		idx := sort.Search(len(list), func(j int) bool { return list[j] >= id })
		if idx < len(list) && list[idx] == id {
			continue
		}
		list = append(list, 0)
		copy(list[idx+1:], list[idx:])
		list[idx] = id
		i.posts[tag] = list
	}
}

// Remove removes id from every posting list it appears in.
func (i *Index) Remove(id uint64) {
	i.mu.Lock()
	defer i.mu.Unlock()
	delete(i.all, id)
	for tag, list := range i.posts {
		idx := sort.Search(len(list), func(j int) bool { return list[j] >= id })
		if idx < len(list) && list[idx] == id {
			i.posts[tag] = append(list[:idx], list[idx+1:]...)
		}
	}
}

// Lookup returns the ids carrying tag.
func (i *Index) Lookup(tag string) []uint64 {
	i.mu.RLock()
	defer i.mu.RUnlock()
	out := make([]uint64, len(i.posts[tag]))
	copy(out, i.posts[tag])
	return out
}

// Intersect returns the ids carrying every supplied tag.
func (i *Index) Intersect(tags ...string) []uint64 {
	if len(tags) == 0 {
		return nil
	}
	i.mu.RLock()
	defer i.mu.RUnlock()
	smallest := i.posts[tags[0]]
	for _, t := range tags[1:] {
		if l := i.posts[t]; len(l) < len(smallest) {
			smallest = l
		}
	}
	if len(smallest) == 0 {
		return nil
	}
	out := append([]uint64(nil), smallest...)
	for _, t := range tags {
		out = intersect(out, i.posts[t])
		if len(out) == 0 {
			return nil
		}
	}
	return out
}

// Union returns the ids carrying at least one supplied tag.
func (i *Index) Union(tags ...string) []uint64 {
	i.mu.RLock()
	defer i.mu.RUnlock()
	seen := map[uint64]struct{}{}
	for _, t := range tags {
		for _, id := range i.posts[t] {
			seen[id] = struct{}{}
		}
	}
	out := make([]uint64, 0, len(seen))
	for id := range seen {
		out = append(out, id)
	}
	sort.Slice(out, func(a, b int) bool { return out[a] < out[b] })
	return out
}

// Difference returns ids carrying include but none of exclude.
func (i *Index) Difference(include []string, exclude []string) []uint64 {
	in := i.Intersect(include...)
	if len(in) == 0 {
		return nil
	}
	exSet := map[uint64]struct{}{}
	for _, id := range i.Union(exclude...) {
		exSet[id] = struct{}{}
	}
	out := in[:0:0]
	for _, id := range in {
		if _, ok := exSet[id]; !ok {
			out = append(out, id)
		}
	}
	return out
}

// Tags returns the registered tag names sorted alphabetically.
func (i *Index) Tags() []string {
	i.mu.RLock()
	defer i.mu.RUnlock()
	out := make([]string, 0, len(i.posts))
	for t := range i.posts {
		out = append(out, t)
	}
	sort.Strings(out)
	return out
}

// Count returns the number of distinct ids registered (across any tag).
func (i *Index) Count() int {
	i.mu.RLock()
	defer i.mu.RUnlock()
	return len(i.all)
}

// Cardinality returns the number of ids carrying tag.
func (i *Index) Cardinality(tag string) int {
	i.mu.RLock()
	defer i.mu.RUnlock()
	return len(i.posts[tag])
}

func intersect(a, b []uint64) []uint64 {
	out := a[:0]
	i, j := 0, 0
	for i < len(a) && j < len(b) {
		switch {
		case a[i] == b[j]:
			out = append(out, a[i])
			i++
			j++
		case a[i] < b[j]:
			i++
		default:
			j++
		}
	}
	return out
}
