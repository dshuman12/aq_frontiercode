package metrics

import (
	"math"
	"sort"
	"sync"
	"sync/atomic"
)

// Counter is a monotonically increasing counter.
type Counter struct {
	value atomic.Int64
	name  string
}

func NewCounter(name string) *Counter { return &Counter{name: name} }
func (c *Counter) Inc()               { c.value.Add(1) }
func (c *Counter) Add(n int64)        { c.value.Add(n) }
func (c *Counter) Value() int64       { return c.value.Load() }
func (c *Counter) Name() string       { return c.name }
func (c *Counter) Reset()             { c.value.Store(0) }

// Gauge is a value that can go up and down.
type Gauge struct {
	mu    sync.Mutex
	value float64
	name  string
}

func NewGauge(name string) *Gauge { return &Gauge{name: name} }
func (g *Gauge) Set(v float64)    { g.mu.Lock(); g.value = v; g.mu.Unlock() }
func (g *Gauge) Inc()             { g.mu.Lock(); g.value++; g.mu.Unlock() }
func (g *Gauge) Dec()             { g.mu.Lock(); g.value--; g.mu.Unlock() }
func (g *Gauge) Add(v float64)    { g.mu.Lock(); g.value += v; g.mu.Unlock() }
func (g *Gauge) Value() float64   { g.mu.Lock(); defer g.mu.Unlock(); return g.value }
func (g *Gauge) Name() string     { return g.name }

// Histogram collects observations into buckets.
type Histogram struct {
	mu      sync.Mutex
	name    string
	buckets []float64
	counts  []uint64
	sum     float64
	count   uint64
	min     float64
	max     float64
}

func NewHistogram(name string, buckets []float64) *Histogram {
	sort.Float64s(buckets)
	return &Histogram{name: name, buckets: buckets, counts: make([]uint64, len(buckets)+1), min: math.MaxFloat64, max: -math.MaxFloat64}
}

func (h *Histogram) Observe(v float64) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.sum += v
	h.count++
	if v < h.min {
		h.min = v
	}
	if v > h.max {
		h.max = v
	}
	idx := sort.SearchFloat64s(h.buckets, v)
	h.counts[idx]++
}

func (h *Histogram) Count() uint64 { h.mu.Lock(); defer h.mu.Unlock(); return h.count }
func (h *Histogram) Sum() float64  { h.mu.Lock(); defer h.mu.Unlock(); return h.sum }
func (h *Histogram) Min() float64  { h.mu.Lock(); defer h.mu.Unlock(); return h.min }
func (h *Histogram) Max() float64  { h.mu.Lock(); defer h.mu.Unlock(); return h.max }
func (h *Histogram) Name() string  { return h.name }
func (h *Histogram) Mean() float64 {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.count == 0 {
		return 0
	}
	return h.sum / float64(h.count)
}

// Snapshot returns bucket boundaries and their counts.
func (h *Histogram) Snapshot() ([]float64, []uint64) {
	h.mu.Lock()
	defer h.mu.Unlock()
	b := make([]float64, len(h.buckets))
	c := make([]uint64, len(h.counts))
	copy(b, h.buckets)
	copy(c, h.counts)
	return b, c
}

// Registry collects named metrics.
type Registry struct {
	mu         sync.RWMutex
	counters   map[string]*Counter
	gauges     map[string]*Gauge
	histograms map[string]*Histogram
}

func NewRegistry() *Registry {
	return &Registry{counters: make(map[string]*Counter), gauges: make(map[string]*Gauge), histograms: make(map[string]*Histogram)}
}

func (r *Registry) Counter(name string) *Counter {
	r.mu.Lock()
	defer r.mu.Unlock()
	if c, ok := r.counters[name]; ok {
		return c
	}
	c := NewCounter(name)
	r.counters[name] = c
	return c
}

func (r *Registry) Gauge(name string) *Gauge {
	r.mu.Lock()
	defer r.mu.Unlock()
	if g, ok := r.gauges[name]; ok {
		return g
	}
	g := NewGauge(name)
	r.gauges[name] = g
	return g
}

func (r *Registry) Histogram(name string, buckets []float64) *Histogram {
	r.mu.Lock()
	defer r.mu.Unlock()
	if h, ok := r.histograms[name]; ok {
		return h
	}
	h := NewHistogram(name, buckets)
	r.histograms[name] = h
	return h
}

// Snapshot exports all metrics as a flat map.
func (r *Registry) Snapshot() map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()
	snap := make(map[string]interface{})
	for n, c := range r.counters {
		snap["counter."+n] = c.Value()
	}
	for n, g := range r.gauges {
		snap["gauge."+n] = g.Value()
	}
	for n, h := range r.histograms {
		snap["histogram."+n+".count"] = h.Count()
		snap["histogram."+n+".mean"] = h.Mean()
	}
	return snap
}

// CounterNames returns sorted counter names.
func (r *Registry) CounterNames() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	names := make([]string, 0, len(r.counters))
	for n := range r.counters {
		names = append(names, n)
	}
	sort.Strings(names)
	return names
}
