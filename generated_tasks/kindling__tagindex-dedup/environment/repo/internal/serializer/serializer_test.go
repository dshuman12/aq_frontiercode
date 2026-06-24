package serializer

import (
	"strings"
	"testing"
)

func TestRegistryLookup(t *testing.T) {
	r := Default()
	if _, err := r.Lookup("json"); err != nil {
		t.Fatal(err)
	}
	if _, err := r.Lookup("missing"); err == nil {
		t.Fatal("expected err")
	}
}

func TestNames(t *testing.T) {
	r := Default()
	names := r.Names()
	if len(names) != 3 {
		t.Fatalf("got %v", names)
	}
}

func TestJSONEncode(t *testing.T) {
	c := JSONCodec{}
	out, err := c.Encode(map[string]any{"k": "v", "n": float64(1)})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(out), `"k":"v"`) {
		t.Fatalf("got %s", out)
	}
}

func TestTextRoundTrip(t *testing.T) {
	c := TextCodec{}
	enc, _ := c.Encode("hello")
	var out string
	if err := c.Decode(enc, &out); err != nil {
		t.Fatal(err)
	}
	if out != "hello" {
		t.Fatalf("got %s", out)
	}
}

func TestNoopRoundTrip(t *testing.T) {
	c := NoopCodec{}
	enc, _ := c.Encode([]byte{1, 2, 3})
	var out []byte
	if err := c.Decode(enc, &out); err != nil {
		t.Fatal(err)
	}
	if len(out) != 3 || out[0] != 1 {
		t.Fatalf("got %v", out)
	}
}

func TestContentTypes(t *testing.T) {
	if (JSONCodec{}).ContentType() == "" {
		t.Fatal("json ct")
	}
	if (TextCodec{}).ContentType() == "" {
		t.Fatal("text ct")
	}
}

func TestRegisterReplace(t *testing.T) {
	r := New()
	r.Register(JSONCodec{})
	r.Register(JSONCodec{})
	if len(r.Names()) != 1 {
		t.Fatalf("got %v", r.Names())
	}
}
