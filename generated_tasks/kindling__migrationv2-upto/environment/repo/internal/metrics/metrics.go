// Package metrics is a tiny Prometheus-format counter + gauge
// registry.
package metrics

import (
	"fmt"
	"sort"
	"strings"
	"sync"
)

// Registry holds counters and gauges.
type Registry struct {
	mu       sync.Mutex
	families map[string]*family
}

type family struct {
	name string
	help string
	kind kind
	rows map[string]*row
}

type row struct {
	labels []labelPair
	value  float64
}

type labelPair struct {
	key, value string
}

type kind int

const (
	kindCounter kind = iota
	kindGauge
)

// New returns an empty registry.
func New() *Registry {
	return &Registry{families: map[string]*family{}}
}

// CounterInc increments a counter named by name + labels by `by`.
func (r *Registry) CounterInc(name, help string, labels map[string]string, by float64) {
	if by < 0 {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	f := r.ensure(name, help, kindCounter)
	if f == nil {
		return
	}
	key := labelKey(labels)
	if existing, ok := f.rows[key]; ok {
		existing.value += by
		return
	}
	f.rows[key] = &row{labels: labelPairs(labels), value: by}
}

// GaugeSet sets a gauge value.
func (r *Registry) GaugeSet(name, help string, labels map[string]string, value float64) {
	r.mu.Lock()
	defer r.mu.Unlock()
	f := r.ensure(name, help, kindGauge)
	if f == nil {
		return
	}
	key := labelKey(labels)
	f.rows[key] = &row{labels: labelPairs(labels), value: value}
}

// Render produces the Prometheus text-format dump.
func (r *Registry) Render() string {
	r.mu.Lock()
	defer r.mu.Unlock()
	var sb strings.Builder
	names := make([]string, 0, len(r.families))
	for n := range r.families {
		names = append(names, n)
	}
	sort.Strings(names)
	for _, name := range names {
		f := r.families[name]
		fmt.Fprintf(&sb, "# HELP %s %s\n", name, f.help)
		fmt.Fprintf(&sb, "# TYPE %s %s\n", name, kindName(f.kind))
		keys := make([]string, 0, len(f.rows))
		for k := range f.rows {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			row := f.rows[k]
			sb.WriteString(name)
			sb.WriteString(renderLabels(row.labels))
			sb.WriteByte(' ')
			sb.WriteString(formatValue(row.value))
			sb.WriteByte('\n')
		}
	}
	return sb.String()
}

// Reset clears every family.
func (r *Registry) Reset() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.families = map[string]*family{}
}

func (r *Registry) ensure(name, help string, k kind) *family {
	f, ok := r.families[name]
	if !ok {
		f = &family{name: name, help: help, kind: k, rows: map[string]*row{}}
		r.families[name] = f
		return f
	}
	if f.kind != k {
		return nil
	}
	return f
}

func labelKey(labels map[string]string) string {
	if len(labels) == 0 {
		return ""
	}
	keys := make([]string, 0, len(labels))
	for k := range labels {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var sb strings.Builder
	for _, k := range keys {
		sb.WriteString(k)
		sb.WriteByte('=')
		sb.WriteString(labels[k])
		sb.WriteByte(';')
	}
	return sb.String()
}

func labelPairs(labels map[string]string) []labelPair {
	if len(labels) == 0 {
		return nil
	}
	keys := make([]string, 0, len(labels))
	for k := range labels {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make([]labelPair, 0, len(keys))
	for _, k := range keys {
		out = append(out, labelPair{key: k, value: labels[k]})
	}
	return out
}

func renderLabels(pairs []labelPair) string {
	if len(pairs) == 0 {
		return ""
	}
	var sb strings.Builder
	sb.WriteByte('{')
	for i, p := range pairs {
		if i > 0 {
			sb.WriteByte(',')
		}
		sb.WriteString(p.key)
		sb.WriteString("=\"")
		sb.WriteString(escapeLabel(p.value))
		sb.WriteByte('"')
	}
	sb.WriteByte('}')
	return sb.String()
}

func escapeLabel(s string) string {
	return strings.NewReplacer(`\\`, `\\\\`, `"`, `\\"`, "\n", `\\n`).Replace(s)
}

func formatValue(v float64) string {
	if v != v {
		return "NaN"
	}
	if v > 1e308 {
		return "+Inf"
	}
	if v < -1e308 {
		return "-Inf"
	}
	asInt := int64(v)
	if float64(asInt) == v {
		return fmt.Sprintf("%d", asInt)
	}
	return fmt.Sprintf("%g", v)
}

func kindName(k kind) string {
	if k == kindCounter {
		return "counter"
	}
	return "gauge"
}
