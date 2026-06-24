// Package validatequerycmd implements `kindling validate-query`.
package validatequerycmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/parse"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "validate-query",
		Short: "parse a query string and report any syntax errors",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	if len(parsed.Positional) == 0 {
		return 1, fmt.Errorf("validate-query: usage: validate-query <query>")
	}
	q, err := parse.Parse(parsed.Positional[0])
	if err != nil {
		return 1, fmt.Errorf("validate-query: %w", err)
	}
	fmt.Printf("validate-query: ok (%d disjuncts)\n", len(q.Disjuncts))
	return 0, nil
}
