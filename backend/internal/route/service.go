package route

import (
	"errors"
	"fmt"
	"math"
)

type Point struct {
	Name string  `json:"name"`
	Lng  float64 `json:"lng"`
	Lat  float64 `json:"lat"`
}

type RouteQuery struct {
	OriginID      string
	DestinationID string
	OriginPoint   *Point
	Destination   *Point
}

type Option struct {
	ID             string   `json:"id"`
	Type           string   `json:"type"`
	Label          string   `json:"label"`
	TimeSec        int      `json:"timeSec"`
	TimeLabel      string   `json:"timeLabel"`
	DistanceMeters int      `json:"distanceMeters"`
	DistanceLabel  string   `json:"distanceLabel"`
	Price          string   `json:"price,omitempty"`
	PriceValue     int      `json:"priceValue,omitempty"`
	Tolls          string   `json:"tolls,omitempty"`
	Score          float64  `json:"score"`
	IsBest         bool     `json:"isBest,omitempty"`
	BestReason     string   `json:"bestReason,omitempty"`
	Legs           []string `json:"legs,omitempty"`
	Source         string   `json:"source"`
}

var cities = map[string]Point{
	"c1": {Name: "北京", Lng: 116.4074, Lat: 39.9042},
	"c2": {Name: "上海", Lng: 121.4737, Lat: 31.2304},
	"c3": {Name: "广州", Lng: 113.2644, Lat: 23.1291},
	"c4": {Name: "成都", Lng: 104.0665, Lat: 30.5728},
	"c5": {Name: "西安", Lng: 108.9398, Lat: 34.3416},
	"c6": {Name: "重庆", Lng: 106.5516, Lat: 29.5630},
	"c7": {Name: "厦门", Lng: 118.0894, Lat: 24.4798},
	"c8": {Name: "泉州", Lng: 118.6004, Lat: 24.9010},
}

func CalculateRoutes(query RouteQuery) ([]Option, error) {
	origin, err := resolvePoint(query.OriginID, query.OriginPoint)
	if err != nil {
		return nil, fmt.Errorf("origin: %w", err)
	}
	destination, err := resolvePoint(query.DestinationID, query.Destination)
	if err != nil {
		return nil, fmt.Errorf("destination: %w", err)
	}
	if query.OriginID != "" && query.OriginID == query.DestinationID && query.OriginPoint == nil && query.Destination == nil {
		return nil, errors.New("origin and destination must differ")
	}

	distance := haversine(origin, destination)
	if distance < 2 {
		return nil, errors.New("origin and destination are too close")
	}
	roadDistance := distance * 1.3
	driving := roadDistance / 90 * 3600
	train := distance / 250 * 3600
	flight := (distance/700 + 2) * 3600
	trainPrice := int(math.Round(distance*0.45/10) * 10)
	flightPrice := int(math.Round(distance*0.8/10) * 10)
	feeder := 2 * 30 * 60

	options := []Option{
		{ID: "driving", Type: "driving", Label: "驾车", TimeSec: int(driving), TimeLabel: formatDuration(driving), DistanceMeters: int(roadDistance * 1000), DistanceLabel: fmt.Sprintf("%.1f公里", roadDistance), Tolls: tollLabel(roadDistance), Source: "estimate"},
		{ID: "train", Type: "train", Label: "高铁", TimeSec: int(train) + feeder, TimeLabel: formatDuration(train + float64(feeder)), DistanceMeters: int(distance * 1000), DistanceLabel: fmt.Sprintf("%.1f公里", distance), Price: fmt.Sprintf("¥%d", trainPrice), PriceValue: trainPrice, Legs: []string{"地铁/公交 30分钟", "高铁 " + formatDuration(train), "地铁/公交 30分钟"}, Source: "estimate"},
		{ID: "flight", Type: "flight", Label: "飞机", TimeSec: int(flight) + feeder, TimeLabel: formatDuration(flight + float64(feeder)), DistanceMeters: int(distance * 1000), DistanceLabel: fmt.Sprintf("%.1f公里", distance), Price: fmt.Sprintf("¥%d", flightPrice), PriceValue: flightPrice, Legs: []string{"机场快线 30分钟", "航班 " + formatDuration(flight-2*3600), "机场快线 30分钟"}, Source: "estimate"},
	}
	flightTrunk := distance > 900
	combinedTime := train
	combinedPrice := trainPrice
	if flightTrunk {
		combinedTime = flight
		combinedPrice = flightPrice
	}
	options = append(options, Option{ID: "combined", Type: "combined", Label: "智能组合", TimeSec: int(combinedTime) + feeder, TimeLabel: formatDuration(combinedTime + float64(feeder)), DistanceMeters: int(distance * 1000), DistanceLabel: fmt.Sprintf("%.1f公里", distance), Price: fmt.Sprintf("¥%d", combinedPrice), PriceValue: combinedPrice, Legs: []string{"地铁 20分钟", "干线交通 " + formatDuration(combinedTime), "地铁/公交 30分钟"}, Source: "estimate"})

	maxTime, maxPrice := 0, 0
	for _, option := range options {
		if option.TimeSec > maxTime {
			maxTime = option.TimeSec
		}
		if option.PriceValue > maxPrice {
			maxPrice = option.PriceValue
		}
	}
	comfort := map[string]float64{"driving": 7, "train": 8.5, "flight": 7.5, "combined": 9}
	best := 0
	for i := range options {
		priceRatio := 0.0
		if maxPrice > 0 {
			priceRatio = float64(options[i].PriceValue) / float64(maxPrice)
		}
		options[i].Score = math.Round((float64(options[i].TimeSec)/float64(maxTime)*0.5+priceRatio*0.3+(10-comfort[options[i].Type])/10*0.2)*100) / 100
		if options[i].Score < options[best].Score || i == 0 {
			best = i
		}
	}
	options[best].IsBest = true
	options[best].BestReason = options[best].Label + "综合评分最优"
	return options, nil
}

func resolvePoint(id string, point *Point) (Point, error) {
	if point != nil {
		return *point, nil
	}
	city, ok := cities[id]
	if !ok {
		return Point{}, errors.New("unknown city")
	}
	return city, nil
}

func ResolvePoint(id string, point *Point) (Point, error) {
	return resolvePoint(id, point)
}

func haversine(a, b Point) float64 {
	const earthRadius = 6371.0
	lat1, lat2 := a.Lat*math.Pi/180, b.Lat*math.Pi/180
	dLat, dLng := (b.Lat-a.Lat)*math.Pi/180, (b.Lng-a.Lng)*math.Pi/180
	h := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(lat1)*math.Cos(lat2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * earthRadius * math.Asin(math.Sqrt(h))
}

func formatDuration(seconds float64) string {
	hours := int(seconds) / 3600
	minutes := int(math.Round(math.Mod(seconds, 3600) / 60))
	if hours > 0 {
		return fmt.Sprintf("%d小时%d分钟", hours, minutes)
	}
	return fmt.Sprintf("%d分钟", minutes)
}

func tollLabel(distance float64) string {
	if distance <= 500 {
		return "免费"
	}
	return fmt.Sprintf("约¥%d", int(math.Round(distance*0.4)))
}
