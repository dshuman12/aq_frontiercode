package spawn_test

import (
	"context"
	"runtime"
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/spawn"
)

func TestRunEcho(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("non-windows")
	}
	out, err := spawn.RunOutput(context.Background(), "echo", "hello")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "hello") {
		t.Errorf("got %q", out)
	}
}

func TestRunNonexistent(t *testing.T) {
	_, err := spawn.RunOutput(context.Background(), "/nonexistent-binary")
	if err == nil {
		t.Error("expected error")
	}
}

func TestIsSuccess(t *testing.T) {
	if !spawn.IsSuccess(spawn.Result{ExitCode: 0}) {
		t.Error("zero exit")
	}
	if spawn.IsSuccess(spawn.Result{ExitCode: 1}) {
		t.Error("non-zero")
	}
}

func TestResultDurationPositive(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("non-windows")
	}
	r, err := spawn.Run(context.Background(), "true")
	if err != nil {
		t.Fatal(err)
	}
	if r.Duration <= 0 {
		t.Errorf("got %v", r.Duration)
	}
}
