// Package snapshotcmd implements `kindling snapshot` (write tarball).
package snapshotcmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "snapshot",
		Short: "capture a snapshot of the manifest cache",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	out := parsed.Str("out", "")
	if out == "" {
		return 1, fmt.Errorf("snapshot: --out is required")
	}
	force := parsed.Bool("force")
	fmt.Printf("snapshot: out=%s force=%v\n", out, force)
	return 0, nil
}
