package segments

import (
	"path/filepath"
	"testing"
)

func TestRoundTrip(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "seg")
	w, err := Create(p)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 5; i++ {
		_ = w.Append([]byte{byte(i)})
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	got, err := Read(p)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 5 {
		t.Fatalf("got %d", len(got))
	}
}

func TestBadMagic(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "seg")
	w, _ := Create(p)
	_ = w.Append([]byte("x"))
	_ = w.Close()
	// Corrupt magic.
	data, _ := readAll(p)
	data[0] = 'X'
	_ = writeAll(p, data)
	if _, err := Read(p); err == nil {
		t.Fatal("expected err")
	}
}
