// Command kindling is a structured log analyzer.
package main

import (
	"fmt"
	"os"

	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/cli/register"
)

func main() {
	register.All()
	rc, err := cli.Run(os.Args[1:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "kindling: %v\n", err)
		os.Exit(1)
	}
	os.Exit(rc)
}
