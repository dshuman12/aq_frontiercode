package parser

import (
	"bytes"
	"fmt"

	"github.com/manojgowda/lattice/pkg/types"
	"gopkg.in/yaml.v3"
)

// parseYAML decodes a YAML byte slice into a Project. We do a two-pass
// decode: first pass into a yaml.Node so we can pull out source-line
// information for each task (used by validate.go to render
// "tasks.foo:12: command is empty"), second pass into the strongly-
// typed Project. This is what makes "task X at line Y" possible.
func parseYAML(raw []byte, path string) (*types.Project, error) {
	var node yaml.Node
	if err := yaml.Unmarshal(raw, &node); err != nil {
		return nil, fmt.Errorf("yaml decode (raw): %w", err)
	}

	project := &types.Project{}
	if err := node.Decode(project); err != nil {
		return nil, fmt.Errorf("yaml decode (typed): %w", err)
	}

	// Walk the raw node tree to find each task's source line and stash
	// it on the corresponding *Task. yaml.v3 numbers lines from 1.
	if err := annotateTaskSources(&node, project, path); err != nil {
		// Source annotation is best-effort; the typed decode succeeded
		// so we don't surface this as a hard error. Future versions
		// may upgrade this to a warning sink.
		_ = err
	}

	return project, nil
}

// annotateTaskSources walks the YAML node tree looking for the
// "tasks:" mapping and copies its child line numbers onto each
// matching *Task in the decoded project. Best-effort; returns nil even
// if the structure doesn't match (e.g. tasks defined as a sequence
// instead of a mapping — a malformed config the validator catches).
func annotateTaskSources(root *yaml.Node, project *types.Project, path string) error {
	if root.Kind == yaml.DocumentNode && len(root.Content) > 0 {
		root = root.Content[0]
	}
	if root.Kind != yaml.MappingNode {
		return nil
	}
	// Find "tasks:" key
	var tasksNode *yaml.Node
	for i := 0; i < len(root.Content); i += 2 {
		key := root.Content[i]
		if key.Kind == yaml.ScalarNode && key.Value == "tasks" {
			if i+1 < len(root.Content) {
				tasksNode = root.Content[i+1]
			}
			break
		}
	}
	if tasksNode == nil || tasksNode.Kind != yaml.MappingNode {
		return nil
	}
	// Each child of a MappingNode is a key-value pair; iterate in pairs.
	for i := 0; i < len(tasksNode.Content); i += 2 {
		nameNode := tasksNode.Content[i]
		if nameNode.Kind != yaml.ScalarNode {
			continue
		}
		task, ok := project.Tasks[nameNode.Value]
		if !ok || task == nil {
			continue
		}
		task.Source = types.SourceLocation{
			File: path,
			Line: nameNode.Line,
		}
	}
	return nil
}

// roundtripYAML re-encodes a Project to YAML. Used by `lattice config
// dump` to print a normalized, machine-friendly view of the resolved
// configuration. Not used in the hot path.
func roundtripYAML(project *types.Project) ([]byte, error) {
	var buf bytes.Buffer
	enc := yaml.NewEncoder(&buf)
	enc.SetIndent(2)
	if err := enc.Encode(project); err != nil {
		return nil, err
	}
	if err := enc.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
