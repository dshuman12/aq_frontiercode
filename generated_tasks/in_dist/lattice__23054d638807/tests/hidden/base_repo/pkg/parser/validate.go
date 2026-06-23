package parser

import (
	"errors"
	"fmt"
	"strings"

	"github.com/manojgowda/lattice/pkg/types"
)

// ValidationError is returned by validate when a project has any
// schema-level issues. Multiple errors are aggregated into Errors so
// users see all the problems at once instead of fixing one and
// re-running.
type ValidationError struct {
	Errors []TaskValidationError
}

func (v *ValidationError) Error() string {
	if len(v.Errors) == 0 {
		return "config validation failed"
	}
	if len(v.Errors) == 1 {
		return v.Errors[0].Error()
	}
	parts := make([]string, 0, len(v.Errors))
	for _, e := range v.Errors {
		parts = append(parts, "  - "+e.Error())
	}
	return fmt.Sprintf("%d config validation errors:\n%s", len(v.Errors), strings.Join(parts, "\n"))
}

// TaskValidationError describes a single rule violation. Source
// (when populated) lets the CLI underline the offending line.
type TaskValidationError struct {
	Task    string
	Source  types.SourceLocation
	Message string
}

func (t TaskValidationError) Error() string {
	if t.Task == "" {
		return t.Message
	}
	if t.Source.File != "" {
		return fmt.Sprintf("task %q (%s:%d): %s", t.Task, t.Source.File, t.Source.Line, t.Message)
	}
	return fmt.Sprintf("task %q: %s", t.Task, t.Message)
}

// validate walks the project structure asserting our schema rules.
// Rules:
//
//   - Project.Version must be "1" (or empty, defaulted by normalize)
//   - Each task name is non-empty and matches taskNamePattern
//   - Task.Command is non-empty unless Deps is non-empty (a dep-only
//     task is a meta-target, useful for grouping)
//   - Each entry in Task.Deps refers to an existing task (no dangling)
//   - Task.Timeout (if set) is positive
//   - Project.EnvFiles entries are non-empty strings
func validate(project *types.Project) error {
	verr := &ValidationError{}

	if project.Version != "" && project.Version != "1" {
		verr.Errors = append(verr.Errors, TaskValidationError{
			Message: fmt.Sprintf("unsupported config version %q (must be \"1\")", project.Version),
		})
	}

	for i, ef := range project.EnvFiles {
		if strings.TrimSpace(ef) == "" {
			verr.Errors = append(verr.Errors, TaskValidationError{
				Message: fmt.Sprintf("env_files[%d] is empty", i),
			})
		}
	}

	for name, task := range project.Tasks {
		if name == "" {
			verr.Errors = append(verr.Errors, TaskValidationError{
				Source:  task.Source,
				Message: "task with empty name",
			})
			continue
		}
		if !isValidTaskName(name) {
			verr.Errors = append(verr.Errors, TaskValidationError{
				Task:    name,
				Source:  task.Source,
				Message: "invalid task name (allowed: letters, digits, '-', '_', ':', '.')",
			})
		}
		if strings.TrimSpace(task.Command) == "" && len(task.Deps) == 0 {
			verr.Errors = append(verr.Errors, TaskValidationError{
				Task:    name,
				Source:  task.Source,
				Message: "task has no `cmd` and no `deps`; either is required",
			})
		}
		if task.Timeout < 0 {
			verr.Errors = append(verr.Errors, TaskValidationError{
				Task:    name,
				Source:  task.Source,
				Message: "negative timeout is not allowed",
			})
		}
		for _, dep := range task.Deps {
			if _, ok := project.Tasks[dep]; !ok {
				verr.Errors = append(verr.Errors, TaskValidationError{
					Task:    name,
					Source:  task.Source,
					Message: fmt.Sprintf("depends on undefined task %q", dep),
				})
			}
		}
	}

	if len(verr.Errors) == 0 {
		return nil
	}
	return verr
}

// isValidTaskName asserts the character set of a task name. Colon
// allows namespacing (e.g. "lint:go", "test:integration"); period is
// allowed for things like "release.minor".
func isValidTaskName(name string) bool {
	if name == "" {
		return false
	}
	for _, r := range name {
		switch {
		case r >= 'a' && r <= 'z':
		case r >= 'A' && r <= 'Z':
		case r >= '0' && r <= '9':
		case r == '-', r == '_', r == ':', r == '.':
		default:
			return false
		}
	}
	return true
}

// IsValidationError reports whether err (or any error it wraps) is a
// *ValidationError. Useful in CLI for deciding whether to print a
// formatted summary or just the bare error.
func IsValidationError(err error) bool {
	var v *ValidationError
	return errors.As(err, &v)
}
