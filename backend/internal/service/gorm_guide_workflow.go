package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"

	"voyagex-backend/internal/model"
	"voyagex-backend/internal/security"
)

type GormGuideStore interface {
	ListPublished(context.Context) ([]model.GormGuide, error)
	Create(context.Context, *gorm.DB, *model.GormGuide) error
}

type GormSubmissionStore interface {
	Create(context.Context, *gorm.DB, *model.GormSubmission) error
	ListByAuthor(context.Context, string) ([]model.GormSubmission, error)
	ListReviewQueue(context.Context, string, string) ([]model.GormSubmission, error)
}

type GormGuideWorkflow struct {
	guides      GormGuideStore
	submissions GormSubmissionStore
}

func NewGormGuideWorkflow(guides GormGuideStore, submissions GormSubmissionStore) *GormGuideWorkflow {
	return &GormGuideWorkflow{guides: guides, submissions: submissions}
}

func (s *GormGuideWorkflow) SubmitGuide(ctx context.Context, payload model.GuideSubmissionPayload, author, authorID string) (model.GormSubmissionView, error) {
	moderation := security.ModerateSubmission(security.ModerationInput{
		Title:    payload.Title,
		Body:     payload.Content,
		ImageURL: payload.Image,
	})
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return model.GormSubmissionView{}, fmt.Errorf("encode guide payload: %w", err)
	}
	riskLabelsJSON, err := json.Marshal(moderation.RiskLabels)
	if err != nil {
		return model.GormSubmissionView{}, fmt.Errorf("encode risk labels: %w", err)
	}

	now := time.Now()
	submission := model.GormSubmission{
		Type:             string(model.SubmissionTypeGuide),
		Author:           author,
		AuthorID:         stringPointer(authorID),
		PayloadJSON:      string(payloadJSON),
		Status:           string(moderation.Status),
		RiskScore:        moderation.RiskScore,
		RiskLabelsJSON:   string(riskLabelsJSON),
		ModerationReason: joinLabels(moderation.RiskLabels, "submitted_for_review"),
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if err := s.submissions.Create(ctx, nil, &submission); err != nil {
		return model.GormSubmissionView{}, fmt.Errorf("create guide submission: %w", err)
	}
	return model.GormSubmissionToView(submission)
}

func (s *GormGuideWorkflow) ListPublished(ctx context.Context) ([]model.PublicGuide, error) {
	rows, err := s.guides.ListPublished(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]model.PublicGuide, 0, len(rows))
	for _, row := range rows {
		guide, err := model.GormGuideToPublic(row)
		if err != nil {
			return nil, err
		}
		result = append(result, guide)
	}
	return result, nil
}

func (s *GormGuideWorkflow) GetUserSubmissions(ctx context.Context, authorID string) ([]model.GormSubmissionView, error) {
	rows, err := s.submissions.ListByAuthor(ctx, authorID)
	if err != nil {
		return nil, err
	}
	result := make([]model.GormSubmissionView, 0, len(rows))
	for _, row := range rows {
		view, err := model.GormSubmissionToView(row)
		if err != nil {
			return nil, err
		}
		result = append(result, view)
	}
	return result, nil
}

func (s *GormGuideWorkflow) ListReviewQueue(ctx context.Context, status, submissionType string) ([]model.GormSubmissionView, error) {
	rows, err := s.submissions.ListReviewQueue(ctx, status, submissionType)
	if err != nil {
		return nil, err
	}
	result := make([]model.GormSubmissionView, 0, len(rows))
	for _, row := range rows {
		view, err := model.GormSubmissionToView(row)
		if err != nil {
			return nil, err
		}
		result = append(result, view)
	}
	return result, nil
}

func stringPointer(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
