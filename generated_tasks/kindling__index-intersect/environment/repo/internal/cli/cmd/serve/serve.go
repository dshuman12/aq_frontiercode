// Package servecmd implements `kindling serve` (HTTP metrics endpoint).
package servecmd

import (
	"context"
	"fmt"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/httpx"
	"github.com/dleblanc/kindling/internal/metrics"
	"github.com/dleblanc/kindling/internal/version"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "serve",
		Short: "run the optional metrics HTTP endpoint",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	bind := parsed.Str("bind", "127.0.0.1:9120")
	if parsed.Bool("dry-run") {
		fmt.Printf("serve: would bind %s\n", bind)
		return 0, nil
	}
	r := httpx.NewRouter()
	reg := metrics.New()
	reg.GaugeSet("kindling_build_info", "build info", map[string]string{"version": version.Version}, 1)
	r.Get("/metrics", func(*httpx.Request) httpx.Response {
		return httpx.OKProm(reg.Render())
	})
	r.Get("/healthz", func(*httpx.Request) httpx.Response {
		return httpx.OKText("ok\n")
	})
	cfg := httpx.DefaultListen()
	cfg.Bind = bind
	if err := httpx.Listen(context.Background(), cfg, r); err != nil {
		return 1, err
	}
	return 0, nil
}
