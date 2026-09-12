package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORS returns a Gin middleware that allows requests only from the specified
// origin. Pass the front-end URL (e.g. "https://voyagex.example.com").
// In development, pass "http://localhost:3000".
func CORS(allowedOrigin string) gin.HandlerFunc {
	cfg := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-User-Id", "X-Admin-Key", "X-Request-Id", "Idempotency-Key"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type", "X-Request-Id"},
		AllowCredentials: true,
	}

	if allowedOrigin == "*" || allowedOrigin == "" {
		cfg.AllowAllOrigins = true
		cfg.AllowCredentials = false
	} else {
		cfg.AllowOrigins = []string{allowedOrigin}
	}

	return cors.New(cfg)
}
