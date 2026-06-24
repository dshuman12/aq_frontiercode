package jsonp_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/jsonp"
)

func TestNull(t *testing.T) {
	v, err := jsonp.Parse("null")
	if err != nil {
		t.Fatal(err)
	}
	if v.Kind != jsonp.KindNull {
		t.Errorf("got %v", v.Kind)
	}
}

func TestBool(t *testing.T) {
	v, _ := jsonp.Parse("true")
	if v.Kind != jsonp.KindBool || !v.Bool {
		t.Errorf("got %+v", v)
	}
	v, _ = jsonp.Parse("false")
	if v.Bool {
		t.Errorf("got %+v", v)
	}
}

func TestNumber(t *testing.T) {
	v, _ := jsonp.Parse("42")
	if v.Kind != jsonp.KindNumber || v.Num != 42 {
		t.Errorf("got %+v", v)
	}
	v, _ = jsonp.Parse("-3.5")
	if v.Num != -3.5 {
		t.Errorf("got %v", v.Num)
	}
}

func TestString(t *testing.T) {
	v, _ := jsonp.Parse(`"hello"`)
	if v.Str != "hello" {
		t.Errorf("got %q", v.Str)
	}
}

func TestStringEscapes(t *testing.T) {
	v, _ := jsonp.Parse(`"a\nb\tc\""`)
	if v.Str != "a\nb\tc\"" {
		t.Errorf("got %q", v.Str)
	}
}

func TestStringUnicodeEscape(t *testing.T) {
	v, _ := jsonp.Parse(`"\u00e9"`)
	if v.Str != "é" {
		t.Errorf("got %q", v.Str)
	}
}

func TestArray(t *testing.T) {
	v, _ := jsonp.Parse(`[1, "two", null]`)
	if len(v.Array) != 3 {
		t.Fatalf("got %d", len(v.Array))
	}
	if v.Array[1].Str != "two" {
		t.Errorf("got %v", v.Array[1])
	}
}

func TestEmptyArray(t *testing.T) {
	v, _ := jsonp.Parse("[]")
	if v.Kind != jsonp.KindArray || len(v.Array) != 0 {
		t.Errorf("got %+v", v)
	}
}

func TestObject(t *testing.T) {
	v, _ := jsonp.Parse(`{"a": 1, "b": "two"}`)
	if v.Kind != jsonp.KindObject {
		t.Errorf("got %v", v.Kind)
	}
	if v.Object["a"].Num != 1 {
		t.Errorf("got %v", v.Object["a"])
	}
	if v.Object["b"].Str != "two" {
		t.Errorf("got %v", v.Object["b"])
	}
}

func TestEmptyObject(t *testing.T) {
	v, _ := jsonp.Parse("{}")
	if v.Kind != jsonp.KindObject || len(v.Object) != 0 {
		t.Errorf("got %+v", v)
	}
}

func TestNested(t *testing.T) {
	v, _ := jsonp.Parse(`{"x": [1, {"y": null}]}`)
	if v.Object["x"].Array[1].Object["y"].Kind != jsonp.KindNull {
		t.Errorf("nested not null")
	}
}

func TestRejectsTrailingGarbage(t *testing.T) {
	if _, err := jsonp.Parse("null}"); err == nil {
		t.Error("expected error")
	}
}

func TestRejectsUnterminatedString(t *testing.T) {
	if _, err := jsonp.Parse(`"oops`); err == nil {
		t.Error("expected error")
	}
}

func TestRejectsBadEscape(t *testing.T) {
	if _, err := jsonp.Parse(`"\x"`); err == nil {
		t.Error("expected error")
	}
}
