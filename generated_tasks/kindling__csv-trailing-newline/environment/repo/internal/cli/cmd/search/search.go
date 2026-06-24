// Package searchcmd implements `kindling search`.
package searchcmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/format"
	"github.com/dleblanc/kindling/internal/loader"
	"github.com/dleblanc/kindling/internal/parse"
	"github.com/dleblanc/kindling/internal/query"
	"github.com/dleblanc/kindling/internal/record"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "search",
		Short: "filter records using the kindling query language",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	if len(parsed.Positional) < 2 {
		return 1, fmt.Errorf("search: usage: search <query> <file>...")
	}
	q, err := parse.Parse(parsed.Positional[0])
	if err != nil {
		return 1, fmt.Errorf("search: bad query: %w", err)
	}
	fmtName := parsed.Str("format", "text")
	all := []*record.Record{}
	for _, path := range parsed.Positional[1:] {
		recs, err := loader.LoadFile(path, loader.FormatAuto)
		if err != nil {
			return 1, fmt.Errorf("search %s: %w", path, err)
		}
		all = append(all, recs...)
	}
	matched := query.Filter(q, all)
	switch fmtName {
	case "json":
		out, err := format.JSONRecords(matched)
		if err != nil {
			return 1, err
		}
		fmt.Print(out)
	case "csv":
		fmt.Print(format.CSVRecords(matched))
	default:
		fmt.Print(format.TextRecords(matched))
	}
	return 0, nil
}
