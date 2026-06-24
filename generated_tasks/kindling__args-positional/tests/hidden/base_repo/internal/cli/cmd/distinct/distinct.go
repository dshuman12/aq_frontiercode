// Package distinctcmd implements `kindling distinct`.
package distinctcmd

import (
	"fmt"
	"sort"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/loader"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "distinct",
		Short: "list distinct values for a field",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	field := parsed.Str("field", "")
	if field == "" {
		return 1, fmt.Errorf("distinct: --field is required")
	}
	if len(parsed.Positional) == 0 {
		return 1, fmt.Errorf("distinct: usage: distinct --field <name> <file>...")
	}
	seen := map[string]uint64{}
	for _, path := range parsed.Positional {
		recs, err := loader.LoadFile(path, loader.FormatAuto)
		if err != nil {
			return 1, err
		}
		for _, r := range recs {
			v := r.Field(field)
			if v == "" {
				continue
			}
			seen[v]++
		}
	}
	values := make([]string, 0, len(seen))
	for v := range seen {
		values = append(values, v)
	}
	sort.Strings(values)
	for _, v := range values {
		fmt.Printf("%-30s %d\n", v, seen[v])
	}
	return 0, nil
}
