// Package queryplanner converts a parsed query into a plan node tree
// and walks the tree to estimate execution cost.
//
// kindling's main path is interpretation, not compilation; the planner
// exists so operators can run "explain" against ad-hoc queries to
// understand which predicates will use the inverted index, which will
// fall back to a scan, and what the estimated row count is.
package queryplanner

import (
	"fmt"
	"sort"
	"strings"
)

// Node is one operator in the plan tree.
type Node interface {
	Name() string
	EstRows() int
	Children() []Node
	Render(indent int) string
}

// Scan reads every record sequentially.
type Scan struct {
	Source string
	Total  int
}

func (s *Scan) Name() string      { return "Scan" }
func (s *Scan) EstRows() int      { return s.Total }
func (s *Scan) Children() []Node  { return nil }
func (s *Scan) Render(i int) string {
	return strings.Repeat("  ", i) + fmt.Sprintf("Scan(%s, est=%d)", s.Source, s.Total)
}

// IndexLookup uses the inverted index for a field=value pair.
type IndexLookup struct {
	Field    string
	Value    string
	Selectivity float64
	Total    int
}

func (l *IndexLookup) Name() string     { return "IndexLookup" }
func (l *IndexLookup) EstRows() int     { return int(float64(l.Total) * l.Selectivity) }
func (l *IndexLookup) Children() []Node { return nil }
func (l *IndexLookup) Render(i int) string {
	return strings.Repeat("  ", i) + fmt.Sprintf("IndexLookup(%s=%s, sel=%.2f, est=%d)", l.Field, l.Value, l.Selectivity, l.EstRows())
}

// Filter applies a predicate.
type Filter struct {
	Pred  string
	Inner Node
	Sel   float64
}

func (f *Filter) Name() string     { return "Filter" }
func (f *Filter) EstRows() int     { return int(float64(f.Inner.EstRows()) * f.Sel) }
func (f *Filter) Children() []Node { return []Node{f.Inner} }
func (f *Filter) Render(i int) string {
	out := strings.Repeat("  ", i) + fmt.Sprintf("Filter(%q, sel=%.2f, est=%d)\n", f.Pred, f.Sel, f.EstRows())
	out += f.Inner.Render(i + 1)
	return out
}

// Intersect intersects multiple plans by id.
type Intersect struct {
	Inputs []Node
}

func (n *Intersect) Name() string     { return "Intersect" }
func (n *Intersect) Children() []Node { return n.Inputs }
func (n *Intersect) EstRows() int {
	if len(n.Inputs) == 0 {
		return 0
	}
	min := n.Inputs[0].EstRows()
	for _, in := range n.Inputs[1:] {
		if r := in.EstRows(); r < min {
			min = r
		}
	}
	return min
}
func (n *Intersect) Render(i int) string {
	out := strings.Repeat("  ", i) + fmt.Sprintf("Intersect(est=%d)\n", n.EstRows())
	for _, c := range n.Inputs {
		out += c.Render(i + 1)
		out += "\n"
	}
	return strings.TrimRight(out, "\n")
}

// Limit truncates output.
type Limit struct {
	Inner Node
	N     int
}

func (l *Limit) Name() string     { return "Limit" }
func (l *Limit) Children() []Node { return []Node{l.Inner} }
func (l *Limit) EstRows() int {
	if l.Inner.EstRows() < l.N {
		return l.Inner.EstRows()
	}
	return l.N
}
func (l *Limit) Render(i int) string {
	out := strings.Repeat("  ", i) + fmt.Sprintf("Limit(%d)\n", l.N)
	out += l.Inner.Render(i + 1)
	return out
}

// Cost models the relative work of executing a plan.
type Cost struct {
	IO   float64
	CPU  float64
	Rows int
}

// Estimate walks node and assigns a cost.
func Estimate(node Node, params CostParams) Cost {
	if node == nil {
		return Cost{}
	}
	switch n := node.(type) {
	case *Scan:
		return Cost{IO: float64(n.Total) * params.ScanIO, CPU: float64(n.Total) * params.ScanCPU, Rows: n.EstRows()}
	case *IndexLookup:
		rows := n.EstRows()
		return Cost{IO: float64(rows) * params.IndexIO, CPU: float64(rows) * params.IndexCPU, Rows: rows}
	case *Filter:
		inner := Estimate(n.Inner, params)
		return Cost{IO: inner.IO, CPU: inner.CPU + float64(inner.Rows)*params.FilterCPU, Rows: n.EstRows()}
	case *Intersect:
		var total Cost
		for _, c := range n.Inputs {
			cc := Estimate(c, params)
			total.IO += cc.IO
			total.CPU += cc.CPU
		}
		total.Rows = n.EstRows()
		return total
	case *Limit:
		inner := Estimate(n.Inner, params)
		return Cost{IO: inner.IO, CPU: inner.CPU, Rows: n.EstRows()}
	}
	return Cost{}
}

// CostParams configures Estimate.
type CostParams struct {
	ScanIO    float64
	ScanCPU   float64
	IndexIO   float64
	IndexCPU  float64
	FilterCPU float64
}

// DefaultCostParams returns a sensible starting point.
func DefaultCostParams() CostParams {
	return CostParams{
		ScanIO:    1.0,
		ScanCPU:   1.0,
		IndexIO:   0.1,
		IndexCPU:  0.5,
		FilterCPU: 0.5,
	}
}

// Suggest returns a short hint about how to make plan cheaper.
func Suggest(node Node, params CostParams) []string {
	var out []string
	walk(node, func(n Node) {
		if scan, ok := n.(*Scan); ok && scan.Total > 100_000 {
			out = append(out, fmt.Sprintf("scan over %d rows; consider an index", scan.Total))
		}
		if filt, ok := n.(*Filter); ok && filt.Sel > 0.9 {
			out = append(out, fmt.Sprintf("filter %q is non-selective (sel=%.2f)", filt.Pred, filt.Sel))
		}
	})
	sort.Strings(out)
	return out
}

func walk(n Node, fn func(Node)) {
	if n == nil {
		return
	}
	fn(n)
	for _, c := range n.Children() {
		walk(c, fn)
	}
}
