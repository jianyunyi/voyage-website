package cache

import (
	"sync"
)

// ── Singleflight ─────────────────────────────────────────────────────────────

// call represents an in-flight or finished DB operation.
type call struct {
	wg  sync.WaitGroup
	val any
	err error
}

// SingleflightGroup deduplicates concurrent requests for the same key.
// Only one goroutine actually performs the operation; the rest wait for
// its result. This is the primary defence against cache-breakdown:
// when a hot key expires, thousands of requests arrive at once but
// only one hits the database.
type SingleflightGroup struct {
	mu   sync.Mutex
	infl map[string]*call
}

func NewSingleflightGroup() *SingleflightGroup {
	return &SingleflightGroup{infl: make(map[string]*call)}
}

// Do executes fn under key. If another goroutine is already running fn
// with the same key, this goroutine waits and reuses the result.
// Returns (val, err, shared) where shared is true if the result was
// shared with another caller.
func (g *SingleflightGroup) Do(key string, fn func() (any, error)) (any, error, bool) {
	g.mu.Lock()
	if c, ok := g.infl[key]; ok {
		g.mu.Unlock()
		c.wg.Wait()
		return c.val, c.err, true
	}
	c := new(call)
	c.wg.Add(1)
	g.infl[key] = c
	g.mu.Unlock()

	c.val, c.err = fn()
	c.wg.Done()

	g.mu.Lock()
	delete(g.infl, key)
	g.mu.Unlock()

	return c.val, c.err, false
}
