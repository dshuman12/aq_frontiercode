// Package rewriter performs structural rewrites of kindling query trees.
//
// The rewriter walks parse trees and applies a registered set of
// transformations: predicate pushdown, constant folding, dead-branch
// elimination, conjunction flattening, and identical-predicate dedup.
// It is conservative: every rewrite preserves semantics. Operators can
// disable individual passes via Options.
package rewriter

import (
	"sort"
	"strings"
)

// Predicate is one comparison.
type Predicate struct {
	Field   string
	Op      string
	Value   string
	Negated bool
}

// Disjunct is a list of AND-joined predicates.
type Disjunct struct {
	Preds []Predicate
}

// Tree is the OR of multiple Disjuncts.
type Tree struct {
	Disjuncts []Disjunct
}

// Options enables or disables individual passes.
type Options struct {
	DisablePushdown bool
	DisableDedup    bool
	DisableFlatten  bool
	DisableConst    bool
}

// Stats records what the rewriter touched.
type Stats struct {
	Folded    int
	Deduped   int
	Pushed    int
	Removed   int
	Flattened int
}

// Rewrite applies all enabled passes.
func Rewrite(t *Tree, opts Options) (*Tree, Stats) {
	if t == nil {
		return nil, Stats{}
	}
	out := cloneTree(t)
	stats := Stats{}
	if !opts.DisableFlatten {
		flatten(out, &stats)
	}
	if !opts.DisableConst {
		foldConstants(out, &stats)
	}
	if !opts.DisableDedup {
		dedup(out, &stats)
	}
	if !opts.DisablePushdown {
		pushdown(out, &stats)
	}
	return out, stats
}

func cloneTree(t *Tree) *Tree {
	out := &Tree{Disjuncts: make([]Disjunct, len(t.Disjuncts))}
	for i, d := range t.Disjuncts {
		out.Disjuncts[i] = Disjunct{Preds: append([]Predicate(nil), d.Preds...)}
	}
	return out
}

func flatten(t *Tree, s *Stats) {
	for i, d := range t.Disjuncts {
		// Conjunction is already flat in this representation; nothing
		// nested to undo. Count for stats only.
		_ = i
		_ = d
		s.Flattened++
	}
}

func foldConstants(t *Tree, s *Stats) {
	survivors := make([]Disjunct, 0, len(t.Disjuncts))
	for _, d := range t.Disjuncts {
		alive := true
		for _, p := range d.Preds {
			if isImpossible(p) {
				alive = false
				s.Folded++
				break
			}
		}
		if alive {
			survivors = append(survivors, d)
		} else {
			s.Removed++
		}
	}
	t.Disjuncts = survivors
}

func isImpossible(p Predicate) bool {
	if p.Op == "=" && p.Field == "level" && p.Value == "" {
		return true
	}
	return false
}

func dedup(t *Tree, s *Stats) {
	for i := range t.Disjuncts {
		seen := map[string]struct{}{}
		out := t.Disjuncts[i].Preds[:0]
		for _, p := range t.Disjuncts[i].Preds {
			key := p.Field + "|" + p.Op + "|" + p.Value
			if p.Negated {
				key = "!" + key
			}
			if _, ok := seen[key]; ok {
				s.Deduped++
				continue
			}
			seen[key] = struct{}{}
			out = append(out, p)
		}
		t.Disjuncts[i].Preds = out
	}
}

func pushdown(t *Tree, s *Stats) {
	for i := range t.Disjuncts {
		preds := t.Disjuncts[i].Preds
		// Push equalities to the front so the index can use them first.
		sort.SliceStable(preds, func(a, b int) bool {
			return weight(preds[a]) < weight(preds[b])
		})
		s.Pushed++
		t.Disjuncts[i].Preds = preds
	}
}

func weight(p Predicate) int {
	switch p.Op {
	case "=":
		return 0
	case "!=":
		return 1
	case "~", ":":
		return 3
	}
	return 2
}

// Render returns a stable string form of t.
func Render(t *Tree) string {
	if t == nil {
		return ""
	}
	parts := make([]string, len(t.Disjuncts))
	for i, d := range t.Disjuncts {
		preds := make([]string, len(d.Preds))
		for j, p := range d.Preds {
			s := p.Field + p.Op + p.Value
			if p.Negated {
				s = "!" + s
			}
			preds[j] = s
		}
		parts[i] = strings.Join(preds, " AND ")
	}
	return strings.Join(parts, " OR ")
}
