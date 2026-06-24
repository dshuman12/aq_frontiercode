// Package scancmd implements `kindling scan`.
package scancmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/loader"
	"github.com/dleblanc/kindling/internal/store"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "scan",
		Short: "load a log file and report basic statistics",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	if len(parsed.Positional) == 0 {
		return 1, fmt.Errorf("scan: positional <file> required")
	}
	format := loader.ParseFormat(parsed.Str("format", "auto"))
	s := store.New()
	for _, path := range parsed.Positional {
		recs, err := loader.LoadFile(path, format)
		if err != nil {
			return 1, fmt.Errorf("scan %s: %w", path, err)
		}
		for _, r := range recs {
			s.Append(r)
		}
	}
	fmt.Printf("scan: %d files, %d records\n", len(parsed.Positional), s.Len())
	return 0, nil
}
