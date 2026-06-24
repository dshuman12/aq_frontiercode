// Package cli is the kindling subcommand dispatcher.
package cli

import (
	"errors"
	"fmt"
	"sort"

	"github.com/dleblanc/kindling/internal/version"
)

// Command is one subcommand registered with the dispatcher.
type Command struct {
	Name  string
	Short string
	Run   func(args []string) (int, error)
}

// ErrUnknownCommand is returned when the head argv element is not a
// registered subcommand.
var ErrUnknownCommand = errors.New("unknown subcommand")

var registered = map[string]Command{}

// Register adds a subcommand. Calling twice with the same name panics.
func Register(c Command) {
	if c.Name == "" {
		panic("cli: command name required")
	}
	if _, exists := registered[c.Name]; exists {
		panic("cli: duplicate command " + c.Name)
	}
	registered[c.Name] = c
}

// Names returns the names of every registered command, sorted.
func Names() []string {
	out := make([]string, 0, len(registered))
	for n := range registered {
		out = append(out, n)
	}
	sort.Strings(out)
	return out
}

// Run dispatches argv. Empty / -h / help prints usage; -V / version
// prints the version string. Unknown commands return ErrUnknownCommand.
func Run(argv []string) (int, error) {
	if len(argv) == 0 || argv[0] == "-h" || argv[0] == "--help" || argv[0] == "help" {
		printHelp()
		return 0, nil
	}
	if argv[0] == "-V" || argv[0] == "--version" || argv[0] == "version" {
		fmt.Printf("kindling %s\n", version.Version)
		return 0, nil
	}
	cmd, ok := registered[argv[0]]
	if !ok {
		return 1, fmt.Errorf("%w %q", ErrUnknownCommand, argv[0])
	}
	return cmd.Run(argv[1:])
}

func printHelp() {
	fmt.Printf("kindling %s - structured log analyzer\n\n", version.Version)
	fmt.Println("usage: kindling <command> [options]")
	fmt.Println()
	fmt.Println("commands:")
	for _, name := range Names() {
		c := registered[name]
		fmt.Printf("  %-14s %s\n", c.Name, c.Short)
	}
	fmt.Println()
	fmt.Println("run 'kindling <command> --help' for command-specific options.")
}

// Reset clears every registered command. For tests only.
func Reset() {
	registered = map[string]Command{}
}
