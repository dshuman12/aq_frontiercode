package expand_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/dleblanc/kindling/internal/expand"
)

func TestMatchEmptyDir(t *testing.T) {
	d := t.TempDir()
	hits, err := expand.Match(d, []string{"*.log"})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 0 {
		t.Errorf("got %v", hits)
	}
}

func TestMatchPattern(t *testing.T) {
	d := t.TempDir()
	for _, name := range []string{"a.log", "b.log", "c.txt"} {
		_ = os.WriteFile(filepath.Join(d, name), nil, 0o644)
	}
	hits, _ := expand.Match(d, []string{"*.log"})
	if len(hits) != 2 {
		t.Errorf("got %d", len(hits))
	}
}

func TestMatchExt(t *testing.T) {
	d := t.TempDir()
	_ = os.WriteFile(filepath.Join(d, "a.log"), nil, 0o644)
	_ = os.WriteFile(filepath.Join(d, "b.txt"), nil, 0o644)
	hits, _ := expand.MatchExt(d, "log")
	if len(hits) != 1 {
		t.Errorf("got %d", len(hits))
	}
	hits, _ = expand.MatchExt(d, ".txt")
	if len(hits) != 1 {
		t.Errorf("got %d", len(hits))
	}
}

func TestMatchAny(t *testing.T) {
	d := t.TempDir()
	_ = os.WriteFile(filepath.Join(d, "a.log"), nil, 0o644)
	if !expand.MatchAny(d, "*.log") {
		t.Error("expected match")
	}
	if expand.MatchAny(d, "*.zzz") {
		t.Error("unexpected match")
	}
}

func TestMatchExtCaseInsensitive(t *testing.T) {
	d := t.TempDir()
	_ = os.WriteFile(filepath.Join(d, "a.LOG"), nil, 0o644)
	hits, _ := expand.MatchExt(d, "log")
	if len(hits) != 1 {
		t.Errorf("got %d", len(hits))
	}
}
