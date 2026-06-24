package cli_test

import (
	"errors"
	"testing"

	"github.com/dleblanc/kindling/internal/cli"
)

func TestEmptyArgvPrintsHelp(t *testing.T) {
	cli.Reset()
	rc, err := cli.Run(nil)
	if err != nil || rc != 0 {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}

func TestVersionFlag(t *testing.T) {
	cli.Reset()
	for _, arg := range []string{"-V", "--version", "version"} {
		rc, err := cli.Run([]string{arg})
		if rc != 0 || err != nil {
			t.Errorf("%q: rc=%d err=%v", arg, rc, err)
		}
	}
}

func TestUnknownCommand(t *testing.T) {
	cli.Reset()
	rc, err := cli.Run([]string{"nope"})
	if rc != 1 {
		t.Errorf("rc=%d", rc)
	}
	if !errors.Is(err, cli.ErrUnknownCommand) {
		t.Errorf("err=%v", err)
	}
}

func TestRegisterAndRun(t *testing.T) {
	cli.Reset()
	called := false
	cli.Register(cli.Command{
		Name: "demo", Short: "demo cmd",
		Run: func(args []string) (int, error) {
			called = true
			return 0, nil
		},
	})
	rc, err := cli.Run([]string{"demo"})
	if rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
	if !called {
		t.Error("not called")
	}
}

func TestRegisterDuplicatePanics(t *testing.T) {
	cli.Reset()
	cli.Register(cli.Command{Name: "x", Run: func([]string) (int, error) { return 0, nil }})
	defer func() {
		if recover() == nil {
			t.Error("expected panic")
		}
	}()
	cli.Register(cli.Command{Name: "x", Run: func([]string) (int, error) { return 0, nil }})
}

func TestNamesSorted(t *testing.T) {
	cli.Reset()
	cli.Register(cli.Command{Name: "z", Run: func([]string) (int, error) { return 0, nil }})
	cli.Register(cli.Command{Name: "a", Run: func([]string) (int, error) { return 0, nil }})
	names := cli.Names()
	if names[0] != "a" || names[1] != "z" {
		t.Errorf("got %v", names)
	}
}
