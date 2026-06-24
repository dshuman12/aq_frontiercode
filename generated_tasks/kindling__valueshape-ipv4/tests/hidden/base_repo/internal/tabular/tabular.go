// Package tabular renders kindling's tabular results as fixed-width
// terminal tables with optional column alignment, value truncation,
// and unicode box-drawing borders.
//
// The renderer is intentionally synchronous: it materialises the full
// table in memory before printing because alignment requires knowing
// every column width up front.
package tabular

import (
	"fmt"
	"sort"
	"strings"
	"unicode/utf8"
)

// Align is one column's alignment.
type Align int

const (
	AlignLeft Align = iota
	AlignRight
	AlignCenter
)

// Column describes one column in the table.
type Column struct {
	Name     string
	Align    Align
	MaxWidth int
}

// Style chooses the table decoration.
type Style int

const (
	StylePlain Style = iota
	StyleASCII
	StyleUnicode
)

// Table is a renderable table.
type Table struct {
	Columns []Column
	Rows    [][]string
	Style   Style
}

// Render returns the formatted table string.
func (t *Table) Render() string {
	if len(t.Columns) == 0 {
		return ""
	}
	widths := make([]int, len(t.Columns))
	for i, c := range t.Columns {
		widths[i] = utf8.RuneCountInString(c.Name)
	}
	for _, row := range t.Rows {
		for i, cell := range row {
			n := utf8.RuneCountInString(cell)
			if t.Columns[i].MaxWidth > 0 && n > t.Columns[i].MaxWidth {
				n = t.Columns[i].MaxWidth
			}
			if n > widths[i] {
				widths[i] = n
			}
		}
	}
	var b strings.Builder
	t.writeTopBorder(&b, widths)
	t.writeRow(&b, t.headerRow(), widths)
	t.writeMidBorder(&b, widths)
	for _, row := range t.Rows {
		t.writeRow(&b, row, widths)
	}
	t.writeBottomBorder(&b, widths)
	return b.String()
}

func (t *Table) headerRow() []string {
	out := make([]string, len(t.Columns))
	for i, c := range t.Columns {
		out[i] = c.Name
	}
	return out
}

func (t *Table) writeTopBorder(b *strings.Builder, widths []int) {
	switch t.Style {
	case StyleUnicode:
		b.WriteString(border(widths, "┌", "┬", "┐", "─"))
	case StyleASCII:
		b.WriteString(border(widths, "+", "+", "+", "-"))
	}
}

func (t *Table) writeMidBorder(b *strings.Builder, widths []int) {
	switch t.Style {
	case StyleUnicode:
		b.WriteString(border(widths, "├", "┼", "┤", "─"))
	case StyleASCII:
		b.WriteString(border(widths, "+", "+", "+", "-"))
	}
}

func (t *Table) writeBottomBorder(b *strings.Builder, widths []int) {
	switch t.Style {
	case StyleUnicode:
		b.WriteString(border(widths, "└", "┴", "┘", "─"))
	case StyleASCII:
		b.WriteString(border(widths, "+", "+", "+", "-"))
	}
}

func border(widths []int, left, mid, right, fill string) string {
	var b strings.Builder
	b.WriteString(left)
	for i, w := range widths {
		b.WriteString(strings.Repeat(fill, w+2))
		if i == len(widths)-1 {
			b.WriteString(right)
		} else {
			b.WriteString(mid)
		}
	}
	b.WriteString("\n")
	return b.String()
}

func (t *Table) writeRow(b *strings.Builder, row []string, widths []int) {
	sep := " "
	left, mid, right := "", "", ""
	switch t.Style {
	case StyleUnicode:
		left, mid, right = "│", "│", "│"
	case StyleASCII:
		left, mid, right = "|", "|", "|"
	}
	b.WriteString(left)
	for i := range t.Columns {
		cell := ""
		if i < len(row) {
			cell = row[i]
		}
		cell = truncate(cell, t.Columns[i].MaxWidth)
		cell = pad(cell, widths[i], t.Columns[i].Align)
		b.WriteString(sep + cell + sep)
		if i == len(widths)-1 {
			b.WriteString(right)
		} else {
			b.WriteString(mid)
		}
	}
	b.WriteString("\n")
}

func pad(s string, width int, a Align) string {
	n := utf8.RuneCountInString(s)
	if n >= width {
		return s
	}
	pad := width - n
	switch a {
	case AlignRight:
		return strings.Repeat(" ", pad) + s
	case AlignCenter:
		left := pad / 2
		return strings.Repeat(" ", left) + s + strings.Repeat(" ", pad-left)
	}
	return s + strings.Repeat(" ", pad)
}

func truncate(s string, max int) string {
	if max <= 0 || utf8.RuneCountInString(s) <= max {
		return s
	}
	if max <= 1 {
		return "…"
	}
	count := 0
	for i := range s {
		count++
		if count == max {
			return s[:i] + "…"
		}
	}
	return s
}

// FromMaps builds a Table from a slice of map rows. Columns are the
// alphabetically-sorted union of keys.
func FromMaps(items []map[string]string) *Table {
	cols := map[string]struct{}{}
	for _, m := range items {
		for k := range m {
			cols[k] = struct{}{}
		}
	}
	header := make([]Column, 0, len(cols))
	keys := make([]string, 0, len(cols))
	for k := range cols {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		header = append(header, Column{Name: k, Align: AlignLeft})
	}
	rows := make([][]string, len(items))
	for i, m := range items {
		row := make([]string, len(keys))
		for j, k := range keys {
			row[j] = m[k]
		}
		rows[i] = row
	}
	return &Table{Columns: header, Rows: rows, Style: StylePlain}
}

// SortRowsBy sorts rows by the column with the given header name.
func (t *Table) SortRowsBy(name string) {
	idx := -1
	for i, c := range t.Columns {
		if c.Name == name {
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

// AlignByName updates the alignment of the column with the given name.
func (t *Table) AlignByName(name string, a Align) {
	for i, c := range t.Columns {
		if c.Name == name {
			t.Columns[i].Align = a
			return
		}
	}
}

// String is a convenience wrapper for fmt.Sprintf use cases.
func (t *Table) String() string { return t.Render() }

// Summary returns "<rows> rows, <cols> cols".
func (t *Table) Summary() string {
	return fmt.Sprintf("%d rows, %d cols", len(t.Rows), len(t.Columns))
}
