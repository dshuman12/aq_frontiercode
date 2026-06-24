package register_test

import (
	"sort"
	"testing"

	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/cli/register"
)

func TestAllRegisters(t *testing.T) {
	register.All()
	names := cli.Names()
	if len(names) < 18 {
		t.Errorf("got %d names: %v", len(names), names)
	}
}

func TestRegistrationIsSorted(t *testing.T) {
	register.All()
	names := cli.Names()
	sorted := make([]string, len(names))
	copy(sorted, names)
	sort.Strings(sorted)
	for i := range names {
		if names[i] != sorted[i] {
			t.Errorf("[%d] got %q want %q", i, names[i], sorted[i])
		}
	}
}

func TestKnownCommands(t *testing.T) {
	register.All()
	names := cli.Names()
	have := map[string]bool{}
	for _, n := range names {
		have[n] = true
	}
	for _, want := range []string{"scan", "search", "group", "bucket", "metrics", "version"} {
		if !have[want] {
			t.Errorf("missing %s", want)
		}
	}
}
