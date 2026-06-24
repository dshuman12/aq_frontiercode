package tar_test

import (
	"fmt"
	"testing"

	"github.com/dleblanc/kindling/internal/tar"
)

func buildHeader(name string, size uint64) [512]byte {
	var h [512]byte
	copy(h[:], name)
	sizeOctal := fmt.Sprintf("%011o ", size)
	copy(h[124:], sizeOctal)
	mode := []byte("0000644 \x00")
	copy(h[100:], mode)
	h[156] = '0'
	return h
}

func TestEmptyArchive(t *testing.T) {
	buf := make([]byte, 1024)
	recs, err := tar.Read(buf)
	if err != nil {
		t.Fatal(err)
	}
	if len(recs) != 0 {
		t.Errorf("got %d", len(recs))
	}
}

func TestSingleHeader(t *testing.T) {
	h := buildHeader("hello.txt", 5)
	buf := append(h[:], make([]byte, 512)...)
	recs, err := tar.Read(buf)
	if err != nil {
		t.Fatal(err)
	}
	if len(recs) != 1 {
		t.Fatalf("got %d", len(recs))
	}
	if recs[0].Path != "hello.txt" {
		t.Errorf("got %q", recs[0].Path)
	}
	if recs[0].Size != 5 {
		t.Errorf("got %d", recs[0].Size)
	}
}

func TestZeroBlockEnds(t *testing.T) {
	buf := make([]byte, 512)
	recs, _ := tar.Read(buf)
	if len(recs) != 0 {
		t.Errorf("expected EOF: %v", recs)
	}
}
