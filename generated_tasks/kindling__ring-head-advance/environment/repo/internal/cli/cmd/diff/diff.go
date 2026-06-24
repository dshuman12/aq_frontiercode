// Package diffcmd implements `kindling diff` (compare two log files).
package diffcmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/loader"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "diff",
		Short: "compare two log files and report differences",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	a := parsed.Str("a", "")
	b := parsed.Str("b", "")
	if a == "" || b == "" {
		return 1, fmt.Errorf("diff: --a and --b are required")
	}
	aRecs, err := loader.LoadFile(a, loader.FormatAuto)
	if err != nil {
		return 1, err
	}
	bRecs, err := loader.LoadFile(b, loader.FormatAuto)
	if err != nil {
		return 1, err
	}
	fmt.Printf("diff: a=%d records, b=%d records, delta=%d\n",
		len(aRecs), len(bRecs), len(bRecs)-len(aRecs))
	return 0, nil
}
