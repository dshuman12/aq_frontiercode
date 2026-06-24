// Package auditcmd implements `kindling audit` (inspect journal).
package auditcmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/journal"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "audit",
		Short: "inspect the operation journal",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	path := parsed.Str("journal", "kindling-journal.tsv")
	limit, err := parsed.Int("limit", 20)
	if err != nil {
		return 1, err
	}
	store := journal.Open(path)
	entries, skipped, err := store.ReadAll()
	if err != nil {
		return 1, err
	}
	fmt.Printf("audit: %d entries (%d skipped)\n", len(entries), skipped)
	if limit > len(entries) {
		limit = len(entries)
	}
	for _, e := range entries[:limit] {
		fmt.Printf("  %s %-8s %s %s\n",
			e.Timestamp.Format("2006-01-02T15:04:05Z"),
			e.Outcome, e.Op, e.Detail)
	}
	return 0, nil
}
