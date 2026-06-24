package tabular

import (
	"strings"
	"testing"
)

func TestRenderPlain(t *testing.T) {
	tbl := &Table{
		Columns: []Column{{Name: "name"}, {Name: "count", Align: AlignRight}},
		Rows: [][]string{
			{"alpha", "1"},
			{"beta", "2"},
		},
	}
	out := tbl.Render()
	if !strings.Contains(out, "alpha") {
		t.Fatalf("got %s", out)
	}
}

func TestRenderUnicode(t *testing.T) {
	tbl := &Table{
		Columns: []Column{{Name: "x"}},
		Rows:    [][]string{{"y"}},
		Style:   StyleUnicode,
	}
	out := tbl.Render()
	if !strings.Contains(out, "│") || !strings.Contains(out, "─") {
		t.Fatalf("got %s", out)
	}
}

func TestTruncate(t *testing.T) {
	tbl := &Table{
		Columns: []Column{{Name: "n", MaxWidth: 4}},
		Rows:    [][]string{{"abcdefghij"}},
	}
	if !strings.Contains(tbl.Render(), "abc…") {
		t.Fatalf("got %s", tbl.Render())
	}
}

func TestFromMaps(t *testing.T) {
	tbl := FromMaps([]map[string]string{
		{"a": "1", "b": "2"},
		{"a": "3"},
	})
	if len(tbl.Columns) != 2 || tbl.Columns[0].Name != "a" {
		t.Fatalf("cols %+v", tbl.Columns)
	}
}

func TestSortRowsBy(t *testing.T) {
	tbl := &Table{
		Columns: []Column{{Name: "n"}},
		Rows:    [][]string{{"banana"}, {"apple"}, {"cherry"}},
	}
	tbl.SortRowsBy("n")
	if tbl.Rows[0][0] != "apple" {
		t.Fatalf("got %s", tbl.Rows[0][0])
	}
}

func TestAlignByName(t *testing.T) {
	tbl := &Table{
		Columns: []Column{{Name: "x"}},
	}
	tbl.AlignByName("x", AlignRight)
	if tbl.Columns[0].Align != AlignRight {
		t.Fatal("not aligned")
	}
}

func TestSummary(t *testing.T) {
	tbl := &Table{
		Columns: []Column{{Name: "a"}},
		Rows:    [][]string{{"1"}, {"2"}},
	}
	if tbl.Summary() != "2 rows, 1 cols" {
		t.Fatalf("got %s", tbl.Summary())
	}
}

func TestEmptyTable(t *testing.T) {
	tbl := &Table{}
	if tbl.Render() != "" {
		t.Fatal("expected empty")
	}
}
