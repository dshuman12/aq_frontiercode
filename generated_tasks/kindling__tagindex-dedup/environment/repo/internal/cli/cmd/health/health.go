// Package healthcmd implements `kindling healthcheck`.
package healthcmd

import (
	"fmt"
	"os"
	"time"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/config"
	"github.com/dleblanc/kindling/internal/health"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "healthcheck",
		Short: "exit 0 if the data dir is healthy",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	verbose := parsed.Bool("verbose")
	maxAgeSecs, err := parsed.Int("lock-max-age", 30)
	if err != nil {
		return 1, err
	}
	cfg, err := config.FromEnv(os.Getenv)
	if err != nil {
		return 1, err
	}
	status := health.Check(cfg.DataDir, cfg.CacheDir, time.Duration(maxAgeSecs)*time.Second)
	if out := health.Render(status, verbose); out != "" {
		fmt.Fprint(os.Stderr, out)
	}
	if !status.OK {
		return 1, nil
	}
	return 0, nil
}
