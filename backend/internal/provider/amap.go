package provider

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"voyagex/backend/internal/route"
)

const defaultAMapDrivingEndpoint = "https://restapi.amap.com/v3/direction/driving"

type AMapDrivingProvider struct {
	Key      string
	Endpoint string
	Client   *http.Client
}

type amapDrivingResponse struct {
	Status string `json:"status"`
	Info   string `json:"info"`
	Route  struct {
		Paths []struct {
			Distance string `json:"distance"`
			Duration string `json:"duration"`
			Tolls    string `json:"tolls"`
		} `json:"paths"`
	} `json:"route"`
}

func (p AMapDrivingProvider) Calculate(ctx context.Context, origin, destination route.Point) (route.Option, error) {
	if p.Key == "" {
		return route.Option{}, errors.New("amap provider key is not configured")
	}
	endpoint := p.Endpoint
	if endpoint == "" {
		endpoint = defaultAMapDrivingEndpoint
	}
	query := url.Values{
		"key":         {p.Key},
		"origin":      {coordinate(origin)},
		"destination": {coordinate(destination)},
		"strategy":    {"0"},
		"extensions":  {"all"},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint+"?"+query.Encode(), nil)
	if err != nil {
		return route.Option{}, fmt.Errorf("create amap request: %w", err)
	}
	client := p.Client
	if client == nil {
		client = &http.Client{Timeout: 4 * time.Second}
	}
	res, err := client.Do(req)
	if err != nil {
		return route.Option{}, fmt.Errorf("amap request: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return route.Option{}, fmt.Errorf("amap returned HTTP %d", res.StatusCode)
	}
	var payload amapDrivingResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return route.Option{}, fmt.Errorf("decode amap response: %w", err)
	}
	if payload.Status != "1" || len(payload.Route.Paths) == 0 {
		return route.Option{}, fmt.Errorf("amap route failed: %s", payload.Info)
	}
	path := payload.Route.Paths[0]
	distance, err := strconv.Atoi(path.Distance)
	if err != nil {
		return route.Option{}, fmt.Errorf("invalid amap distance: %w", err)
	}
	duration, err := strconv.Atoi(path.Duration)
	if err != nil {
		return route.Option{}, fmt.Errorf("invalid amap duration: %w", err)
	}
	tolls := "免费"
	if path.Tolls != "" && path.Tolls != "0" {
		tolls = "约¥" + path.Tolls
	}
	return route.Option{
		ID:             "driving",
		Type:           "driving",
		Label:          "驾车",
		TimeSec:        duration,
		TimeLabel:      formatDuration(duration),
		DistanceMeters: distance,
		DistanceLabel:  fmt.Sprintf("%.1f公里", float64(distance)/1000),
		Tolls:          tolls,
		Source:         "amap",
	}, nil
}

func coordinate(point route.Point) string {
	return strconv.FormatFloat(point.Lng, 'f', 6, 64) + "," + strconv.FormatFloat(point.Lat, 'f', 6, 64)
}

func formatDuration(seconds int) string {
	hours := seconds / 3600
	minutes := (seconds % 3600) / 60
	if hours > 0 {
		return fmt.Sprintf("%d小时%d分钟", hours, minutes)
	}
	return fmt.Sprintf("%d分钟", minutes)
}
