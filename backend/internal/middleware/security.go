package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecureHeaders sets security-related HTTP response headers to harden
// the application against common web vulnerabilities.
func SecureHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "0") // disables legacy XSS filter; rely on CSP instead
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Header("Cross-Origin-Resource-Policy", "same-origin")
		// Content-Security-Policy is intentionally left out here;
		// it should be set by the front-end (Next.js) or a reverse proxy
		// because the API may serve various clients (mobile app, etc.).
		c.Next()
	}
}
