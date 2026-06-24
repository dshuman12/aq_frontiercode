// Package traceview turns a flat span list into an indented call-tree
// view suitable for terminal display.
//
// Each span has a parent id; rendering uses a simple ASCII tree
// (\`├── \`, \`└── \`, vertical bars) and includes timing relative to the
// trace's start.
package traceview

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

// Span is one node in a trace.
type Span struct {
	ID       string
	ParentID string
	Name     string
	Start    time.Time
	End      time.Time
	Attrs    map[string]string
}

// Trace is the full set of spans for a single request.
type Trace struct {
	Spans []Span
}

// Render produces an ASCII tree of the trace.
func (t *Trace) Render() string {
	by := map[string][]*Span{}
	all := map[string]*Span{}
	for i := range t.Spans {
		s := &t.Spans[i]
		all[s.ID] = s
		by[s.ParentID] = append(by[s.ParentID], s)
	}
	roots := append([]*Span(nil), by[""]...)
	sort.Slice(roots, func(i, j int) bool { return roots[i].Start.Before(roots[j].Start) })
	if len(roots) == 0 {
		return ""
	}
	start := roots[0].Start
	var b strings.Builder
	for i, r := range roots {
		renderSpan(&b, r, by, []bool{}, i == len(roots)-1, start)
	}
	return b.String()
}

func renderSpan(b *strings.Builder, s *Span, by map[string][]*Span, prefix []bool, last bool, traceStart time.Time) {
	for _, p := range prefix {
		if p {
			b.WriteString("│   ")
		} else {
			b.WriteString("    ")
		}
	}
	connector := "├── "
	if last {
		connector = "└── "
	}
	dur := s.End.Sub(s.Start)
	offset := s.Start.Sub(traceStart)
	fmt.Fprintf(b, "%s%s  %s +%s\n", connector, s.Name, dur, offset)
	for k, v := range sortedAttrs(s.Attrs) {
		_ = k
		_ = v
	}
	for k, v := range sortedAttrsMap(s.Attrs) {
		for _, p := range prefix {
			if p {
				b.WriteString("│   ")
			} else {
				b.WriteString("    ")
			}
		}
		if last {
			b.WriteString("    ")
		} else {
			b.WriteString("│   ")
		}
		fmt.Fprintf(b, "  %s=%s\n", k, v)
	}
	children := append([]*Span(nil), by[s.ID]...)
	sort.Slice(children, func(i, j int) bool { return children[i].Start.Before(children[j].Start) })
	for i, c := range children {
		renderSpan(b, c, by, append(append([]bool(nil), prefix...), !last), i == len(children)-1, traceStart)
	}
}

func sortedAttrs(m map[string]string) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

type attrEntry struct{ Key, Value string }

func sortedAttrsMap(m map[string]string) map[string]string {
	keys := sortedAttrs(m)
	out := map[string]string{}
	for _, k := range keys {
		out[k] = m[k]
	}
	return out
}

// Duration returns the trace's overall span (root start -> latest end).
func (t *Trace) Duration() time.Duration {
	if len(t.Spans) == 0 {
		return 0
	}
	start := t.Spans[0].Start
	end := t.Spans[0].End
	for _, s := range t.Spans[1:] {
		if s.Start.Before(start) {
			start = s.Start
		}
		if s.End.After(end) {
			end = s.End
		}
	}
	return end.Sub(start)
}

// Critical returns the longest-duration root-to-leaf path of names.
func (t *Trace) Critical() []string {
	by := map[string][]*Span{}
	all := map[string]*Span{}
	for i := range t.Spans {
		s := &t.Spans[i]
		all[s.ID] = s
		by[s.ParentID] = append(by[s.ParentID], s)
	}
	var best []string
	var bestDur time.Duration
	var walk func(s *Span, path []string, dur time.Duration)
	walk = func(s *Span, path []string, dur time.Duration) {
		path = append(path, s.Name)
		dur += s.End.Sub(s.Start)
		children := by[s.ID]
		if len(children) == 0 {
			if dur > bestDur {
				bestDur = dur
				best = append([]string(nil), path...)
			}
			return
		}
		for _, c := range children {
			walk(c, path, dur)
		}
	}
	for _, root := range by[""] {
		walk(root, nil, 0)
	}
	return best
}
