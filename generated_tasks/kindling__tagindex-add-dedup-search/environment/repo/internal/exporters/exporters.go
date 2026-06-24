// Package exporters provides pluggable record-output formatters.
package exporters

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"sort"
	"strings"
)

// Record is the row passed to an exporter.
type Record struct {
	Time   string
	Level  string
	Source string
	Body   string
	Labels map[string]string
}

// Exporter writes records to an io.Writer.
type Exporter interface {
	Header(w io.Writer) error
	Write(w io.Writer, rec Record) error
	Footer(w io.Writer) error
	Name() string
}

// New returns an exporter by name. Supported: json, jsonl, csv, tsv, console.
func New(name string) (Exporter, error) {
	switch strings.ToLower(name) {
	case "json":
		return &jsonExporter{}, nil
	case "jsonl":
		return &jsonlExporter{}, nil
	case "csv":
		return &delimExporter{sep: ','}, nil
	case "tsv":
		return &delimExporter{sep: '\t'}, nil
	case "console":
		return &consoleExporter{}, nil
	}
	return nil, errors.New("exporters: unknown name " + name)
}

// ---------- json ----------

type jsonExporter struct {
	first bool
}

func (j *jsonExporter) Name() string { return "json" }
func (j *jsonExporter) Header(w io.Writer) error {
	j.first = true
	_, err := w.Write([]byte("[\n"))
	return err
}
func (j *jsonExporter) Write(w io.Writer, rec Record) error {
	if !j.first {
		if _, err := w.Write([]byte(",\n")); err != nil {
			return err
		}
	}
	j.first = false
	enc := json.NewEncoder(w)
	enc.SetIndent("  ", "  ")
	return enc.Encode(rec)
}
func (j *jsonExporter) Footer(w io.Writer) error {
	_, err := w.Write([]byte("\n]\n"))
	return err
}

// ---------- jsonl ----------

type jsonlExporter struct{}

func (j *jsonlExporter) Name() string                 { return "jsonl" }
func (j *jsonlExporter) Header(w io.Writer) error     { return nil }
func (j *jsonlExporter) Footer(w io.Writer) error     { return nil }
func (j *jsonlExporter) Write(w io.Writer, r Record) error {
	return json.NewEncoder(w).Encode(r)
}

// ---------- csv / tsv ----------

type delimExporter struct {
	sep    rune
	cw     *csv.Writer
	fields []string
	wrote  bool
}

func (d *delimExporter) Name() string {
	if d.sep == ',' {
		return "csv"
	}
	return "tsv"
}

func (d *delimExporter) Header(w io.Writer) error {
	d.cw = csv.NewWriter(w)
	d.cw.Comma = d.sep
	return nil
}

func (d *delimExporter) Write(w io.Writer, r Record) error {
	if !d.wrote {
		keys := keysOf(r.Labels)
		d.fields = append([]string{"time", "level", "source", "body"}, keys...)
		if err := d.cw.Write(d.fields); err != nil {
			return err
		}
		d.wrote = true
	}
	row := []string{r.Time, r.Level, r.Source, r.Body}
	for _, k := range d.fields[4:] {
		row = append(row, r.Labels[k])
	}
	return d.cw.Write(row)
}

func (d *delimExporter) Footer(w io.Writer) error {
	d.cw.Flush()
	return d.cw.Error()
}

func keysOf(m map[string]string) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// ---------- console ----------

type consoleExporter struct{}

func (c *consoleExporter) Name() string                  { return "console" }
func (c *consoleExporter) Header(w io.Writer) error      { return nil }
func (c *consoleExporter) Footer(w io.Writer) error      { return nil }
func (c *consoleExporter) Write(w io.Writer, r Record) error {
	level := r.Level
	if level == "" {
		level = "info"
	}
	_, err := fmt.Fprintf(w, "%s [%s] %s %s\n", r.Time, level, r.Source, r.Body)
	return err
}
