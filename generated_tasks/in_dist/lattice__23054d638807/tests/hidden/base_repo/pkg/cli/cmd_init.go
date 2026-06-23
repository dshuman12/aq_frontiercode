package cli

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
)

const starterYAML = `version: 1
name: my-project

# Project-level environment variables. Layered between OS env and
# task-level env. Task-level wins, so individual tasks can override.
env:
  GO_ENV: development

# Optional .env files, loaded in order. Later files override earlier.
# env_files:
#   - .env
#   - .env.local

# Defaults applied to every task that doesn't override the field.
defaults:
  timeout: 5m

tasks:
  build:
    desc: Build the application binary.
    inputs: ["**/*.go", "go.mod", "go.sum"]
    outputs: ["bin/app"]
    cmd: "go build -o bin/app ./..."

  test:
    desc: Run unit tests.
    deps: [build]
    inputs: ["**/*.go"]
    cmd: "go test ./..."

  lint:
    desc: Static analysis.
    inputs: ["**/*.go"]
    cmd: "go vet ./..."

  clean:
    desc: Remove build artifacts.
    cache: false
    cmd: "rm -rf bin/ dist/"
`

// initFlags configures `lattice init`.
type initFlags struct {
	output    string
	overwrite bool
	format    string // yaml or toml
}

func newInitCommand(state *rootState) *cobra.Command {
	flags := &initFlags{output: "lattice.yaml", format: "yaml"}

	cmd := &cobra.Command{
		Use:   "init",
		Short: "Generate a starter lattice.yaml in the current directory",
		Long: `Init writes a minimal but useful lattice.yaml in the cwd, with
example "build", "test", "lint", and "clean" tasks. Edit it to fit
your project. Running "init" twice is a no-op unless --force is set.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runInit(state, flags)
		},
	}
	cmd.Flags().StringVarP(&flags.output, "output", "o", "lattice.yaml", "output filename")
	cmd.Flags().BoolVarP(&flags.overwrite, "force", "f", false, "overwrite if file exists")
	cmd.Flags().StringVar(&flags.format, "format", "yaml", "yaml or toml")
	return cmd
}

func runInit(state *rootState, flags *initFlags) error {
	dest, err := filepath.Abs(flags.output)
	if err != nil {
		return fmt.Errorf("resolve %q: %w", flags.output, err)
	}
	if !flags.overwrite {
		if _, err := os.Stat(dest); err == nil {
			return fmt.Errorf("%q already exists; pass --force to overwrite", dest)
		} else if !errors.Is(err, os.ErrNotExist) {
			return err
		}
	}
	switch flags.format {
	case "yaml", "yml":
		return os.WriteFile(dest, []byte(starterYAML), 0o644)
	case "toml":
		return errors.New("--format=toml is not yet implemented; use --format=yaml")
	default:
		return fmt.Errorf("unknown format %q", flags.format)
	}
}
