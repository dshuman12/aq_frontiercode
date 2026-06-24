package csv_test

import (
	"reflect"
	"testing"

	"github.com/dleblanc/kindling/internal/csv"
)

func TestReadSimple(t *testing.T) {
	rows, err := csv.Read("a,b,c\n1,2,3\n")
	if err != nil {
		t.Fatal(err)
	}
	want := [][]string{{"a", "b", "c"}, {"1", "2", "3"}}
	if !reflect.DeepEqual(rows, want) {
		t.Errorf("got %v", rows)
	}
}

func TestReadQuotedComma(t *testing.T) {
	rows, _ := csv.Read(`a,"b,c",d`)
	if !reflect.DeepEqual(rows[0], []string{"a", "b,c", "d"}) {
		t.Errorf("got %v", rows[0])
	}
}

func TestReadQuoteEscape(t *testing.T) {
	rows, _ := csv.Read(`a,"b""c",d`)
	if rows[0][1] != `b"c` {
		t.Errorf("got %q", rows[0][1])
	}
}

func TestReadUnterminatedQuoteErrors(t *testing.T) {
	if _, err := csv.Read(`a,"unterminated`); err == nil {
		t.Error("expected error")
	}
}

func TestReadEmptyLines(t *testing.T) {
	rows, _ := csv.Read("a,b\n\nc,d\n")
	if len(rows) != 2 {
		t.Errorf("got %d", len(rows))
	}
}

func TestWriteSimple(t *testing.T) {
	got := csv.Write([][]string{{"a", "b"}, {"1", "2"}})
	if got != "a,b\n1,2" {
		t.Errorf("got %q", got)
	}
}

func TestWriteEscapesComma(t *testing.T) {
	got := csv.Write([][]string{{"a,b", "c"}})
	if got != `"a,b",c` {
		t.Errorf("got %q", got)
	}
}

func TestWriteEscapesQuote(t *testing.T) {
	got := csv.Write([][]string{{`a"b`}})
	if got != `"a""b"` {
		t.Errorf("got %q", got)
	}
}

func TestRoundTrip(t *testing.T) {
	rows := [][]string{
		{"a", "b,c", "d"},
		{"1", `2"3`, "4"},
	}
	out, _ := csv.Read(csv.Write(rows))
	if !reflect.DeepEqual(out, rows) {
		t.Errorf("got %v", out)
	}
}
