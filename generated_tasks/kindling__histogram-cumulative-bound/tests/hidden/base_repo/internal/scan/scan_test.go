package scan_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/dleblanc/kindling/internal/scan"
)

func TestScanEmpty(t *testing.T) {
	d := t.TempDir()
	hits, err := scan.Scan(scan.DefaultConfig(d))
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 0 {
		t.Errorf("got %v", hits)
	}
}

func TestScanFiles(t *testing.T) {
	d := t.TempDir()
	for _, name := range []string{"a", "b", "c"} {
		_ = os.WriteFile(filepath.Join(d, name), []byte("hi"), 0o644)
	}
	hits, err := scan.Scan(scan.DefaultConfig(d))
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 3 {
		t.Errorf("got %d", len(hits))
	}
}

func TestMinSizeFilter(t *testing.T) {
	d := t.TempDir()
	_ = os.WriteFile(filepath.Join(d, "small"), []byte("x"), 0o644)
	_ = os.WriteFile(filepath.Join(d, "big"), make([]byte, 200), 0o644)
	cfg := scan.DefaultConfig(d)
	cfg.MinSize = 100
	hits, _ := scan.Scan(cfg)
	if len(hits) != 1 {
		t.Errorf("got %d", len(hits))
	}
}

func TestExcludesGlob(t *testing.T) {
	d := t.TempDir()
	_ = os.WriteFile(filepath.Join(d, "a.log"), []byte("hi"), 0o644)
	_ = os.WriteFile(filepath.Join(d, "a.tmp"), []byte("hi"), 0o644)
	cfg := scan.DefaultConfig(d)
	cfg.Excludes = []string{"*.tmp"}
	hits, _ := scan.Scan(cfg)
	if len(hits) != 1 {
		t.Errorf("got %d", len(hits))
	}
}

func TestMaxDepth(t *testing.T) {
	d := t.TempDir()
	deep := filepath.Join(d, "a", "b", "c")
	_ = os.MkdirAll(deep, 0o755)
	_ = os.WriteFile(filepath.Join(deep, "x"), []byte("hi"), 0o644)
	cfg := scan.DefaultConfig(d)
	cfg.MaxDepth = 1
	hits, _ := scan.Scan(cfg)
	if len(hits) != 0 {
		t.Errorf("got %d", len(hits))
	}
}

func TestMissingRoot(t *testing.T) {
	hits, err := scan.Scan(scan.DefaultConfig("/nonexistent/x"))
	if err != nil {
		t.Fatal(err)
	}
	if hits != nil {
		t.Errorf("got %v", hits)
	}
}
