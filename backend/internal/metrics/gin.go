package metrics

import (
	"time"

	"github.com/gin-gonic/gin"
)

// GinMiddleware records HTTP request count and duration metrics.
// Usage:
//
//	reg := metrics.NewRegistry()
//	r.Use(metrics.GinMiddleware(reg))
//	r.GET("/api/metrics", func(c *gin.Context) {
//	    c.String(200, reg.Scrape())
//	})
func GinMiddleware(reg *Registry) gin.HandlerFunc {
	reqCount := reg.Counter("voyagex_http_requests_total", "Total HTTP requests")
	reqDuration := reg.Histogram("voyagex_http_request_duration_ms", "Request duration in ms")

	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		latency := time.Since(start)
		reqCount.Inc()
		reqDuration.Observe(latency)
	}
}

// NewGaugeMetrics registers gauge-type metrics that can be periodically updated.
// Returns useful gauges for background reporting.
func RegisterGauges(reg *Registry) *CacheGauges {
	return &CacheGauges{
		CacheSize:     reg.Gauge("voyagex_cache_entries", "Current number of cache entries"),
		DbConnections: reg.Gauge("voyagex_db_connections", "Current MongoDB connection count"),
	}
}

type CacheGauges struct {
	CacheSize     *gauge
	DbConnections *gauge
}
