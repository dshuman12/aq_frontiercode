// Package buildinfocmd implements `kindling build-info`.
package buildinfocmd

import (
	"fmt"

	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/version"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "build-info",
		Short: "print compile-time build info",
		Run: func([]string) (int, error) {
			fmt.Printf("kindling %s\n", version.Version)
			fmt.Printf("schema version: %d\n", version.SchemaVersion)
			fmt.Println("build:          go modules, no external runtime deps")
			return 0, nil
		},
	}
}
