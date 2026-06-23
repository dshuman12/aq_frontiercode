package parser

import (
	"bytes"
	"fmt"

	"github.com/BurntSushi/toml"
	"github.com/manojgowda/lattice/pkg/types"
)

// parseTOML decodes a TOML byte slice into a Project. The TOML library
// gives us a MetaData object with key→position info; we use that to
// populate Task.Source for parser-error citations.
func parseTOML(raw []byte, path string) (*types.Project, error) {
	project := &types.Project{}
	meta, err := toml.Decode(string(raw), project)
	if err != nil {
		return nil, fmt.Errorf("toml decode: %w", err)
	}

	// Walk meta.Keys to find lines where each task was defined.
	for _, key := range meta.Keys() {
		// Keys for tasks look like ["tasks", "build"], etc.
		s := key
		if len(s) >= 2 && s[0] == "tasks" {
			name := s[1]
			task, ok := project.Tasks[name]
			if !ok || task == nil {
				continue
			}
			// MetaData doesn't expose line numbers directly in older
			// BurntSushi versions; we leave Line=0 unless we can find
			// a value-context call. Most users see the file path and
			// task name which is enough.
			task.Source = types.SourceLocation{File: path}
		}
	}

	return project, nil
}

// roundtripTOML re-encodes a Project to TOML. Mirrors the YAML
// roundtrip; used by `lattice config dump --format=toml`.
func roundtripTOML(project *types.Project) ([]byte, error) {
	var buf bytes.Buffer
	enc := toml.NewEncoder(&buf)
	if err := enc.Encode(project); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
