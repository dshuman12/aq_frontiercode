package parser

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/manojgowda/lattice/pkg/types"
)

// writeFile is a test helper that creates parents and writes content.
func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := mkdirAll(filepath.Dir(path)); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func mkdirAll(p string) error {
	return os.MkdirAll(p, 0o755)
}

// mockProject builds a small Project for unit tests of helpers.
func mockProject(cmd string) *types.Project {
	return &types.Project{
		Name: "x",
		Tasks: map[string]*types.Task{
			"a": {Name: "a", Command: cmd},
		},
	}
}
