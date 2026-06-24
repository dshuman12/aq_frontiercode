package parquetx

import (
	"bytes"
	"strings"
	"testing"
)

func TestRoundTrip(t *testing.T) {
	cols := []Column{
		{"name", TypeString},
		{"age", TypeInt64},
		{"weight", TypeFloat64},
		{"active", TypeBool},
	}
	w := NewWriter(cols)
	for i := 0; i < 5; i++ {
		_ = w.AppendString("name", "row")
		_ = w.AppendInt("age", int64(i))
		_ = w.AppendFloat("weight", float64(i)*1.5)
		_ = w.AppendBool("active", i%2 == 0)
	}
	var buf bytes.Buffer
	if _, err := w.WriteTo(&buf); err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(buf.Bytes(), Magic[:]) {
		t.Fatal("missing magic prefix")
	}
	if !bytes.HasSuffix(buf.Bytes(), Magic[:]) {
		t.Fatal("missing magic suffix")
	}
}

func TestSchemaSummary(t *testing.T) {
	got := SchemaSummary([]Column{
		{"a", TypeInt64},
		{"b", TypeString},
	})
	if !strings.Contains(got, "int64") || !strings.Contains(got, "string") {
		t.Fatalf("got %s", got)
	}
}

func TestRejectsWrongType(t *testing.T) {
	w := NewWriter([]Column{{"x", TypeString}})
	if err := w.AppendInt("x", 1); err == nil {
		t.Fatal("expected err")
	}
}

func TestRows(t *testing.T) {
	w := NewWriter([]Column{{"x", TypeString}})
	for i := 0; i < 3; i++ {
		_ = w.AppendString("x", "v")
	}
	if w.Rows("x") != 3 {
		t.Fatal("rows")
	}
}
