package model

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"
)

type GormSubmissionView struct {
	ID                 string    `json:"id"`
	Type               string    `json:"type"`
	Author             string    `json:"author"`
	Status             string    `json:"status"`
	RiskScore          float64   `json:"riskScore"`
	RiskLabels         []string  `json:"riskLabels"`
	ModerationReason   string    `json:"moderationReason,omitempty"`
	PublishedItemID    string    `json:"publishedItemId,omitempty"`
	PublishedItemModel string    `json:"publishedItemModel,omitempty"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

func GormGuideToPublic(guide GormGuide) (PublicGuide, error) {
	tags, err := decodeStringSlice(guide.TagsJSON)
	if err != nil {
		return PublicGuide{}, fmt.Errorf("decode guide tags: %w", err)
	}
	riskLabels, err := decodeStringSlice(guide.RiskLabelsJSON)
	if err != nil {
		return PublicGuide{}, fmt.Errorf("decode guide risk labels: %w", err)
	}

	return PublicGuide{
		ID:          strconv.FormatUint(uint64(guide.ID), 10),
		Title:       guide.Title,
		Author:      guide.Author,
		Destination: guide.Destination,
		Days:        guide.Days,
		Budget:      guide.Budget,
		Likes:       guide.Likes,
		Image:       guide.Image,
		Tags:        tags,
		Content:     guide.Content,
		Status:      GuideStatus(guide.Status),
		Source:      GuideSource(guide.Source),
		RiskScore:   guide.RiskScore,
		RiskLabels:  riskLabels,
	}, nil
}

func GormSubmissionToView(submission GormSubmission) (GormSubmissionView, error) {
	riskLabels, err := decodeStringSlice(submission.RiskLabelsJSON)
	if err != nil {
		return GormSubmissionView{}, fmt.Errorf("decode submission risk labels: %w", err)
	}

	view := GormSubmissionView{
		ID:                 strconv.FormatUint(uint64(submission.ID), 10),
		Type:               submission.Type,
		Author:             submission.Author,
		Status:             submission.Status,
		RiskScore:          submission.RiskScore,
		RiskLabels:         riskLabels,
		ModerationReason:   submission.ModerationReason,
		PublishedItemModel: submission.PublishedItemModel,
		CreatedAt:          submission.CreatedAt,
		UpdatedAt:          submission.UpdatedAt,
	}
	if submission.PublishedItemID != nil {
		view.PublishedItemID = strconv.FormatUint(uint64(*submission.PublishedItemID), 10)
	}
	return view, nil
}

func DecodeGormGuidePayload(payloadJSON string) (GuideSubmissionPayload, error) {
	var payload GuideSubmissionPayload
	if err := json.Unmarshal([]byte(payloadJSON), &payload); err != nil {
		return GuideSubmissionPayload{}, fmt.Errorf("decode guide payload: %w", err)
	}
	return payload, nil
}

func decodeStringSlice(raw string) ([]string, error) {
	if raw == "" {
		return nil, nil
	}
	var values []string
	if err := json.Unmarshal([]byte(raw), &values); err != nil {
		return nil, err
	}
	return values, nil
}
