package segmentmgr

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestAllocateThenList(t *testing.T) {
	dir := t.TempDir()
	mgr, _ := New(dir, Options{})
	for i := 0; i < 3; i++ {
		path, _, err := mgr.Allocate()
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte("data"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	segs, _ := mgr.List()
	if len(segs) != 3 {
		t.Fatalf("got %d", len(segs))
	}
	if segs[0].Seq != 1 || segs[2].Seq != 3 {
		t.Fatalf("seqs %+v", segs)
	}
}

func TestPruneByAge(t *testing.T) {
	dir := t.TempDir()
	mgr, _ := New(dir, Options{MaxAge: time.Hour})
	path, _, _ := mgr.Allocate()
	_ = os.WriteFile(path, []byte("x"), 0o644)
	old := time.Now().Add(-2 * time.Hour)
	_ = os.Chtimes(path, old, old)
	removed, err := mgr.Prune(time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if len(removed) != 1 {
		t.Fatalf("removed %d", len(removed))
	}
}

func TestPruneByBytes(t *testing.T) {
	dir := t.TempDir()
	mgr, _ := New(dir, Options{MaxBytes: 5})
	for i := 0; i < 3; i++ {
		path, _, _ := mgr.Allocate()
		_ = os.WriteFile(path, []byte("aaaa"), 0o644)
	}
	removed, err := mgr.Prune(time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if len(removed) < 2 {
		t.Fatalf("removed %d", len(removed))
	}
}

func TestReplace(t *testing.T) {
	dir := t.TempDir()
	mgr, _ := New(dir, Options{})
	tmp := filepath.Join(dir, "tmp")
	_ = os.WriteFile(tmp, []byte("x"), 0o644)
	if err := mgr.Replace(tmp, 7); err != nil {
		t.Fatal(err)
	}
	segs, _ := mgr.List()
	if segs[0].Seq != 7 {
		t.Fatalf("seq %d", segs[0].Seq)
	}
}

func TestSkipsAlienFiles(t *testing.T) {
	dir := t.TempDir()
	mgr, _ := New(dir, Options{})
	_ = os.WriteFile(filepath.Join(dir, "alien.txt"), []byte("x"), 0o644)
	segs, err := mgr.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(segs) != 0 {
		t.Fatalf("got %d", len(segs))
	}
}
