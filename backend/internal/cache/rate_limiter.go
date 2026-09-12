package cache

import (
	"sync"
	"time"
)

// SlidingWindowRateLimiter is a per-key (e.g. IP address) rate limiter
// using a sliding-window counter. This is more accurate than a fixed
// window and smoother than a token bucket for most API use-cases.
type SlidingWindowRateLimiter struct {
	mu       sync.Mutex
	windows  map[string][]int64
	limit    int
	windowMs int64
}

// NewSlidingWindowRateLimiter creates a rate limiter allowing `limit`
// requests per `window` duration per key.
func NewSlidingWindowRateLimiter(limit int, window time.Duration) *SlidingWindowRateLimiter {
	return &SlidingWindowRateLimiter{
		windows:  make(map[string][]int64),
		limit:    limit,
		windowMs: window.Milliseconds(),
	}
}

// Allow reports whether a request for `key` (e.g. IP address) should
// be allowed. It records the attempt and prunes expired entries.
func (rl *SlidingWindowRateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now().UnixMilli()
	cutoff := now - rl.windowMs

	// Prune expired timestamps
	entries := rl.windows[key]
	start := 0
	for start < len(entries) && entries[start] < cutoff {
		start++
	}
	entries = entries[start:]

	if len(entries) >= rl.limit {
		rl.windows[key] = entries
		return false
	}

	entries = append(entries, now)
	rl.windows[key] = entries
	return true
}

// Cleanup periodically prunes stale keys. Call this in a background goroutine:
//
//	go limiter.Cleanup(5 * time.Minute)
func (rl *SlidingWindowRateLimiter) Cleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now().UnixMilli()
		cutoff := now - rl.windowMs*2 // keep keys up to 2 windows old
		for key, entries := range rl.windows {
			if len(entries) == 0 || entries[len(entries)-1] < cutoff {
				delete(rl.windows, key)
			}
		}
		rl.mu.Unlock()
	}
}
