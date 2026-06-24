// Package promfmt parses and emits Prometheus text exposition format.
//
// The format is documented at
// https://prometheus.io/docs/instrumenting/exposition_formats/. This
// implementation is intentionally minimal: it understands counter, gauge,
// histogram and summary lines but does not validate label-name UTF-8 or
// reject unknown TYPE values - those checks are left to upstream tooling.
package promfmt

import (
	"bufio"
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"
)

// Sample is one observation of a metric.
type Sample struct {
	Name   string
	Labels map[string]string
	Value  float64
}

// Family groups Samples that share a metric name + help + type.
type Family struct {
	Name    string
	Help    string
	Type    string // "counter", "gauge", "histogram", "summary", "untyped"
	Samples []Sample
}

// Parse decodes a stream of exposition lines into families.
func Parse(r io.Reader) ([]*Family, error) {
	families := map[string]*Family{}
	order := []string{}
	br := bufio.NewScanner(r)
	br.Buffer(make([]byte, 64*1024), 1024*1024)
	for br.Scan() {
		line := strings.TrimSpace(br.Text())
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "# HELP ") {
			rest := strings.TrimPrefix(line, "# HELP ")
			parts := strings.SplitN(rest, " ", 2)
			if len(parts) != 2 {
				continue
			}
			f := getOrCreate(families, &order, parts[0])
			f.Help = parts[1]
			continue
		}
		if strings.HasPrefix(line, "# TYPE ") {
			rest := strings.TrimPrefix(line, "# TYPE ")
			parts := strings.SplitN(rest, " ", 2)
			if len(parts) != 2 {
				continue
			}
			f := getOrCreate(families, &order, parts[0])
			f.Type = parts[1]
			continue
		}
		if strings.HasPrefix(line, "#") {
			continue
		}
		s, fam, err := parseSample(line)
		if err != nil {
			return nil, err
		}
		f := getOrCreate(families, &order, fam)
		f.Samples = append(f.Samples, s)
	}
	if err := br.Err(); err != nil {
		return nil, err
	}
	out := make([]*Family, 0, len(order))
	for _, n := range order {
		out = append(out, families[n])
	}
	return out, nil
}

func getOrCreate(m map[string]*Family, order *[]string, name string) *Family {
	if f, ok := m[name]; ok {
		return f
	}
	f := &Family{Name: name, Type: "untyped"}
	m[name] = f
	*order = append(*order, name)
	return f
}

func parseSample(line string) (Sample, string, error) {
	openBrace := strings.IndexByte(line, '{')
	closeBrace := -1
	if openBrace >= 0 {
		closeBrace = strings.IndexByte(line, '}')
		if closeBrace < openBrace {
			return Sample{}, "", fmt.Errorf("promfmt: unbalanced braces in %q", line)
		}
	}
	var (
		name   string
		labels map[string]string
		rest   string
	)
	if openBrace >= 0 {
		name = line[:openBrace]
		labels = parseLabels(line[openBrace+1 : closeBrace])
		rest = strings.TrimSpace(line[closeBrace+1:])
	} else {
		sp := strings.IndexByte(line, ' ')
		if sp < 0 {
			return Sample{}, "", fmt.Errorf("promfmt: no value in %q", line)
		}
		name = line[:sp]
		rest = line[sp+1:]
	}
	parts := strings.Fields(rest)
	if len(parts) == 0 {
		return Sample{}, "", fmt.Errorf("promfmt: missing value for %q", name)
	}
	v, err := strconv.ParseFloat(parts[0], 64)
	if err != nil {
		return Sample{}, "", fmt.Errorf("promfmt: bad value %q: %w", parts[0], err)
	}
	famName := name
	if i := strings.LastIndexByte(name, '_'); i > 0 {
		switch name[i:] {
		case "_bucket", "_count", "_sum":
			famName = name[:i]
		}
	}
	return Sample{Name: name, Labels: labels, Value: v}, famName, nil
}

func parseLabels(s string) map[string]string {
	out := map[string]string{}
	for len(s) > 0 {
		eq := strings.IndexByte(s, '=')
		if eq < 0 {
			return out
		}
		k := strings.TrimSpace(s[:eq])
		s = s[eq+1:]
		if len(s) < 2 || s[0] != '"' {
			return out
		}
		end := 1
		for end < len(s) && s[end] != '"' {
			if s[end] == '\\' && end+1 < len(s) {
				end += 2
				continue
			}
			end++
		}
		v := strings.NewReplacer("\\\"", "\"", "\\\\", "\\").Replace(s[1:end])
		out[k] = v
		s = s[end+1:]
		s = strings.TrimLeft(s, ", ")
	}
	return out
}

// Write emits families in stable order.
func Write(w io.Writer, families []*Family) error {
	bw := bufio.NewWriter(w)
	defer bw.Flush()
	for _, f := range families {
		if f.Help != "" {
			fmt.Fprintf(bw, "# HELP %s %s\n", f.Name, f.Help)
		}
		if f.Type != "" {
			fmt.Fprintf(bw, "# TYPE %s %s\n", f.Name, f.Type)
		}
		for _, s := range f.Samples {
			if len(s.Labels) == 0 {
				fmt.Fprintf(bw, "%s %v\n", s.Name, s.Value)
				continue
			}
			keys := make([]string, 0, len(s.Labels))
			for k := range s.Labels {
				keys = append(keys, k)
			}
			sort.Strings(keys)
			pairs := make([]string, len(keys))
			for i, k := range keys {
				pairs[i] = fmt.Sprintf("%s=%q", k, s.Labels[k])
			}
			fmt.Fprintf(bw, "%s{%s} %v\n", s.Name, strings.Join(pairs, ","), s.Value)
		}
	}
	return nil
}
