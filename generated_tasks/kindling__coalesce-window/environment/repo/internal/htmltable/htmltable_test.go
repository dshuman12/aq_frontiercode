package htmltable

import (
	"strings"
	"testing"
)

func TestRender(t *testing.T) {
	tbl := &Table{
		Caption: "demo",
		Header:  []string{"name", "count"},
		Rows: [][]string{
			{"alpha", "1"},
			{"beta", "2"},
		},
	}
	out := tbl.Render()
	for _, want := range []string{"<table>", "<caption>demo</caption>", "<th>name</th>", "<td>alpha</td>"} {
		if !strings.Contains(out, want) {
			t.Fatalf("missing %q in %s", want, out)
		}
	}
}

func TestEscaping(t *testing.T) {
	tbl := &Table{Header: []string{"x"}, Rows: [][]string{{"<script>"}}}
	out := tbl.Render()
	if strings.Contains(out, "<script>") {
		t.Fatalf("unescaped: %s", out)
	}
}

func TestFromMaps(t *testing.T) {
	tbl := FromMaps([]map[string]string{
		{"a": "1", "b": "2"},
		{"a": "3"},
	})
	if len(tbl.Header) != 2 {
		t.Fatalf("header %v", tbl.Header)
	}
	if tbl.Rows[1][1] != "" {
		t.Fatalf("missing value not blanked: %v", tbl.Rows[1])
	}
}

func TestWrap(t *testing.T) {
	out := Wrap("title", "<p>hi</p>")
	if !strings.Contains(out, "<title>title</title>") {
		t.Fatalf("got %s", out)
	}
}

func TestSortRowsBy(t *testing.T) {
	tbl := &Table{
		Header: []string{"name"},
		Rows:   [][]string{{"banana"}, {"apple"}, {"cherry"}},
	}
	tbl.SortRowsBy("name")
	if tbl.Rows[0][0] != "apple" {
		t.Fatalf("got %s", tbl.Rows[0][0])
	}
}
