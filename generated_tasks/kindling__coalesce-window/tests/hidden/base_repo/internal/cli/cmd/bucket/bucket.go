// Package bucketcmd implements `kindling bucket`.
package bucketcmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/bucket"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/format"
	"github.com/dleblanc/kindling/internal/loader"
	"github.com/dleblanc/kindling/internal/record"
	"github.com/dleblanc/kindling/internal/util/timex"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "bucket",
		Short: "aggregate records into time buckets",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	if len(parsed.Positional) == 0 {
		return 1, fmt.Errorf("bucket: usage: bucket --window 1h <file>...")
	}
	winStr := parsed.Str("window", "1h")
	dur, err := timex.ParseDuration(winStr)
	if err != nil {
		return 1, fmt.Errorf("bucket: bad window: %w", err)
	}
	all := []*record.Record{}
	for _, path := range parsed.Positional {
		recs, err := loader.LoadFile(path, loader.FormatAuto)
		if err != nil {
			return 1, err
		}
		all = append(all, recs...)
	}
	cells := bucket.Aggregate(all, dur)
	if parsed.Bool("sparse") {
		cells = bucket.Sparse(cells, dur)
	}
	fmt.Print(format.TextBuckets(cells))
	return 0, nil
}
