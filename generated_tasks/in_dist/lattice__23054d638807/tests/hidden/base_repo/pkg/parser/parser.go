// Package parser reads a lattice configuration file (YAML or TOML) and
// returns a populated *types.Project ready for the DAG resolver to
// consume.
//
// The parser is intentionally thin: it does syntactic decode + a small
// amount of normalization (apply Defaults to each Task, resolve EnvFiles
// relative to project root, set Project.Root from the path the config
// was loaded from). Validation lives in validate.go; interpolation
// lives in interpolate.go. The full pipeline runs in Load().
package parser

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/manojgowda/lattice/pkg/types"
)

// Format identifies which on-disk format a config file uses.
type Format int

const (
	FormatUnknown Format = iota
	FormatYAML
	FormatTOML
)

// Default config filenames searched by Find when no explicit path is
// given. Order matters: the first match wins.
var DefaultConfigNames = []string{
	"lattice.yaml",
	"lattice.yml",
	"lattice.toml",
	".lattice.yaml",
	".lattice.yml",
	".lattice.toml",
}

// ErrNoConfig is returned when Find walks the filesystem without
// turning up a config file.
var ErrNoConfig = errors.New("no lattice config file found")

// Find walks upward from startDir looking for the first config file
// whose name matches DefaultConfigNames. Returns the absolute path of
// the matched file plus its detected Format. Returns ErrNoConfig if
// the walk reaches the filesystem root without finding one.
func Find(startDir string) (string, Format, error) {
	abs, err := filepath.Abs(startDir)
	if err != nil {
		return "", FormatUnknown, fmt.Errorf("resolve %q: %w", startDir, err)
	}
	dir := abs
	for {
		for _, name := range DefaultConfigNames {
			candidate := filepath.Join(dir, name)
			if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
				return candidate, detectFormat(candidate), nil
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", FormatUnknown, ErrNoConfig
		}
		dir = parent
	}
}

// detectFormat inspects a filename suffix to decide YAML vs TOML.
// The Find loop already excludes other files.
func detectFormat(path string) Format {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".yaml", ".yml":
		return FormatYAML
	case ".toml":
		return FormatTOML
	default:
		return FormatUnknown
	}
}

// LoadOptions configures Load. Zero value is fine for normal use.
type LoadOptions struct {
	// Format overrides the auto-detected format. Useful when reading
	// from a file whose extension lies (e.g. piping a YAML doc into
	// a temp file with no extension).
	Format Format

	// EnvForInterpolation is the resolved environment used to expand
	// ${VAR} references in the config. The CLI builds this from the
	// pkg/env layer stack and passes it in. When nil, os.Environ() is
	// used as a fallback.
	EnvForInterpolation map[string]string

	// SkipInterpolation disables ${VAR} substitution. Used by tools
	// that want to inspect the raw config (e.g. `lattice config dump`).
	SkipInterpolation bool

	// SkipValidation disables the validation pass. Internal tooling
	// uses this; user-facing Load always validates.
	SkipValidation bool
}

// Load reads a lattice config from path, applies normalization,
// optionally interpolates ${VAR} references, validates, and returns
// a Project ready for the DAG resolver.
//
// The two-phase design (decode → normalize → interpolate → validate)
// is deliberate: each phase has a clear responsibility and produces a
// progressively-richer Project. Errors at any phase are wrapped with
// the path so users see which file caused the problem.
func Load(path string, opts LoadOptions) (*types.Project, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return nil, fmt.Errorf("resolve %q: %w", path, err)
	}
	raw, err := os.ReadFile(abs)
	if err != nil {
		return nil, fmt.Errorf("read %q: %w", abs, err)
	}

	format := opts.Format
	if format == FormatUnknown {
		format = detectFormat(abs)
	}

	var project *types.Project
	switch format {
	case FormatYAML:
		project, err = parseYAML(raw, abs)
	case FormatTOML:
		project, err = parseTOML(raw, abs)
	default:
		return nil, fmt.Errorf("unsupported format for %q (extension must be .yaml/.yml/.toml)", abs)
	}
	if err != nil {
		return nil, fmt.Errorf("parse %q: %w", abs, err)
	}

	project.Root = filepath.Dir(abs)
	normalize(project)

	if !opts.SkipInterpolation {
		envForInterp := opts.EnvForInterpolation
		if envForInterp == nil {
			envForInterp = osEnvAsMap()
		}
		if err := interpolate(project, envForInterp); err != nil {
			return nil, fmt.Errorf("interpolate %q: %w", abs, err)
		}
	}

	if !opts.SkipValidation {
		if err := validate(project); err != nil {
			return nil, fmt.Errorf("validate %q: %w", abs, err)
		}
	}

	return project, nil
}

// LoadFromDir is a convenience that walks up from startDir to find a
// config and Load()s it.
func LoadFromDir(startDir string, opts LoadOptions) (*types.Project, error) {
	path, _, err := Find(startDir)
	if err != nil {
		return nil, err
	}
	return Load(path, opts)
}

// normalize applies post-decode shape changes:
//
//   - Sets Task.Name from the map key when Tasks is map-shaped
//   - Applies Project.Defaults to each task that doesn't override
//   - Trims whitespace from Command (a multi-line YAML block scalar
//     often picks up trailing newlines)
//   - Resolves Project.CacheDir relative to Project.Root if relative
//   - Sorts Task.Deps (stable, alphabetical) so cache key generation
//     is deterministic regardless of file ordering
//
// normalize never errors; if a normalization step can't run (e.g.
// Tasks is nil), it skips quietly. Validation catches missing fields
// downstream.
func normalize(project *types.Project) {
	if project.Tasks == nil {
		project.Tasks = map[string]*types.Task{}
	}
	for name, task := range project.Tasks {
		if task == nil {
			continue
		}
		if task.Name == "" {
			task.Name = name
		}
		applyDefaults(task, project.Defaults)
		task.Command = strings.TrimSpace(task.Command)
		// NOTE: Deps order is significant for cache key when there
		// are non-hermetic tasks. We sort here for deterministic
		// hashing — tasks that need ordered execution should rely on
		// the DAG topological sort, not Deps[] order.
		sortStringSlice(task.Deps)
	}
	if project.CacheDir == "" {
		project.CacheDir = filepath.Join(project.Root, ".lattice", "cache")
	} else if !filepath.IsAbs(project.CacheDir) {
		project.CacheDir = filepath.Join(project.Root, project.CacheDir)
	}
	if project.Version == "" {
		project.Version = "1"
	}
}

// applyDefaults copies fields from project-level Defaults into task
// fields that the user didn't set. Called once per task during
// normalize.
func applyDefaults(task *types.Task, def *types.TaskDefaults) {
	if def == nil {
		return
	}
	if task.Dir == "" && def.Dir != "" {
		task.Dir = def.Dir
	}
	if task.Timeout == 0 && def.Timeout != 0 {
		task.Timeout = def.Timeout
	}
	if task.Cache == nil && def.Cache != nil {
		// preserve nil-vs-bool semantic — copy the *bool, don't
		// dereference
		c := *def.Cache
		task.Cache = &c
	}
	// Shell default is applied at exec-time, not parse-time, because
	// the same Task may run under different shells in test harnesses.
	// We deliberately don't propagate def.Shell here.
}

// osEnvAsMap snapshots the current process environment into a map.
// Used when LoadOptions.EnvForInterpolation is nil.
func osEnvAsMap() map[string]string {
	out := make(map[string]string, len(os.Environ()))
	for _, kv := range os.Environ() {
		idx := strings.IndexByte(kv, '=')
		if idx < 0 {
			continue
		}
		out[kv[:idx]] = kv[idx+1:]
	}
	return out
}

// sortStringSlice sorts in place. Inlined so we don't pull `sort` into
// every package; parser is a leaf so the sort import is OK here.
func sortStringSlice(s []string) {
	for i := 1; i < len(s); i++ {
		for j := i; j > 0 && s[j-1] > s[j]; j-- {
			s[j-1], s[j] = s[j], s[j-1]
		}
	}
}
