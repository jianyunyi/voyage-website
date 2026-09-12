package route

import (
	"testing"
	"time"
)

func TestCalculateRoutesReturnsBestRoute(t *testing.T) {
	started := time.Now()
	routes, err := CalculateRoutes(RouteQuery{OriginID: "c1", DestinationID: "c4"})
	if err != nil {
		t.Fatalf("CalculateRoutes returned error: %v", err)
	}
	if len(routes) != 4 {
		t.Fatalf("expected 4 routes, got %d", len(routes))
	}
	if time.Since(started) > 100*time.Millisecond {
		t.Fatalf("route calculation should be synchronous and fast")
	}

	bestCount := 0
	for _, option := range routes {
		if option.IsBest {
			bestCount++
		}
	}
	if bestCount != 1 {
		t.Fatalf("expected exactly one best route, got %d", bestCount)
	}
}

func TestCalculateRoutesRejectsUnknownCity(t *testing.T) {
	_, err := CalculateRoutes(RouteQuery{OriginID: "c1", DestinationID: "unknown"})
	if err == nil {
		t.Fatal("expected unknown destination to be rejected")
	}
}
