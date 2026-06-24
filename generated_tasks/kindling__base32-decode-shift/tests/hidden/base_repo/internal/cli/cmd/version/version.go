// Package versioncmd implements `kindling version`.
package versioncmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/version"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "version",
		Short: "print kindling version + build info",
		Run: func([]string) (int, error) {
			fmt.Printf("kindling %s\n", version.Version)
			fmt.Printf("schema:  %d\n", version.SchemaVersion)
			return 0, nil
		},
	}
}
