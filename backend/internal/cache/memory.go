package cache

import (
	"sync"
	"time"
)

// ── Entry ────────────────────────────────────────────────────────────────────

type entry struct {
	data      any
	expiresAt int64 // unix nano
}

func (e *entry) expired(now int64) bool {
	return e.expiresAt > 0 && now >= e.expiresAt
}

// ── MemoryCache ──────────────────────────────────────────────────────────────

// MemoryCache is a goroutine-safe in-memory cache with TTL support.
// It also supports null-value caching (for cache-penetration prevention)
// and random TTL jitter (for cache-avalanche prevention).
type MemoryCache struct {
	mu       sync.RWMutex
	store    map[string]*entry
	defaultTTL time.Duration
	jitter   time.Duration // random extra TTL, e.g. 10% of TTL
}

// NewMemoryCache creates a cache. If jitter > 0, every Set adds a random
// offset in [0, jitter) to spread expiry times.
func NewMemoryCache(defaultTTL time.Duration, jitter time.Duration) *MemoryCache {
	return &MemoryCache{
		store:      make(map[string]*entry),
		defaultTTL: defaultTTL,
		jitter:     jitter,
	}
}

// Get returns nil + false on miss or expired entry.
// It lazily deletes expired entries on read.
func (c *MemoryCache) Get(key string) (any, bool) {
	c.mu.RLock()
	e, ok := c.store[key]
	c.mu.RUnlock()
	if !ok {
		return nil, false
	}
	now := time.Now().UnixNano()
	if e.expired(now) {
		c.mu.Lock()
		delete(c.store, key)
		c.mu.Unlock()
		return nil, false
	}
	return e.data, true
}

// Set stores a value with the default TTL.
func (c *MemoryCache) Set(key string, data any) {
	c.SetWithTTL(key, data, c.defaultTTL)
}

// SetWithTTL stores a value with a specific TTL.
// A zero or negative TTL means "never expires" (TTL = 0).
func (c *MemoryCache) SetWithTTL(key string, data any, ttl time.Duration) {
	var expiresAt int64
	if ttl > 0 {
		j := time.Duration(0)
		if c.jitter > 0 {
			j = time.Duration(randN(int64(c.jitter)))
		}
		expiresAt = time.Now().Add(ttl + j).UnixNano()
	}
	c.mu.Lock()
	c.store[key] = &entry{data: data, expiresAt: expiresAt}
	c.mu.Unlock()
}

// Delete removes a key from the cache.
func (c *MemoryCache) Delete(key string) {
	c.mu.Lock()
	delete(c.store, key)
	c.mu.Unlock()
}

// Clear empties the cache.
func (c *MemoryCache) Clear() {
	c.mu.Lock()
	c.store = make(map[string]*entry)
	c.mu.Unlock()
}

// Len returns the number of entries.
func (c *MemoryCache) Len() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.store)
}

// ── Null-value marker ────────────────────────────────────────────────────────

// nullMarker is a sentinel stored in the cache to represent "not found".
// This prevents cache-penetration: repeated requests for a non-existent
// key will hit the cache instead of the database.
type nullMarker struct{}

var nullSentinel = &nullMarker{}

// IsNull reports whether v is the cache-penetration sentinel.
func IsNull(v any) bool {
	_, ok := v.(*nullMarker)
	return ok
}

// SetNull caches a "not found" marker with a short TTL (typically 5-30s).
func (c *MemoryCache) SetNull(key string, ttl time.Duration) {
	c.SetWithTTL(key, nullSentinel, ttl)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func randN(max int64) int64 {
	// Simple fast pseudo-random; not crypto-safe but fine for jitter.
	// In production you might use math/rand with a sync.Pool source.
	return time.Now().UnixNano() % max
}
