// Package plan builds an ordered list of operations from a manifest.
package plan

import (
	"sort"

	"github.com/dleblanc/kindling/internal/manifest"
)

// Step is one planned operation.
type Step struct {
	Op     string
	Digest string
	Detail string
}

// Build returns steps (sorted by digest) for every entry in m.
func Build(m *manifest.Manifest) []Step {
	out := make([]Step, 0, m.Len())
	for digest, e := range m.Entries {
		out = append(out, Step{
			Op:     "upsert",
			Digest: digest,
			Detail: e.Service,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Digest < out[j].Digest })
	return out
}

// Filter returns steps where pred(step) is true.
func Filter(steps []Step, pred func(Step) bool) []Step {
	var out []Step
	for _, s := range steps {
		if pred(s) {
			out = append(out, s)
		}
	}
	return out
}

// Chunk splits steps into batches of size n.
func Chunk(steps []Step, n int) [][]Step {
	if n <= 0 {
		return [][]Step{steps}
	}
	var out [][]Step
	for i := 0; i < len(steps); i += n {
		end := i + n
		if end > len(steps) {
			end = len(steps)
		}
		out = append(out, steps[i:end])
	}
	return out
}

// Parallelism suggests a worker pool size for steps.
func Parallelism(steps []Step) int {
	switch n := len(steps); {
	case n < 10:
		return 1
	case n < 100:
		return 2
	case n < 1000:
		return 4
	default:
		return 8
	}
}
