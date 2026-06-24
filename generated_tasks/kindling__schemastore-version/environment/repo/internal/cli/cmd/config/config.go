// Package configcmd implements `kindling config show|check`.
package configcmd

import (
	"fmt"
	"os"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/config"
)

// Cmd returns the registered command.
func Cmd() cli.Command {
	return cli.Command{
		Name:  "config",
		Short: "inspect or validate the active configuration",
		Run:   run,
	}
}

func run(argv []string) (int, error) {
	parsed, err := args.Parse(argv)
	if err != nil {
		return 1, err
	}
	op := "show"
	if len(parsed.Positional) > 0 {
		op = parsed.Positional[0]
	}
	switch op {
	case "show":
		c, err := config.FromEnv(os.Getenv)
		if err != nil {
			return 1, err
		}
		fmt.Printf("DataDir:     %s\n", c.DataDir)
		fmt.Printf("CacheDir:    %s\n", c.CacheDir)
		fmt.Printf("LogLevel:    %s\n", c.LogLevel)
		fmt.Printf("LogFormat:   %s\n", c.LogFormat)
		fmt.Printf("HTTPBind:    %s\n", c.HTTPBind)
		fmt.Printf("MetricsBind: %s\n", c.MetricsBind)
		fmt.Printf("Timezone:    %s\n", c.Timezone)
		return 0, nil
	case "check":
		findings := config.Check(os.Getenv)
		fmt.Print(config.Format(findings))
		for _, f := range findings {
			if f.Severity == config.SevError {
				return 1, nil
			}
		}
		return 0, nil
	default:
		return 1, fmt.Errorf("config: unknown subcommand %q", op)
	}
}
