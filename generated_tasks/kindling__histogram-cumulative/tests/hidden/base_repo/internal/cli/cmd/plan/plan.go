// Package plancmd implements `kindling plan`.
package plancmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/manifest"
	"github.com/dleblanc/kindling/internal/plan"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "plan",
		Short: "build a plan over a manifest cache",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	limit, err := parsed.Int("limit", 0)
	if err != nil {
		return 1, err
	}
	m := manifest.New()
	steps := plan.Build(m)
	if limit > 0 && limit < len(steps) {
		steps = steps[:limit]
	}
	fmt.Printf("plan: %d steps (parallelism=%d)\n", len(steps), plan.Parallelism(steps))
	return 0, nil
}
