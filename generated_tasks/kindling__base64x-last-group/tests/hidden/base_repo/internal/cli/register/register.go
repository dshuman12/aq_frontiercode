// Package register wires every kindling subcommand into the dispatcher.
package register

import (
	"github.com/dleblanc/kindling/internal/cli"
	bucketcmd "github.com/dleblanc/kindling/internal/cli/cmd/bucket"
	configcmd "github.com/dleblanc/kindling/internal/cli/cmd/config"
	countcmd "github.com/dleblanc/kindling/internal/cli/cmd/count"
	distinctcmd "github.com/dleblanc/kindling/internal/cli/cmd/distinct"
	exportcmd "github.com/dleblanc/kindling/internal/cli/cmd/export"
	fieldscmd "github.com/dleblanc/kindling/internal/cli/cmd/fields"
	groupcmd "github.com/dleblanc/kindling/internal/cli/cmd/group"
	headcmd "github.com/dleblanc/kindling/internal/cli/cmd/head"
	healthcmd "github.com/dleblanc/kindling/internal/cli/cmd/health"
	indexcmd "github.com/dleblanc/kindling/internal/cli/cmd/index"
	metricscmd "github.com/dleblanc/kindling/internal/cli/cmd/metrics"
	scancmd "github.com/dleblanc/kindling/internal/cli/cmd/scan"
	searchcmd "github.com/dleblanc/kindling/internal/cli/cmd/search"
	servecmd "github.com/dleblanc/kindling/internal/cli/cmd/serve"
	tailcmd "github.com/dleblanc/kindling/internal/cli/cmd/tail"
	validatecmd "github.com/dleblanc/kindling/internal/cli/cmd/validate"
	validatequerycmd "github.com/dleblanc/kindling/internal/cli/cmd/validatequery"
	versioncmd "github.com/dleblanc/kindling/internal/cli/cmd/version"
)

// All registers every subcommand.
func All() {
	cli.Reset()
	cli.Register(bucketcmd.Cmd())
	cli.Register(configcmd.Cmd())
	cli.Register(countcmd.Cmd())
	cli.Register(distinctcmd.Cmd())
	cli.Register(exportcmd.Cmd())
	cli.Register(fieldscmd.Cmd())
	cli.Register(groupcmd.Cmd())
	cli.Register(headcmd.Cmd())
	cli.Register(healthcmd.Cmd())
	cli.Register(indexcmd.Cmd())
	cli.Register(metricscmd.Cmd())
	cli.Register(scancmd.Cmd())
	cli.Register(searchcmd.Cmd())
	cli.Register(servecmd.Cmd())
	cli.Register(tailcmd.Cmd())
	cli.Register(validatecmd.Cmd())
	cli.Register(validatequerycmd.Cmd())
	cli.Register(versioncmd.Cmd())
}
