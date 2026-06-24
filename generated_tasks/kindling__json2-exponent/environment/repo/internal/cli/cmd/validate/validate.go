// Package validatecmd implements `kindling validate`.
package validatecmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/loader"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "validate",
		Short: "validate that a log file parses cleanly",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	if len(parsed.Positional) == 0 {
		return 1, fmt.Errorf("validate: usage: validate <file>...")
	}
	for _, path := range parsed.Positional {
		recs, err := loader.LoadFile(path, loader.FormatAuto)
		if err != nil {
			return 1, fmt.Errorf("validate %s: %w", path, err)
		}
		fmt.Printf("validate %s: ok (%d records)\n", path, len(recs))
	}
	return 0, nil
}
