package provider

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"voyagex/backend/internal/route"
)

func TestAMapDrivingProviderNormalizesResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("key") != "test-key" {
			t.Fatalf("expected provider key")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"1","route":{"paths":[{"distance":"1200","duration":"600","tolls":"8","steps":[]}]}}`))
	}))
	defer server.Close()

	provider := AMapDrivingProvider{Key: "test-key", Endpoint: server.URL, Client: server.Client()}
	option, err := provider.Calculate(context.Background(), route.Point{Name: "A", Lng: 116.1, Lat: 39.1}, route.Point{Name: "B", Lng: 116.2, Lat: 39.2})
	if err != nil {
		t.Fatalf("Calculate returned error: %v", err)
	}
	if option.Source != "amap" || option.TimeSec != 600 || option.DistanceMeters != 1200 {
		t.Fatalf("unexpected normalized option: %+v", option)
	}
}

func TestAMapDrivingProviderRejectsProviderError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"status":"0","info":"INVALID_USER_KEY"}`))
	}))
	defer server.Close()

	provider := AMapDrivingProvider{Key: "bad-key", Endpoint: server.URL, Client: server.Client()}
	if _, err := provider.Calculate(context.Background(), route.Point{}, route.Point{}); err == nil {
		t.Fatal("expected provider error")
	}
}
