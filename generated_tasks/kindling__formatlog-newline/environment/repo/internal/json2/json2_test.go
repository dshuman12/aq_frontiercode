package json2

import (
	"bytes"
	"io"
	"strings"
	"testing"
)

func TestDecodeFlat(t *testing.T) {
	d := NewDecoder(strings.NewReader(`{"a":1,"b":"two","c":true,"d":null}`))
	var kinds []TokenKind
	for {
		tok, err := d.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		kinds = append(kinds, tok.Kind)
	}
	if len(kinds) < 9 {
		t.Fatalf("kinds %v", kinds)
	}
}

func TestDecodeNested(t *testing.T) {
	d := NewDecoder(strings.NewReader(`{"l":[1,2,{"x":3}]}`))
	count := 0
	for {
		_, err := d.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		count++
	}
	if count < 8 {
		t.Fatalf("count %d", count)
	}
}

func TestDecodeUnicode(t *testing.T) {
	d := NewDecoder(strings.NewReader(`"\u00e9"`))
	tok, err := d.Next()
	if err != nil {
		t.Fatal(err)
	}
	if tok.Str != "é" {
		t.Fatalf("got %q", tok.Str)
	}
}

func TestEncodeAny(t *testing.T) {
	var buf bytes.Buffer
	enc := NewEncoder(&buf)
	if err := enc.EncodeAny(map[string]any{
		"name":    "kindling",
		"count":   42,
		"flags":   []any{"a", "b"},
		"present": true,
		"missing": nil,
	}); err != nil {
		t.Fatal(err)
	}
	_ = enc.Flush()
	out := buf.String()
	for _, want := range []string{`"name"`, `"kindling"`, `"count"`, `42`, `true`, `null`} {
		if !strings.Contains(out, want) {
			t.Fatalf("missing %s in %s", want, out)
		}
	}
}

func TestRoundTripList(t *testing.T) {
	var buf bytes.Buffer
	enc := NewEncoder(&buf)
	_ = enc.EncodeAny([]any{"a", float64(1), true, nil})
	_ = enc.Flush()
	d := NewDecoder(&buf)
	count := 0
	for {
		_, err := d.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		count++
	}
	if count != 6 {
		t.Fatalf("count %d", count)
	}
}

func TestEncodeStringEscapes(t *testing.T) {
	var buf bytes.Buffer
	enc := NewEncoder(&buf)
	_ = enc.EncodeAny("a\nb\tc\"d")
	_ = enc.Flush()
	if !strings.Contains(buf.String(), `\n`) {
		t.Fatalf("got %s", buf.String())
	}
}
