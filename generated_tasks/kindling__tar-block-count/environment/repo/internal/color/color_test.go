package color_test

import (
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/color"
)

func TestEnabledHonorsNoColor(t *testing.T) {
	color.Disable()
	defer color.Enable()
	if color.Enabled() {
		t.Error("expected disabled")
	}
}

func TestWrapDisabled(t *testing.T) {
	color.Disable()
	defer color.Enable()
	if got := color.Wrap(color.Red, "hi"); got != "hi" {
		t.Errorf("got %q", got)
	}
}

func TestWrapEnabled(t *testing.T) {
	color.Enable()
	got := color.Wrap(color.Red, "hi")
	if !strings.Contains(got, "\x1b[31m") {
		t.Errorf("missing red: %q", got)
	}
	if !strings.HasSuffix(got, "\x1b[0m") {
		t.Errorf("missing reset: %q", got)
	}
}

func TestLevelColors(t *testing.T) {
	cases := map[string]color.Code{
		"error": color.Red,
		"warn":  color.Yellow,
		"info":  color.Green,
		"debug": color.Cyan,
		"x":     color.Gray,
	}
	for level, want := range cases {
		if got := color.LevelColor(level); got != want {
			t.Errorf("LevelColor(%q): got %q want %q", level, got, want)
		}
	}
}
