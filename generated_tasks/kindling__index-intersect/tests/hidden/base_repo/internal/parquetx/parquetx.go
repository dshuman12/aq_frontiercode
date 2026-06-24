// Package parquetx writes a simplified columnar file format inspired by
// Apache Parquet. It is not wire-compatible with real Parquet readers;
// the goal is to give kindling a column-oriented dump format that
// downstream BI tools can ingest after a small adapter step.
//
// File layout:
//
//	magic       4 bytes  "KPQ1"
//	column_count uint32 BE
//	for each column:
//	  name_len  uint16 BE
//	  name      bytes
//	  type      uint8 (1=string, 2=int64, 3=float64, 4=bool)
//	  row_count uint32 BE
//	  payload   per-type encoded bytes
//	footer_off  uint64 BE (offset of the column index)
//	magic       4 bytes  "KPQ1"
package parquetx

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"math"
	"sort"
)

// Magic identifies a parquetx file.
var Magic = [4]byte{'K', 'P', 'Q', '1'}

// Type names a column type.
type Type uint8

const (
	TypeString  Type = 1
	TypeInt64   Type = 2
	TypeFloat64 Type = 3
	TypeBool    Type = 4
)

// Column is a single column descriptor.
type Column struct {
	Name string
	Type Type
}

// Writer collects column data in memory then emits a single file.
type Writer struct {
	cols    []Column
	strings map[string][]string
	ints    map[string][]int64
	floats  map[string][]float64
	bools   map[string][]bool
	rowsByName map[string]int
}

// NewWriter constructs a Writer with the given schema.
func NewWriter(cols []Column) *Writer {
	w := &Writer{
		cols:    append([]Column(nil), cols...),
		strings: map[string][]string{},
		ints:    map[string][]int64{},
		floats:  map[string][]float64{},
		bools:   map[string][]bool{},
		rowsByName: map[string]int{},
	}
	for _, c := range cols {
		w.rowsByName[c.Name] = 0
	}
	return w
}

// AppendString appends s to a string column.
func (w *Writer) AppendString(name, s string) error {
	col, ok := w.colByName(name, TypeString)
	if !ok {
		return fmt.Errorf("parquetx: column %q is not string", name)
	}
	w.strings[col.Name] = append(w.strings[col.Name], s)
	w.rowsByName[col.Name]++
	return nil
}

// AppendInt appends i to an int64 column.
func (w *Writer) AppendInt(name string, i int64) error {
	col, ok := w.colByName(name, TypeInt64)
	if !ok {
		return fmt.Errorf("parquetx: column %q is not int64", name)
	}
	w.ints[col.Name] = append(w.ints[col.Name], i)
	w.rowsByName[col.Name]++
	return nil
}

// AppendFloat appends f to a float64 column.
func (w *Writer) AppendFloat(name string, f float64) error {
	col, ok := w.colByName(name, TypeFloat64)
	if !ok {
		return fmt.Errorf("parquetx: column %q is not float64", name)
	}
	w.floats[col.Name] = append(w.floats[col.Name], f)
	w.rowsByName[col.Name]++
	return nil
}

// AppendBool appends b to a bool column.
func (w *Writer) AppendBool(name string, b bool) error {
	col, ok := w.colByName(name, TypeBool)
	if !ok {
		return fmt.Errorf("parquetx: column %q is not bool", name)
	}
	w.bools[col.Name] = append(w.bools[col.Name], b)
	w.rowsByName[col.Name]++
	return nil
}

// Rows returns the number of rows recorded for the named column.
func (w *Writer) Rows(name string) int { return w.rowsByName[name] }

// WriteTo writes the assembled file to dst. Columns are emitted in
// schema order so the file is deterministic.
func (w *Writer) WriteTo(dst io.Writer) (int64, error) {
	var n int64
	if k, err := dst.Write(Magic[:]); err != nil {
		return n + int64(k), err
	} else {
		n += int64(k)
	}
	var hdr [4]byte
	binary.BigEndian.PutUint32(hdr[:], uint32(len(w.cols)))
	if k, err := dst.Write(hdr[:]); err != nil {
		return n + int64(k), err
	} else {
		n += int64(k)
	}
	for _, col := range w.cols {
		if k, err := writeColumn(dst, col, w); err != nil {
			return n + k, err
		} else {
			n += k
		}
	}
	var footer [8]byte
	binary.BigEndian.PutUint64(footer[:], uint64(n)) // offset of footer marker
	if k, err := dst.Write(footer[:]); err != nil {
		return n + int64(k), err
	} else {
		n += int64(k)
	}
	if k, err := dst.Write(Magic[:]); err != nil {
		return n + int64(k), err
	} else {
		n += int64(k)
	}
	return n, nil
}

func (w *Writer) colByName(name string, want Type) (Column, bool) {
	for _, c := range w.cols {
		if c.Name == name {
			return c, c.Type == want
		}
	}
	return Column{}, false
}

func writeColumn(dst io.Writer, c Column, w *Writer) (int64, error) {
	var n int64
	nameBytes := []byte(c.Name)
	if len(nameBytes) > 0xFFFF {
		return 0, errors.New("parquetx: column name too long")
	}
	var hdr [3]byte
	binary.BigEndian.PutUint16(hdr[:2], uint16(len(nameBytes)))
	hdr[2] = byte(c.Type)
	if k, err := dst.Write(hdr[:]); err != nil {
		return n + int64(k), err
	} else {
		n += int64(k)
	}
	if k, err := dst.Write(nameBytes); err != nil {
		return n + int64(k), err
	} else {
		n += int64(k)
	}
	rows := uint32(w.rowsByName[c.Name])
	var rb [4]byte
	binary.BigEndian.PutUint32(rb[:], rows)
	if k, err := dst.Write(rb[:]); err != nil {
		return n + int64(k), err
	} else {
		n += int64(k)
	}
	switch c.Type {
	case TypeString:
		k, err := writeStrings(dst, w.strings[c.Name])
		return n + k, err
	case TypeInt64:
		k, err := writeInts(dst, w.ints[c.Name])
		return n + k, err
	case TypeFloat64:
		k, err := writeFloats(dst, w.floats[c.Name])
		return n + k, err
	case TypeBool:
		k, err := writeBools(dst, w.bools[c.Name])
		return n + k, err
	}
	return n, fmt.Errorf("parquetx: unknown type %d", c.Type)
}

func writeStrings(dst io.Writer, xs []string) (int64, error) {
	var n int64
	for _, s := range xs {
		var l [4]byte
		binary.BigEndian.PutUint32(l[:], uint32(len(s)))
		if k, err := dst.Write(l[:]); err != nil {
			return n + int64(k), err
		} else {
			n += int64(k)
		}
		if k, err := io.WriteString(dst, s); err != nil {
			return n + int64(k), err
		} else {
			n += int64(k)
		}
	}
	return n, nil
}

func writeInts(dst io.Writer, xs []int64) (int64, error) {
	var n int64
	var buf [8]byte
	for _, v := range xs {
		binary.BigEndian.PutUint64(buf[:], uint64(v))
		k, err := dst.Write(buf[:])
		n += int64(k)
		if err != nil {
			return n, err
		}
	}
	return n, nil
}

func writeFloats(dst io.Writer, xs []float64) (int64, error) {
	var n int64
	var buf [8]byte
	for _, v := range xs {
		binary.BigEndian.PutUint64(buf[:], math.Float64bits(v))
		k, err := dst.Write(buf[:])
		n += int64(k)
		if err != nil {
			return n, err
		}
	}
	return n, nil
}

func writeBools(dst io.Writer, xs []bool) (int64, error) {
	var n int64
	for i := 0; i < len(xs); i += 8 {
		var b byte
		for j := 0; j < 8 && i+j < len(xs); j++ {
			if xs[i+j] {
				b |= 1 << uint(j)
			}
		}
		k, err := dst.Write([]byte{b})
		n += int64(k)
		if err != nil {
			return n, err
		}
	}
	return n, nil
}

// SchemaSummary returns a stable string describing the schema.
func SchemaSummary(cols []Column) string {
	out := make([]string, len(cols))
	for i, c := range cols {
		out[i] = fmt.Sprintf("%s:%s", c.Name, typeName(c.Type))
	}
	sort.Strings(out)
	return "{" + bytes.NewBufferString(joinComma(out)).String() + "}"
}

func typeName(t Type) string {
	switch t {
	case TypeString:
		return "string"
	case TypeInt64:
		return "int64"
	case TypeFloat64:
		return "float64"
	case TypeBool:
		return "bool"
	}
	return "?"
}

func joinComma(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += ","
		}
		out += p
	}
	return out
}
