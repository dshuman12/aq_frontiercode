package tail_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/tail"
)

func TestEmptyFile(t *testing.T) {
	d := t.TempDir()
	p := filepath.Join(d, "x")
	_ = os.WriteFile(p, nil, 0o644)
	got, err := tail.Lines(p, 5)
	if err != nil {
		t.Fatal(err)
	}
	if got != nil {
		t.Errorf("got %v", got)
	}
}

func TestNotPositive(t *testing.T) {
	if _, err := tail.Lines("/x", 0); err == nil {
		t.Error("expected error")
	}
}

func TestSmallFile(t *testing.T) {
	d := t.TempDir()
	p := filepath.Join(d, "x")
	_ = os.WriteFile(p, []byte("a\nb\nc\n"), 0o644)
	got, _ := tail.Lines(p, 2)
	if len(got) != 2 || got[1] != "c" {
		t.Errorf("got %v", got)
	}
}

func TestLargeFile(t *testing.T) {
	d := t.TempDir()
	p := filepath.Join(d, "x")
	var lines []string
	for i := 0; i < 1000; i++ {
		lines = append(lines, "line")
	}
	body := strings.Join(lines, "\n") + "\n"
	_ = os.WriteFile(p, []byte(body), 0o644)
	got, _ := tail.Lines(p, 5)
	if len(got) != 5 {
		t.Errorf("got %d", len(got))
	}
}

func TestMissingFile(t *testing.T) {
	if _, err := tail.Lines("/nonexistent", 5); err == nil {
		t.Error("expected error")
	}
}
