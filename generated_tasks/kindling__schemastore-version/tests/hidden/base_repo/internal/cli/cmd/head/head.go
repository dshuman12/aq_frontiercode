// Package headcmd implements `kindling head` (first N records).
package headcmd

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
		Name:  "head",
		Short: "print the first N records of a log file",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	if len(parsed.Positional) == 0 {
		return 1, fmt.Errorf("head: usage: head [--n 10] <file>")
	}
	n, err := parsed.Int("n", 10)
	if err != nil {
		return 1, err
	}
	all := []*record.Record{}
	for _, path := range parsed.Positional {
		recs, err := loader.LoadFile(path, loader.FormatAuto)
		if err != nil {
			return 1, err
		}
		all = append(all, recs...)
	}
	if n > len(all) {
		n = len(all)
	}
	fmt.Print(format.TextRecords(all[:n]))
	return 0, nil
}
