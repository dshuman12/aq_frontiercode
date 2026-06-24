package stream_test

import (
	"errors"
	"io"
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/stream"
)

func TestReadHeader(t *testing.T) {
	r := stream.NewReader(strings.NewReader("a,b,c\n1,2,3\n"))
	h, err := r.ReadHeader()
	if err != nil {
		t.Fatal(err)
	}
	if len(h) != 3 || h[0] != "a" {
		t.Errorf("got %v", h)
	}
}

func TestNext(t *testing.T) {
	r := stream.NewReader(strings.NewReader("a,b\n1,2\n3,4\n"))
	r.ReadHeader()
	row, err := r.Next()
	if err != nil {
		t.Fatal(err)
	}
	if row["a"] != "1" || row["b"] != "2" {
		t.Errorf("got %v", row)
	}
	row, err = r.Next()
	if row["a"] != "3" {
		t.Errorf("got %v", row)
	}
	_, err = r.Next()
	if !errors.Is(err, io.EOF) {
		t.Errorf("got %v", err)
	}
}

func TestSkipsBlankLines(t *testing.T) {
	r := stream.NewReader(strings.NewReader("a\n1\n\n2\n"))
	r.ReadHeader()
	row, _ := r.Next()
	if row["a"] != "1" {
		t.Errorf("got %v", row)
	}
	row, _ = r.Next()
	if row["a"] != "2" {
		t.Errorf("got %v", row)
	}
}

func TestQuoted(t *testing.T) {
	r := stream.NewReader(strings.NewReader(`a,b
"hello, world",x
`))
	r.ReadHeader()
	row, err := r.Next()
	if err != nil {
		t.Fatal(err)
	}
	if row["a"] != "hello, world" {
		t.Errorf("got %v", row)
	}
}

func TestErrorWithoutHeader(t *testing.T) {
	r := stream.NewReader(strings.NewReader("a\n"))
	if _, err := r.Next(); err == nil {
		t.Error("expected error")
	}
}
