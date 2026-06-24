package shellquote_test

import (
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/shellquote"
)

func TestEmpty(t *testing.T) {
	if got := shellquote.Quote(""); got != "''" {
		t.Errorf("got %q", got)
	}
}

func TestSafePassthrough(t *testing.T) {
	if got := shellquote.Quote("/var/lib/kindling"); got != "/var/lib/kindling" {
		t.Errorf("got %q", got)
	}
}

func TestSpaceQuoted(t *testing.T) {
	got := shellquote.Quote("hello world")
	if got[0] != '\'' || got[len(got)-1] != '\'' {
		t.Errorf("got %q", got)
	}
}

func TestEmbeddedQuoteEscaped(t *testing.T) {
	got := shellquote.Quote("can't")
	if !strings.Contains(got, "'\\''") {
		t.Errorf("got %q", got)
	}
}

func TestArgvJoins(t *testing.T) {
	got := shellquote.Argv([]string{"echo", "hello world", "/tmp"})
	if !strings.Contains(got, "'hello world'") {
		t.Errorf("got %q", got)
	}
	if !strings.Contains(got, "/tmp") {
		t.Errorf("got %q", got)
	}
}
