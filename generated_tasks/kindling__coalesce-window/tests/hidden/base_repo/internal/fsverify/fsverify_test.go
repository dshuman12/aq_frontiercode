package fsverify

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func setup(t *testing.T) string {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "a.txt"), []byte("hello"), 0o644)
	_ = os.WriteFile(filepath.Join(dir, "b.txt"), []byte("world"), 0o644)
	_ = os.MkdirAll(filepath.Join(dir, "sub"), 0o755)
	_ = os.WriteFile(filepath.Join(dir, "sub", "c.txt"), []byte("kindling"), 0o644)
	return dir
}

func TestBuildVerifyClean(t *testing.T) {
	dir := setup(t)
	m, err := Build(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(m.Files) != 3 {
		t.Fatalf("files %d", len(m.Files))
	}
	mismatches, err := Verify(m)
	if err != nil {
		t.Fatal(err)
	}
	if len(mismatches) != 0 {
		t.Fatalf("mismatches %v", mismatches)
	}
}

func TestVerifyDetectsChange(t *testing.T) {
	dir := setup(t)
	m, _ := Build(dir)
	_ = os.WriteFile(filepath.Join(dir, "a.txt"), []byte("HELLO"), 0o644)
	mismatches, _ := Verify(m)
	if len(mismatches) != 1 {
		t.Fatalf("got %v", mismatches)
	}
}

func TestVerifyDetectsMissing(t *testing.T) {
	dir := setup(t)
	m, _ := Build(dir)
	_ = os.Remove(filepath.Join(dir, "b.txt"))
	mismatches, _ := Verify(m)
	if len(mismatches) != 1 {
		t.Fatalf("got %v", mismatches)
	}
}

func TestRender(t *testing.T) {
	dir := setup(t)
	m, _ := Build(dir)
	out := Render(m)
	if !strings.Contains(out, "a.txt") {
		t.Fatalf("got %s", out)
	}
}

func TestEmptyRootRejected(t *testing.T) {
	if _, err := Build(""); err == nil {
		t.Fatal("expected err")
	}
}

func TestNilManifest(t *testing.T) {
	if _, err := Verify(nil); err == nil {
		t.Fatal("expected err")
	}
}
