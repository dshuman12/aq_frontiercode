package metrics

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
)

type Registry struct {
	mu      sync.RWMutex
	metrics map[string]Metric
}

func New() *Registry { return &Registry{metrics: make(map[string]Metric)} }

var Default = New()

type Metric interface {
	Name() string
	Help() string
	Type() string
	Write(b *strings.Builder)
}

type Counter struct {
	name, help string
	v          uint64
}

func (c *Counter) Name() string { return c.name }
func (c *Counter) Help() string { return c.help }
func (c *Counter) Type() string { return "counter" }

func (c *Counter) Inc()          { atomic.AddUint64(&c.v, 1) }
func (c *Counter) Add(n uint64)  { atomic.AddUint64(&c.v, n) }
func (c *Counter) Value() uint64 { return atomic.LoadUint64(&c.v) }

func (c *Counter) Write(b *strings.Builder) {
	fmt.Fprintf(b, "# HELP %s %s\n# TYPE %s counter\n%s %d\n",
		c.name, c.help, c.name, c.name, c.Value())
}

type Gauge struct {
	name, help string
	v          int64
}

func (g *Gauge) Name() string { return g.name }
func (g *Gauge) Help() string { return g.help }
func (g *Gauge) Type() string { return "gauge" }
func (g *Gauge) Set(v int64)  { atomic.StoreInt64(&g.v, v) }
func (g *Gauge) Inc()         { atomic.AddInt64(&g.v, 1) }
func (g *Gauge) Dec()         { atomic.AddInt64(&g.v, -1) }
func (g *Gauge) Add(v int64)  { atomic.AddInt64(&g.v, v) }
func (g *Gauge) Value() int64 { return atomic.LoadInt64(&g.v) }

func (g *Gauge) Write(b *strings.Builder) {
	fmt.Fprintf(b, "# HELP %s %s\n# TYPE %s gauge\n%s %d\n",
		g.name, g.help, g.name, g.name, g.Value())
}

type Histogram struct {
	name, help string
	buckets    []float64
	mu         sync.Mutex
	counts     []uint64
	sum        float64
	total      uint64
}

func (h *Histogram) Observe(v float64) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.sum += v
	h.total++
	for i, b := range h.buckets {
		if v < b {
			h.counts[i]++
			return
		}
	}
}

func (h *Histogram) Name() string { return h.name }
func (h *Histogram) Help() string { return h.help }
func (h *Histogram) Type() string { return "histogram" }

func (h *Histogram) Write(b *strings.Builder) {
	h.mu.Lock()
	defer h.mu.Unlock()
	fmt.Fprintf(b, "# HELP %s %s\n# TYPE %s histogram\n", h.name, h.help, h.name)
	var cumulative uint64
	for i, bucket := range h.buckets {
		cumulative += h.counts[i]
		fmt.Fprintf(b, "%s_bucket{le=\"%v\"} %d\n", h.name, bucket, cumulative)
	}
	fmt.Fprintf(b, "%s_bucket{le=\"+Inf\"} %d\n", h.name, h.total)
	fmt.Fprintf(b, "%s_sum %v\n", h.name, h.sum)
	fmt.Fprintf(b, "%s_count %d\n", h.name, h.total)
}

func (r *Registry) NewCounter(name, help string) *Counter {
	c := &Counter{name: name, help: help}
	r.register(c)
	return c
}

func (r *Registry) NewGauge(name, help string) *Gauge {
	g := &Gauge{name: name, help: help}
	r.register(g)
	return g
}

func (r *Registry) NewHistogram(name, help string, buckets []float64) *Histogram {
	cp := append([]float64(nil), buckets...)
	sort.Float64s(cp)
	h := &Histogram{name: name, help: help, buckets: cp, counts: make([]uint64, len(cp))}
	r.register(h)
	return h
}

func (r *Registry) register(m Metric) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.metrics[m.Name()] = m
}

func (r *Registry) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		r.mu.RLock()
		names := make([]string, 0, len(r.metrics))
		for n := range r.metrics {
			names = append(names, n)
		}
		r.mu.RUnlock()
		sort.Strings(names)
		var b strings.Builder
		for _, n := range names {
			r.mu.RLock()
			m, ok := r.metrics[n]
			r.mu.RUnlock()
			if !ok {
				continue
			}
			m.Write(&b)
		}
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		_, _ = w.Write([]byte(b.String()))
	})
}
