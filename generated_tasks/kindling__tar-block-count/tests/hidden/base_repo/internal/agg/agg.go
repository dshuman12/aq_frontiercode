// Package agg builds tabular aggregations from a stream of records.
//
// The aggregator supports group-by over a fixed set of label keys with
// any combination of count, sum, min, max, mean, and a fixed-quantile
// estimator. Output rows are emitted in deterministic order.
package agg

import (
	"errors"
	"math"
	"sort"
	"strings"
)

// Op is one aggregation operation.
type Op string

const (
	OpCount Op = "count"
	OpSum   Op = "sum"
	OpMin   Op = "min"
	OpMax   Op = "max"
	OpMean  Op = "mean"
)

// Spec describes the aggregation.
type Spec struct {
	GroupBy []string
	Field   string // numeric field to aggregate (ignored for count)
	Op      Op
}

// Row is one output row.
type Row struct {
	Key   map[string]string
	Value float64
	Count int
}

type bucket struct {
	count int
	sum   float64
	min   float64
	max   float64
}

// Aggregator builds rows for a Spec.
type Aggregator struct {
	spec    Spec
	buckets map[string]*bucket
	keys    map[string]map[string]string
}

// New constructs an Aggregator.
func New(spec Spec) (*Aggregator, error) {
	switch spec.Op {
	case OpCount, OpSum, OpMin, OpMax, OpMean:
	default:
		return nil, errors.New("agg: unsupported op " + string(spec.Op))
	}
	if spec.Op != OpCount && spec.Field == "" {
		return nil, errors.New("agg: field required")
	}
	return &Aggregator{
		spec:    spec,
		buckets: map[string]*bucket{},
		keys:    map[string]map[string]string{},
	}, nil
}

// Observe records labels and the optional numeric value.
func (a *Aggregator) Observe(labels map[string]string, value float64) {
	key := a.makeKey(labels)
	b, ok := a.buckets[key]
	if !ok {
		b = &bucket{min: math.Inf(1), max: math.Inf(-1)}
		a.buckets[key] = b
		klabels := map[string]string{}
		for _, k := range a.spec.GroupBy {
			klabels[k] = labels[k]
		}
		a.keys[key] = klabels
	}
	b.count++
	b.sum += value
	if value < b.min {
		b.min = value
	}
	if value > b.max {
		b.max = value
	}
}

func (a *Aggregator) makeKey(labels map[string]string) string {
	var b strings.Builder
	for i, k := range a.spec.GroupBy {
		if i > 0 {
			b.WriteByte('\x00')
		}
		b.WriteString(labels[k])
	}
	return b.String()
}

// Rows returns aggregated rows in stable order.
func (a *Aggregator) Rows() []Row {
	keys := make([]string, 0, len(a.buckets))
	for k := range a.buckets {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make([]Row, 0, len(keys))
	for _, k := range keys {
		b := a.buckets[k]
		row := Row{Key: a.keys[k], Count: b.count}
		switch a.spec.Op {
		case OpCount:
			row.Value = float64(b.count)
		case OpSum:
			row.Value = b.sum
		case OpMin:
			row.Value = b.min
		case OpMax:
			row.Value = b.max
		case OpMean:
			if b.count > 0 {
				row.Value = b.sum / float64(b.count)
			}
		}
		out = append(out, row)
	}
	return out
}

// Reset drops all observations.
func (a *Aggregator) Reset() {
	a.buckets = map[string]*bucket{}
	a.keys = map[string]map[string]string{}
}
