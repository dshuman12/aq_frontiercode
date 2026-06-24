// Package exportcmd implements `kindling export`.
package exportcmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/format"
	"github.com/dleblanc/kindling/internal/loader"
	"github.com/dleblanc/kindling/internal/record"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "export",
		Short: "convert records between supported formats",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	to := parsed.Str("format", "json")
	if len(parsed.Positional) == 0 {
		return 1, fmt.Errorf("export: usage: export --format <fmt> <file>...")
	}
	all := []*record.Record{}
	for _, path := range parsed.Positional {
		recs, err := loader.LoadFile(path, loader.FormatAuto)
		if err != nil {
			return 1, err
		}
		all = append(all, recs...)
	}
	switch to {
	case "json", "jsonl":
		out, err := format.JSONRecords(all)
		if err != nil {
			return 1, err
		}
		fmt.Print(out)
	case "csv":
		fmt.Print(format.CSVRecords(all))
	case "text":
		fmt.Print(format.TextRecords(all))
	default:
		return 1, fmt.Errorf("export: unknown format %q", to)
	}
	return 0, nil
}
