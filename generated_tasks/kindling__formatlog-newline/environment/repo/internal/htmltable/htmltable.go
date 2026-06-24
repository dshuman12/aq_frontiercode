// Package htmltable renders kindling's tabular results as small HTML
// fragments suitable for embedding in dashboards.
//
// The output is intentionally minimalist: a table with thead/tbody, no
// inline styling, no JavaScript, and HTML-escaped cell contents. Callers
// that want richer styling layer their own CSS over the emitted markup.
package htmltable

import (
	"bytes"
	"fmt"
	"html"
	"sort"
	"strings"
)

// Table is one renderable table.
type Table struct {
	Caption string
	Header  []string
	Rows    [][]string
}

// Render returns the HTML for t.
func (t *Table) Render() string {
	var b bytes.Buffer
	b.WriteString("<table>\n")
	if t.Caption != "" {
		fmt.Fprintf(&b, "  <caption>%s</caption>\n", html.EscapeString(t.Caption))
	}
	if len(t.Header) > 0 {
		b.WriteString("  <thead>\n    <tr>")
		for _, h := range t.Header {
			fmt.Fprintf(&b, "<th>%s</th>", html.EscapeString(h))
		}
		b.WriteString("</tr>\n  </thead>\n")
	}
	b.WriteString("  <tbody>\n")
	for _, row := range t.Rows {
		b.WriteString("    <tr>")
		for _, cell := range row {
			fmt.Fprintf(&b, "<td>%s</td>", html.EscapeString(cell))
		}
		b.WriteString("</tr>\n")
	}
	b.WriteString("  </tbody>\n</table>\n")
	return b.String()
}

// FromMaps builds a Table from a slice of map rows. Columns are
// determined by the union of keys, sorted alphabetically.
func FromMaps(items []map[string]string) *Table {
	cols := map[string]struct{}{}
	for _, item := range items {
		for k := range item {
			cols[k] = struct{}{}
		}
	}
	header := make([]string, 0, len(cols))
	for k := range cols {
		header = append(header, k)
	}
	sort.Strings(header)
	rows := make([][]string, len(items))
	for i, item := range items {
		row := make([]string, len(header))
		for j, k := range header {
			row[j] = item[k]
		}
		rows[i] = row
	}
	return &Table{Header: header, Rows: rows}
}

// Wrap produces a complete HTML5 document containing body.
func Wrap(title, body string) string {
	return strings.Join([]string{
		"<!DOCTYPE html>",
		"<html lang=\"en\">",
		"<head>",
		"  <meta charset=\"utf-8\">",
		"  <title>" + html.EscapeString(title) + "</title>",
		"</head>",
		"<body>",
		body,
		"</body>",
		"</html>",
	}, "\n")
}

// SortRowsBy sorts rows by the column with the given header name.
func (t *Table) SortRowsBy(name string) {
	idx := -1
	for i, h := range t.Header {
		if h == name {
			idx = i
			break
		}
	}
	if idx < 0 {
		return
	}
	sort.SliceStable(t.Rows, func(i, j int) bool {
		return t.Rows[i][idx] < t.Rows[j][idx]
	})
}
