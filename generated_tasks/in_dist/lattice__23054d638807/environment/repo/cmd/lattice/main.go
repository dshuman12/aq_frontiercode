// Lattice — a content-hashed parallel task runner.
//
// This is the entry point. All meaningful behavior lives in pkg/cli;
// keeping main.go small means we can `go test ./pkg/cli/...` without
// pulling in the world.
package main

import "github.com/manojgowda/lattice/pkg/cli"

func main() {
	cli.Execute()
}
