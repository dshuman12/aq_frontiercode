package snapshot2

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func setup(t *testing.T) (*Manager, string) {
	dir := t.TempDir()
	m, err := New(dir)
	if err != nil {
		t.Fatal(err)
	}
	src := filepath.Join(dir, "input.dat")
	if err := os.WriteFile(src, []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}
	return m, src
}

func TestCreateLoad(t *testing.T) {
	m, src := setup(t)
	id, err := m.Create("notes", []string{src})
	if err != nil {
		t.Fatal(err)
	}
	manifest, err := m.Load(id)
	if err != nil {
		t.Fatal(err)
	}
	if manifest.Schema != SchemaVersion || len(manifest.Entries) != 1 {
		t.Fatalf("got %+v", manifest)
	}
}

func TestList(t *testing.T) {
	m, src := setup(t)
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	m.SetClock(func() time.Time { now = now.Add(time.Second); return now })
	for i := 0; i < 3; i++ {
		_, _ = m.Create("", []string{src})
	}
	ids, err := m.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(ids) != 3 {
		t.Fatalf("got %v", ids)
	}
}

func TestVerifyClean(t *testing.T) {
	m, src := setup(t)
	id, _ := m.Create("", []string{src})
	mis, err := m.Verify(id)
	if err != nil {
		t.Fatal(err)
	}
	if len(mis) != 0 {
		t.Fatalf("got %v", mis)
	}
}

func TestVerifyTampered(t *testing.T) {
	m, src := setup(t)
	id, _ := m.Create("", []string{src})
	tampered := filepath.Join(m.root, id, "data", "input.dat")
	_ = os.WriteFile(tampered, []byte("HELLO"), 0o644)
	mis, _ := m.Verify(id)
	if len(mis) != 1 {
		t.Fatalf("got %v", mis)
	}
}

func TestPrune(t *testing.T) {
	m, src := setup(t)
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	m.SetClock(func() time.Time { return now })
	id, _ := m.Create("", []string{src})
	now = now.Add(48 * time.Hour)
	removed, _ := m.Prune(time.Hour)
	if len(removed) != 1 || removed[0] != id {
		t.Fatalf("removed %v", removed)
	}
}

func TestTotal(t *testing.T) {
	m, src := setup(t)
	_, _ = m.Create("", []string{src})
	total, err := m.Total()
	if err != nil {
		t.Fatal(err)
	}
	if total <= 0 {
		t.Fatalf("total %d", total)
	}
}

func TestNotes(t *testing.T) {
	m, src := setup(t)
	id, _ := m.Create("hello note", []string{src})
	notes, _ := m.Notes(id)
	if notes != "hello note" {
		t.Fatalf("got %q", notes)
	}
}

func TestNewRequiresRoot(t *testing.T) {
	if _, err := New(""); err == nil {
		t.Fatal("expected err")
	}
}
