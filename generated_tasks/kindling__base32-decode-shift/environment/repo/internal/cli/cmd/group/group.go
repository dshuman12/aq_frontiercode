// Package groupcmd implements `kindling group`.
package groupcmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/format"
	"github.com/dleblanc/kindling/internal/group"
	"github.com/dleblanc/kindling/internal/loader"
	"github.com/dleblanc/kindling/internal/record"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "group",
		Short: "group records by a field and report counts",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	field := parsed.Str("by", "level")
	limit, err := parsed.Int("limit", 0)
	if err != nil {
		return 1, err
	}
	if len(parsed.Positional) == 0 {
		return 1, fmt.Errorf("group: usage: group --by <field> <file>...")
	}
	all := []*record.Record{}
	for _, path := range parsed.Positional {
		recs, err := loader.LoadFile(path, loader.FormatAuto)
		if err != nil {
			return 1, fmt.Errorf("group %s: %w", path, err)
		}
		all = append(all, recs...)
	}
	buckets := group.By(field, all)
	if limit > 0 {
		buckets = group.TopN(buckets, limit)
	}
	if parsed.Str("format", "text") == "json" {
		out, _ := format.JSONGroups(buckets)
		fmt.Println(out)
	} else {
		fmt.Print(format.TextGroups(buckets))
	}
	return 0, nil
}
