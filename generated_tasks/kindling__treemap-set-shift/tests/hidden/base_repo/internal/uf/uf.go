// Package uf is a disjoint-set (union-find) data structure.
package uf

// UnionFind tracks connectivity over n elements.
type UnionFind struct {
	parent []int
	rank   []int
	size   []int
}

// New returns a fresh union-find with n singletons.
func New(n int) *UnionFind {
	uf := &UnionFind{
		parent: make([]int, n),
		rank:   make([]int, n),
		size:   make([]int, n),
	}
	for i := 0; i < n; i++ {
		uf.parent[i] = i
		uf.size[i] = 1
	}
	return uf
}

// Len returns the total number of elements.
func (u *UnionFind) Len() int { return len(u.parent) }

// Find returns the root of i with path compression.
func (u *UnionFind) Find(i int) int {
	root := i
	for u.parent[root] != root {
		root = u.parent[root]
	}
	for cur := i; u.parent[cur] != root; {
		next := u.parent[cur]
		u.parent[cur] = root
		cur = next
	}
	return root
}

// Union merges the sets containing a and b. Returns true if previously distinct.
func (u *UnionFind) Union(a, b int) bool {
	ra, rb := u.Find(a), u.Find(b)
	if ra == rb {
		return false
	}
	small, big := ra, rb
	if u.rank[small] > u.rank[big] {
		small, big = big, small
	}
	u.parent[small] = big
	if u.rank[small] == u.rank[big] {
		u.rank[big]++
	}
	u.size[big] += u.size[small]
	return true
}

// Connected reports whether a and b share a set.
func (u *UnionFind) Connected(a, b int) bool {
	return u.Find(a) == u.Find(b)
}

// SetSize returns the size of the set containing i.
func (u *UnionFind) SetSize(i int) int {
	return u.size[u.Find(i)]
}
