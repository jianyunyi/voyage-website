package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"voyagex/backend/internal/provider"
	"voyagex/backend/internal/route"
)

type errorBody struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", health)
	mux.HandleFunc("/api/v1/route", handleRoute)
	mux.HandleFunc("/api/route", handleRoute)

	address := ":" + getenv("PORT", "8080")
	log.Printf("voyagex backend listening on %s", address)
	if err := http.ListenAndServe(address, withHeaders(mux)); err != nil {
		log.Fatal(err)
	}
}

func health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "voyagex-backend"})
}

func handleRoute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "只支持 GET")
		return
	}
	options, err := route.CalculateRoutes(route.RouteQuery{
		OriginID:      r.URL.Query().Get("originId"),
		DestinationID: r.URL.Query().Get("destId"),
		OriginPoint:   parsePoint(r.URL.Query().Get("originLngLat"), r.URL.Query().Get("originName")),
		Destination:   parsePoint(r.URL.Query().Get("destLngLat"), r.URL.Query().Get("destName")),
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ROUTE", err.Error())
		return
	}
	dataSource, isLive := "estimate", false
	if key := os.Getenv("AMAP_WEB_SERVICE_KEY"); key != "" {
		origin, originErr := route.ResolvePoint(r.URL.Query().Get("originId"), parsePoint(r.URL.Query().Get("originLngLat"), r.URL.Query().Get("originName")))
		destination, destinationErr := route.ResolvePoint(r.URL.Query().Get("destId"), parsePoint(r.URL.Query().Get("destLngLat"), r.URL.Query().Get("destName")))
		if originErr == nil && destinationErr == nil {
			live, providerErr := (provider.AMapDrivingProvider{Key: key, Endpoint: os.Getenv("AMAP_WEB_SERVICE_ENDPOINT")}).Calculate(context.Background(), origin, destination)
			if providerErr == nil {
				for i := range options {
					if options[i].Type == "driving" {
						options[i] = live
					}
				}
				dataSource, isLive = "mixed", true
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"routes": options, "count": len(options), "dataSource": dataSource, "isLive": isLive})
}

func parsePoint(value, name string) *route.Point {
	parts := strings.Split(value, ",")
	if len(parts) != 2 {
		return nil
	}
	lng, lngErr := strconv.ParseFloat(parts[0], 64)
	lat, latErr := strconv.ParseFloat(parts[1], 64)
	if lngErr != nil || latErr != nil {
		return nil
	}
	return &route.Point{Name: name, Lng: lng, Lat: lat}
}

func withHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Backend-Server", "voyagex-go")
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	var body errorBody
	body.Error.Code = code
	body.Error.Message = message
	writeJSON(w, status, body)
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
