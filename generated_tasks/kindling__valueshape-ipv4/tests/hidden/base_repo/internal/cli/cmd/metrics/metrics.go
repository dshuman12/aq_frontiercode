// Package metricscmd implements `kindling metrics`.
package metricscmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/metrics"
	"github.com/dleblanc/kindling/internal/version"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "metrics",
		Short: "print Prometheus-format metrics",
		Run: func([]string) (int, error) {
			r := metrics.New()
			r.GaugeSet("kindling_build_info", "build info", map[string]string{"version": version.Version}, 1)
			r.GaugeSet("kindling_schema_version", "manifest schema", nil, float64(version.SchemaVersion))
			fmt.Print(r.Render())
			return 0, nil
		},
	}
}
