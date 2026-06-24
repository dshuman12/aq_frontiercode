package bencode2

import (
	"bytes"
	"io"
	"testing"
)

func TestRoundTrip(t *testing.T) {
	var buf bytes.Buffer
	enc := NewEncoder(&buf)
	if err := enc.EncodeDict(map[string]func(*Encoder) error{
		"name":   func(e *Encoder) error { return e.EncodeString("kindling") },
		"length": func(e *Encoder) error { return e.EncodeInt(42) },
		"tags": func(e *Encoder) error {
			return e.EncodeList(func(e *Encoder) error {
				if err := e.EncodeString("alpha"); err != nil {
					return err
				}
				return e.EncodeString("beta")
			})
		},
	}); err != nil {
		t.Fatal(err)
	}
	if err := enc.Flush(); err != nil {
		t.Fatal(err)
	}
	dec := NewDecoder(bytes.NewReader(buf.Bytes()))
	var kinds []Kind
	for {
		tok, err := dec.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		kinds = append(kinds, tok.Kind)
	}
	if len(kinds) < 9 {
		t.Fatalf("got %d tokens", len(kinds))
	}
}

func TestMaxDepth(t *testing.T) {
	dec := NewDecoder(bytes.NewReader([]byte("lllllllee")))
	dec.SetMaxDepth(2)
	gotErr := false
	for i := 0; i < 10; i++ {
		_, err := dec.Next()
		if err != nil {
			gotErr = true
			break
		}
	}
	if !gotErr {
		t.Fatal("expected depth error")
	}
}

func TestNegativeLength(t *testing.T) {
	dec := NewDecoder(bytes.NewReader([]byte("-1:x")))
	_, err := dec.Next()
	if err == nil {
		t.Fatal("expected error")
	}
}
