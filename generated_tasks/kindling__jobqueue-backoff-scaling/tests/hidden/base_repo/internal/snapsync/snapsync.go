// Package snapsync computes the delta between two snapshots and
// produces a list of operations needed to bring source up to target.
//
// It is the engine behind the kindling "promote-snapshot" command: an
// operator points it at an old snapshot and the canonical one, and
// kindling reports which files to copy, replace or delete.
package snapsync

import (
	"sort"
)

// File describes one file in a snapshot.
type File struct {
	Path string
	Size int64
	SHA  string
}

// Op is one synchronisation operation.
type Op struct {
	Action string // copy, replace, delete
	File   File
}

// Plan returns the list of ops needed to make src match dst.
func Plan(src, dst []File) []Op {
	srcByPath := indexByPath(src)
	dstByPath := indexByPath(dst)
	var ops []Op
	for path, f := range dstByPath {
		s, ok := srcByPath[path]
		if !ok {
			ops = append(ops, Op{Action: "copy", File: f})
			continue
		}
		if s.SHA != f.SHA || s.Size != f.Size {
			ops = append(ops, Op{Action: "replace", File: f})
		}
	}
	for path, f := range srcByPath {
		if _, ok := dstByPath[path]; !ok {
			ops = append(ops, Op{Action: "delete", File: f})
		}
	}
	sort.Slice(ops, func(i, j int) bool {
		if ops[i].Action != ops[j].Action {
			return ops[i].Action < ops[j].Action
		}
		return ops[i].File.Path < ops[j].File.Path
	})
	return ops
}

// EstimateBytes returns the bytes that would change if ops applied.
func EstimateBytes(ops []Op) int64 {
	var n int64
	for _, op := range ops {
		switch op.Action {
		case "copy", "replace":
			n += op.File.Size
		}
	}
	return n
}

// Counts returns the number of ops by action.
func Counts(ops []Op) map[string]int {
	out := map[string]int{}
	for _, op := range ops {
		out[op.Action]++
	}
	return out
}

func indexByPath(files []File) map[string]File {
	out := make(map[string]File, len(files))
	for _, f := range files {
		out[f.Path] = f
	}
	return out
}

// Inverse returns the inverse plan (would convert dst back to src).
func Inverse(src, dst []File) []Op {
	return Plan(dst, src)
}

// CompactDeletes drops "delete" ops; useful for additive sync.
func CompactDeletes(ops []Op) []Op {
	var out []Op
	for _, op := range ops {
		if op.Action == "delete" {
			continue
		}
		out = append(out, op)
	}
	return out
}

// SortByActionPath returns ops sorted first by action then by path.
func SortByActionPath(ops []Op) []Op {
	out := make([]Op, len(ops))
	copy(out, ops)
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Action != out[j].Action {
			return out[i].Action < out[j].Action
		}
		return out[i].File.Path < out[j].File.Path
	})
	return out
}
