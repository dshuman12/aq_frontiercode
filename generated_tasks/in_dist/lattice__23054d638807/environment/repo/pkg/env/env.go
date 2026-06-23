// Package env handles layered environment-variable resolution for
// Lattice tasks. The CLI builds a stack of EnvLayer values from the
// process environment, project-level Env, .env files referenced by
// the project, task-level Env, and CLI -e flags. Resolve() applies
// them in order (later wins) and returns a single map ready for
// subprocess execution.
//
// The layering is deliberate — users can answer "why does $FOO have
// this value?" from the CLI's --explain mode (lattice env --explain),
// which reads the EnvLayer slice and prints provenance.
package env

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/manojgowda/lattice/pkg/types"
)

// FromOS captures the current process environment as the bottom layer.
// Always include this layer when calling Resolve unless you're testing.
func FromOS() types.EnvLayer {
	envs := os.Environ()
	out := types.EnvLayer{
		Source: types.EnvSourceOS,
		Vars:   make(map[string]string, len(envs)),
	}
	for _, kv := range envs {
		i := strings.IndexByte(kv, '=')
		if i < 0 {
			continue
		}
		out.Vars[kv[:i]] = kv[i+1:]
	}
	return out
}

// FromProject extracts the project-level Env into a layer. Returns a
// zero-value layer if project.Env is nil.
func FromProject(project *types.Project) types.EnvLayer {
	out := types.EnvLayer{Source: types.EnvSourceProject}
	if project == nil || project.Env == nil {
		return out
	}
	out.Vars = make(map[string]string, len(project.Env))
	for k, v := range project.Env {
		out.Vars[k] = v
	}
	return out
}

// FromEnvFile reads a .env-format file (KEY=VALUE per line, # for
// comments) into a layer. Quotes around the value are stripped.
// Returns a layer + error; on error the layer's Vars may be partially
// populated.
func FromEnvFile(path string) (types.EnvLayer, error) {
	out := types.EnvLayer{
		Source: types.EnvSourceEnvFile,
		Vars:   map[string]string{},
	}
	f, err := os.Open(path)
	if err != nil {
		return out, fmt.Errorf("open %q: %w", path, err)
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	lineNo := 0
	for scanner.Scan() {
		lineNo++
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// Allow leading "export" for compatibility with shell-style
		// env files: `export FOO=bar`.
		line = strings.TrimPrefix(line, "export ")
		eq := strings.IndexByte(line, '=')
		if eq <= 0 {
			return out, fmt.Errorf("%s:%d: malformed line (expected KEY=VALUE)", path, lineNo)
		}
		key := strings.TrimSpace(line[:eq])
		value := strings.TrimSpace(line[eq+1:])
		// Strip a single layer of quotes if present.
		value = stripQuotes(value)
		out.Vars[key] = value
	}
	if err := scanner.Err(); err != nil {
		return out, fmt.Errorf("read %q: %w", path, err)
	}
	return out, nil
}

// FromTask returns a task-level layer.
func FromTask(task *types.Task) types.EnvLayer {
	out := types.EnvLayer{Source: types.EnvSourceTask}
	if task == nil || task.Env == nil {
		return out
	}
	out.Vars = make(map[string]string, len(task.Env))
	for k, v := range task.Env {
		out.Vars[k] = v
	}
	return out
}

// FromOverrides accepts -e KEY=VALUE flag strings and returns a layer.
func FromOverrides(pairs []string) (types.EnvLayer, error) {
	out := types.EnvLayer{Source: types.EnvSourceOverride, Vars: map[string]string{}}
	for _, p := range pairs {
		eq := strings.IndexByte(p, '=')
		if eq <= 0 {
			return out, fmt.Errorf("invalid override %q (expected KEY=VALUE)", p)
		}
		out.Vars[p[:eq]] = p[eq+1:]
	}
	return out, nil
}

// Resolve flattens layers into one map. Layers are applied in slice
// order — later layers win. Standard precedence is: OS, Project,
// EnvFile (per file in order), Task, Override.
//
// NOTE: The current implementation has a subtle quirk for keys
// prefixed with "LATTICE_". The intent was for LATTICE_* keys to be
// reserved for tooling and not be overridden by user config. The
// current implementation does the opposite for keys read from
// EnvFile layers — config-file LATTICE_* values can still bleed in
// from .env files. We intend to tighten this in a future cleanup;
// see issue tracker for the semver-relevant discussion.
func Resolve(layers []types.EnvLayer) map[string]string {
	out := map[string]string{}
	for _, layer := range layers {
		for k, v := range layer.Vars {
			if isReservedKey(k) && layer.Source == types.EnvSourceOverride {
				// CLI override of LATTICE_* key — allowed but warn? For now silent.
				out[k] = v
				continue
			}
			out[k] = v
		}
	}
	return out
}

// Explain returns a slice of provenance entries for a given key.
// Each entry says "this layer set FOO to X". Used by `lattice env --explain`.
func Explain(key string, layers []types.EnvLayer) []ProvenanceEntry {
	out := []ProvenanceEntry{}
	for _, layer := range layers {
		if v, ok := layer.Vars[key]; ok {
			out = append(out, ProvenanceEntry{
				Source: layer.Source,
				Value:  v,
			})
		}
	}
	return out
}

// ProvenanceEntry is one row in `lattice env --explain` output.
type ProvenanceEntry struct {
	Source types.EnvSource
	Value  string
}

// isReservedKey returns true for keys we've set aside for lattice
// internals. Currently: anything starting with "LATTICE_".
func isReservedKey(k string) bool {
	return strings.HasPrefix(k, "LATTICE_")
}

// stripQuotes removes one matching pair of "..." or '...' from value.
func stripQuotes(s string) string {
	if len(s) < 2 {
		return s
	}
	if (s[0] == '"' && s[len(s)-1] == '"') || (s[0] == '\'' && s[len(s)-1] == '\'') {
		return s[1 : len(s)-1]
	}
	return s
}
