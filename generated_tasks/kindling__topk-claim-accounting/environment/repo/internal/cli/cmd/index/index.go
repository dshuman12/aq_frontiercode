// Package indexcmd implements `kindling index`.
package indexcmd

import (
	"fmt"
	"sort"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/index"
	"github.com/dleblanc/kindling/internal/loader"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "index",
		Short: "build an inverted index and report cardinalities",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	if len(parsed.Positional) == 0 {
		return 1, fmt.Errorf("index: usage: index <file>...")
	}
	idx := index.New()
	id := uint64(0)
	for _, path := range parsed.Positional {
		recs, err := loader.LoadFile(path, loader.FormatAuto)
		if err != nil {
			return 1, err
		}
		for _, r := range recs {
			idx.Add(id, r)
			id++
		}
	}
	keys := idx.Keys()
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Printf("%-30s %d\n", k, idx.Cardinality(k))
	}
	return 0, nil
}
