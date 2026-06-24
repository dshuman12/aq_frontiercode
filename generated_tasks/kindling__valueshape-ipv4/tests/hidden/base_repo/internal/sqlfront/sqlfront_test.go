package sqlfront

import (
	"strings"
	"testing"
)

func TestSimpleSelect(t *testing.T) {
	s, err := Parse("SELECT a, b FROM t")
	if err != nil {
		t.Fatal(err)
	}
	if len(s.Columns) != 2 || s.Columns[0].Name != "a" || s.From != "t" {
		t.Fatalf("got %+v", s)
	}
}

func TestStarColumn(t *testing.T) {
	s, _ := Parse("SELECT * FROM t")
	if !s.Columns[0].Star {
		t.Fatalf("star not parsed: %+v", s.Columns)
	}
}

func TestAggregate(t *testing.T) {
	s, err := Parse("SELECT COUNT(id) AS n FROM events GROUP BY service")
	if err != nil {
		t.Fatal(err)
	}
	if s.Columns[0].Func != "COUNT" || s.Columns[0].Alias != "n" {
		t.Fatalf("got %+v", s.Columns[0])
	}
	if len(s.GroupBy) != 1 || s.GroupBy[0] != "service" {
		t.Fatalf("groupby %+v", s.GroupBy)
	}
}

func TestWhere(t *testing.T) {
	s, err := Parse("SELECT a FROM t WHERE level = 'info' AND ms > 100")
	if err != nil {
		t.Fatal(err)
	}
	low := s.Lower()
	if !strings.Contains(low.Filter, "AND") {
		t.Fatalf("filter %q", low.Filter)
	}
}

func TestOrderLimit(t *testing.T) {
	s, err := Parse("SELECT a FROM t ORDER BY a DESC, b LIMIT 10 OFFSET 5")
	if err != nil {
		t.Fatal(err)
	}
	if s.Limit != 10 || s.Offset != 5 {
		t.Fatalf("limit/offset %+v", s)
	}
	if !s.OrderBy[0].Descending || s.OrderBy[1].Descending {
		t.Fatalf("order %+v", s.OrderBy)
	}
}

func TestRejectTrailing(t *testing.T) {
	if _, err := Parse("SELECT a FROM t junk"); err == nil {
		t.Fatal("expected err")
	}
}

func TestNotExpr(t *testing.T) {
	s, err := Parse("SELECT a FROM t WHERE NOT level = 'debug'")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(s.Lower().Filter, "NOT") {
		t.Fatalf("got %q", s.Lower().Filter)
	}
}
