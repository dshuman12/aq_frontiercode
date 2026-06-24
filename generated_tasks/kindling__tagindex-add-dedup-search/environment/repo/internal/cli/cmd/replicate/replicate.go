// Package replicatecmd implements `kindling replicate`.
package replicatecmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/replication"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "replicate",
		Short: "replicate a manifest archive (rsync, scp, http)",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	via := parsed.Str("via", "rsync")
	local := parsed.Str("path", "")
	remote := parsed.Str("to", "")
	if local == "" || remote == "" {
		return 1, fmt.Errorf("replicate: --path and --to are required")
	}
	r, err := replication.Build(via)
	if err != nil {
		return 1, err
	}
	if err := r.Push(local, remote); err != nil {
		return 1, err
	}
	fmt.Printf("replicate: via=%s path=%s remote=%s ok\n", via, local, remote)
	return 0, nil
}
