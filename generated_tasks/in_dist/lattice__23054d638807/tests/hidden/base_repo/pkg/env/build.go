package env

import (
	"fmt"
	"path/filepath"

	"github.com/manojgowda/lattice/pkg/types"
)

// BuildOptions describes one resolution context.
type BuildOptions struct {
	// Project is the parsed Lattice project. Required.
	Project *types.Project

	// Task is the task whose env should be resolved. May be nil for
	// "project-level" lookups (e.g. `lattice env --explain` without a
	// task argument).
	Task *types.Task

	// CLIOverrides are -e KEY=VALUE strings from the CLI.
	CLIOverrides []string

	// IncludeOSEnv toggles the bottom layer. Defaults to true; tests
	// often pass false for reproducibility.
	IncludeOSEnv *bool
}

// Build assembles the layer stack and returns both the flattened map
// and the layer slice (so callers can run Explain later).
func Build(opts BuildOptions) (map[string]string, []types.EnvLayer, error) {
	if opts.Project == nil {
		return nil, nil, fmt.Errorf("env.Build: project is nil")
	}
	includeOS := true
	if opts.IncludeOSEnv != nil {
		includeOS = *opts.IncludeOSEnv
	}

	layers := []types.EnvLayer{}
	if includeOS {
		layers = append(layers, FromOS())
	}
	layers = append(layers, FromProject(opts.Project))

	for _, ef := range opts.Project.EnvFiles {
		path := ef
		if !filepath.IsAbs(path) {
			path = filepath.Join(opts.Project.Root, ef)
		}
		layer, err := FromEnvFile(path)
		if err != nil {
			return nil, nil, err
		}
		layers = append(layers, layer)
	}

	if opts.Task != nil {
		layers = append(layers, FromTask(opts.Task))
	}

	overrides, err := FromOverrides(opts.CLIOverrides)
	if err != nil {
		return nil, nil, err
	}
	layers = append(layers, overrides)

	return Resolve(layers), layers, nil
}
