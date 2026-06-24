package multipart

import (
	"bytes"
	"io"
	"testing"
)

func TestRoundTrip(t *testing.T) {
	var buf bytes.Buffer
	w := NewWriter(&buf)
	_ = w.SetBoundary("BOUND")
	_ = w.WritePart(Part{Headers: map[string]string{"Content-Type": "text/plain"}, Body: []byte("alpha")})
	_ = w.WritePart(Part{Headers: map[string]string{"X-Tag": "v1"}, Body: []byte("beta")})
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	r := NewReader(&buf, "BOUND")
	count := 0
	for {
		p, err := r.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		count++
		if len(p.Body) == 0 {
			t.Fatal("empty body")
		}
	}
	if count != 2 {
		t.Fatalf("count %d", count)
	}
}

func TestSetBoundaryReject(t *testing.T) {
	w := NewWriter(&bytes.Buffer{})
	if err := w.SetBoundary("a\nb"); err == nil {
		t.Fatal("expected err")
	}
}

func TestWriteAfterClose(t *testing.T) {
	w := NewWriter(&bytes.Buffer{})
	_ = w.Close()
	if err := w.WritePart(Part{}); err == nil {
		t.Fatal("expected err")
	}
}
