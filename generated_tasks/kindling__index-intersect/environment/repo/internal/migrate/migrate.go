// Package migrate handles manifest schema migrations.
package migrate

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/manifest"
)

// Step is one migration step.
type Step struct {
	From uint32
	To   uint32
	Name string
}

// Steps returns the list of named steps.
func Steps() []Step {
	return []Step{
		{From: 1, To: 2, Name: "v1 -> v2: introduce explicit count field"},
		{From: 2, To: 3, Name: "v2 -> v3: per-entry algorithm column"},
	}
}

// Plan returns the steps needed to go from -> to.
func Plan(from, to uint32) ([]Step, error) {
	if from > to {
		return nil, fmt.Errorf("migrate: source %d > target %d", from, to)
	}
	if from == to {
		return nil, nil
	}
	all := Steps()
	var out []Step
	for cur := from; cur < to; cur++ {
		found := false
		for _, s := range all {
			if s.From == cur {
				out = append(out, s)
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("migrate: no step from v%d", cur)
		}
	}
	return out, nil
}

// Apply runs every step in plan against m.
func Apply(m *manifest.Manifest, plan []Step) error {
	for _, s := range plan {
		if err := apply(m, s); err != nil {
			return fmt.Errorf("migrate %s: %w", s.Name, err)
		}
	}
	m.Version = manifest.SchemaVersion
	return nil
}

func apply(m *manifest.Manifest, s Step) error {
	// Most migrations are no-ops in-memory; the on-disk format is what
	// changes. Keeping the dispatch makes future steps trivial to add.
	_ = m
	_ = s
	return nil
}
