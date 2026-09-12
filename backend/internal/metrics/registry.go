package metrics

import (
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// ── Metrics Registry ─────────────────────────────────────────────────────────

// Registry is a thread-safe Prometheus-format metrics collector.
// It supports counters, gauges, and histograms, all output as
// Prometheus exposition format text when Scrape() is called.
type Registry struct {
	mu         sync.RWMutex
	counters   map[string]*counter
	gauges     map[string]*gauge
	histograms map[string]*histogram
}

// NewRegistry creates an empty metrics registry.
func NewRegistry() *Registry {
	return &Registry{
		counters:   make(map[string]*counter),
		gauges:     make(map[string]*gauge),
		histograms: make(map[string]*histogram),
	}
}

// ── Counter ──────────────────────────────────────────────────────────────────

type counter struct {
	name   string
	help   string
	labels map[string]string
	val    atomic.Int64
}

// Counter registers or retrieves a counter metric.
// labels are optional key-value pairs (e.g. "method", "path", "status").
func (r *Registry) Counter(name, help string, labelKeys ...string) *counter {
	r.mu.Lock()
	defer r.mu.Unlock()
	if c, ok := r.counters[name]; ok {
		return c
	}
	c := &counter{name: name, help: help}
	r.counters[name] = c
	return c
}

func (c *counter) Inc(labels ...string) {
	c.val.Add(1)
}

func (c *counter) Value() int64 {
	return c.val.Load()
}

func (c *counter) Export(w *strings.Builder) {
	fmt.Fprintf(w, "# HELP %s %s\n", c.name, c.help)
	fmt.Fprintf(w, "# TYPE %s counter\n", c.name)
	fmt.Fprintf(w, "%s %d\n", c.name, c.Value())
}

// ── Gauge ────────────────────────────────────────────────────────────────────

type gauge struct {
	name  string
	help  string
	val   atomic.Int64
}

func (r *Registry) Gauge(name, help string) *gauge {
	r.mu.Lock()
	defer r.mu.Unlock()
	if g, ok := r.gauges[name]; ok {
		return g
	}
	g := &gauge{name: name, help: help}
	r.gauges[name] = g
	return g
}

func (g *gauge) Set(v int64) { g.val.Store(v) }
func (g *gauge) Add(v int64) { g.val.Add(v) }

func (g *gauge) Export(w *strings.Builder) {
	fmt.Fprintf(w, "# HELP %s %s\n", g.name, g.help)
	fmt.Fprintf(w, "# TYPE %s gauge\n", g.name)
	fmt.Fprintf(w, "%s %d\n", g.name, g.Value())
}

func (g *gauge) Value() int64 { return g.val.Load() }

// ── Histogram ────────────────────────────────────────────────────────────────

type histogram struct {
	name    string
	help    string
	buckets []float64
	counts  []atomic.Int64
	sum     atomic.Int64
}

func (r *Registry) Histogram(name, help string, buckets ...float64) *histogram {
	r.mu.Lock()
	defer r.mu.Unlock()
	if h, ok := r.histograms[name]; ok {
		return h
	}
	if len(buckets) == 0 {
		buckets = []float64{5, 10, 25, 50, 100, 250, 500, 1000, 5000} // ms
	}
	h := &histogram{name: name, help: help, buckets: buckets, counts: make([]atomic.Int64, len(buckets)+1)}
	r.histograms[name] = h
	return h
}

func (h *histogram) Observe(d time.Duration) {
	ms := float64(d.Microseconds()) / 1000
	h.sum.Add(int64(ms * 1000)) // store as microseconds
	for i, b := range h.buckets {
		if ms <= b {
			h.counts[i].Add(1)
			return
		}
	}
	h.counts[len(h.counts)-1].Add(1) // +Inf bucket
}

func (h *histogram) Export(w *strings.Builder) {
	fmt.Fprintf(w, "# HELP %s %s\n", h.name, h.help)
	fmt.Fprintf(w, "# TYPE %s histogram\n", h.name)

	// Cumulative counts
	total := int64(0)
	for i, b := range h.buckets {
		c := h.counts[i].Load()
		total += c
		fmt.Fprintf(w, "%s_bucket{le=\"%g\"} %d\n", h.name, b, total)
	}
	total += h.counts[len(h.counts)-1].Load()
	fmt.Fprintf(w, "%s_bucket{le=\"+Inf\"} %d\n", h.name, total)
	fmt.Fprintf(w, "%s_count %d\n", h.name, total)
	fmt.Fprintf(w, "%s_sum %d\n", h.name, h.sum.Load())
}

// ── Scrape ───────────────────────────────────────────────────────────────────

// Scrape returns all metrics in Prometheus exposition format.
func (r *Registry) Scrape() string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var b strings.Builder
	b.Grow(4096)

	for _, c := range r.counters {
		c.Export(&b)
	}
	for _, g := range r.gauges {
		g.Export(&b)
	}
	for _, h := range r.histograms {
		h.Export(&b)
	}
	return b.String()
}
