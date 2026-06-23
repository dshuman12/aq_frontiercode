package parser

import (
	"fmt"
	"strings"
	"unicode"

	"github.com/manojgowda/lattice/pkg/types"
)

// interpolate walks a project and substitutes ${VAR} and $VAR
// references in user-facing string fields. The env map is the union
// of all env layers the CLI built.
//
// Substitution rules:
//   - "${VAR}" — full reference, always substituted, missing → error
//   - "$VAR"   — shorthand, substituted, missing → error
//   - "${VAR:-default}" — substituted with default if VAR unset/empty
//   - "$$"     — literal '$' (escape)
//   - "$ "     — literal '$ ' (no var name follows; left alone)
//
// Fields walked (in order):
//   - Project.Env values
//   - Each Task.Command, Task.Dir, Task.Env values, Task.Inputs[],
//     Task.Outputs[]
//
// Project.Env is interpolated FIRST so that downstream task fields can
// reference project-level overrides set via interpolation.
func interpolate(project *types.Project, env map[string]string) error {
	merged := mergeEnv(env, project.Env)

	// Project-level Env: each value can reference other project-level
	// or OS-level vars, but cannot reference task-level vars
	// (task-level doesn't exist yet at this point).
	for k, v := range project.Env {
		expanded, err := expand(v, merged)
		if err != nil {
			return fmt.Errorf("project.env[%q]: %w", k, err)
		}
		project.Env[k] = expanded
		merged[k] = expanded
	}

	// Per-task fields. Each task gets its own "view" of env that
	// includes Task.Env on top of merged. Project.Env was already
	// interpolated above so values flow through.
	for name, task := range project.Tasks {
		if task == nil {
			continue
		}
		taskEnv := mergeEnv(merged, task.Env)
		// Task.Env values themselves can be interpolated — useful for
		// chaining: `env: {API_URL: "https://${HOST}/v1"}`.
		for k, v := range task.Env {
			expanded, err := expand(v, taskEnv)
			if err != nil {
				return fmt.Errorf("task %q env[%q]: %w", name, k, err)
			}
			task.Env[k] = expanded
			taskEnv[k] = expanded
		}
		expanded, err := expand(task.Command, taskEnv)
		if err != nil {
			return fmt.Errorf("task %q cmd: %w", name, err)
		}
		task.Command = expanded
		if task.Dir != "" {
			expanded, err = expand(task.Dir, taskEnv)
			if err != nil {
				return fmt.Errorf("task %q dir: %w", name, err)
			}
			task.Dir = expanded
		}
		for i, glob := range task.Inputs {
			expanded, err = expand(glob, taskEnv)
			if err != nil {
				return fmt.Errorf("task %q inputs[%d]: %w", name, i, err)
			}
			task.Inputs[i] = expanded
		}
		for i, glob := range task.Outputs {
			expanded, err = expand(glob, taskEnv)
			if err != nil {
				return fmt.Errorf("task %q outputs[%d]: %w", name, i, err)
			}
			task.Outputs[i] = expanded
		}
	}
	return nil
}

// mergeEnv returns a new map with override applied on top of base.
// Neither input is mutated.
func mergeEnv(base, override map[string]string) map[string]string {
	out := make(map[string]string, len(base)+len(override))
	for k, v := range base {
		out[k] = v
	}
	for k, v := range override {
		out[k] = v
	}
	return out
}

// expand replaces $VAR / ${VAR} / ${VAR:-default} references in s
// using the given env. Returns an error for unknown variables in
// non-default forms.
func expand(s string, env map[string]string) (string, error) {
	if !strings.Contains(s, "$") {
		return s, nil
	}
	var b strings.Builder
	b.Grow(len(s))
	i := 0
	for i < len(s) {
		c := s[i]
		if c != '$' {
			b.WriteByte(c)
			i++
			continue
		}
		// Found '$' — peek at next char
		if i+1 >= len(s) {
			b.WriteByte('$')
			i++
			continue
		}
		next := s[i+1]
		switch {
		case next == '$':
			// "$$" → literal '$'
			b.WriteByte('$')
			i += 2
		case next == '{':
			// "${...}" form
			end := strings.IndexByte(s[i+2:], '}')
			if end < 0 {
				return "", fmt.Errorf("unterminated ${...} starting at offset %d", i)
			}
			ref := s[i+2 : i+2+end]
			value, err := resolveRef(ref, env)
			if err != nil {
				return "", err
			}
			b.WriteString(value)
			i += 2 + end + 1
		case isVarStart(next):
			// "$VAR" form — read identifier
			j := i + 1
			for j < len(s) && isVarCont(s[j]) {
				j++
			}
			name := s[i+1 : j]
			value, ok := env[name]
			if !ok {
				return "", fmt.Errorf("undefined variable $%s", name)
			}
			b.WriteString(value)
			i = j
		default:
			// "$" followed by something we don't understand — keep
			// literal. Common in shell snippets like "echo $1" inside
			// a Command. The shell will resolve those at runtime.
			b.WriteByte('$')
			i++
		}
	}
	return b.String(), nil
}

// resolveRef parses "VAR" or "VAR:-default" and looks it up.
func resolveRef(ref string, env map[string]string) (string, error) {
	colon := strings.Index(ref, ":-")
	if colon < 0 {
		// Plain ${VAR}
		if v, ok := env[ref]; ok {
			return v, nil
		}
		return "", fmt.Errorf("undefined variable ${%s}", ref)
	}
	name := ref[:colon]
	def := ref[colon+2:]
	if v, ok := env[name]; ok && v != "" {
		return v, nil
	}
	return def, nil
}

func isVarStart(c byte) bool {
	return c == '_' || (unicode.IsLetter(rune(c)))
}

func isVarCont(c byte) bool {
	return c == '_' || (unicode.IsLetter(rune(c))) || (c >= '0' && c <= '9')
}
