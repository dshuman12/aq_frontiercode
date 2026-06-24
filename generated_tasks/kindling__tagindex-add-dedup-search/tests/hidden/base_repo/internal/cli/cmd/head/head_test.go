package headcmd_test

import (
	"testing"

	cmd "github.com/dleblanc/kindling/internal/cli/cmd/head"
)

func TestCmdShape(t *testing.T) {
	c := cmd.Cmd()
	if c.Name == "" {
		t.Fatal("name should be non-empty")
	}
	if c.Short == "" {
		t.Fatal("short description should be non-empty")
	}
	if c.Run == nil {
		t.Fatal("run function should be non-nil")
	}
}
