package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"voyagex-backend/internal/cache"
)

// RateLimit returns a Gin middleware that rate-limits per client IP
// using a sliding-window counter.
func RateLimit(limiter *cache.SlidingWindowRateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()
		if !limiter.Allow(key) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"code":    "RATE_LIMITED",
				"message": "Too many requests. Please try again later.",
			})
			return
		}
		c.Next()
	}
}
