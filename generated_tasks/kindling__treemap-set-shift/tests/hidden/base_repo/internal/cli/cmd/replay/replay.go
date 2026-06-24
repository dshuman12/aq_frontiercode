// Package replaycmd implements `kindling replay` (replay journal).
package replaycmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/journal"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "replay",
		Short: "summarize a journal via replay statistics",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	path := parsed.Str("journal", "kindling-journal.tsv")
	store := journal.Open(path)
	entries, _, err := store.ReadAll()
	if err != nil {
		return 1, err
	}
	stats := journal.Summarize(entries)
	fmt.Printf("replay: total=%d applied=%d skipped=%d failed=%d\n",
		stats.Total, stats.Applied, stats.Skipped, stats.Failed)
	return 0, nil
}
