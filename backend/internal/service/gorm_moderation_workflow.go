package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"gorm.io/gorm"

	"voyagex-backend/internal/model"
	"voyagex-backend/internal/repository"
	"voyagex-backend/internal/security"
)

var ErrModerationConflict = errors.New("moderation decision is not allowed for current status")

type GormTransactionRunner interface {
	Transaction(context.Context, func(*gorm.DB) error) error
}

type GormModerationSubmissionStore interface {
	FindByIDForUpdate(context.Context, *gorm.DB, uint) (*model.GormSubmission, error)
	Update(context.Context, *gorm.DB, *model.GormSubmission) error
}

type GormModerationLogStore interface {
	Create(context.Context, *gorm.DB, *model.GormModerationLog) error
}

type GormModerationResult struct {
	Submission       model.GormSubmissionView `json:"submission"`
	PublishedGuideID string                   `json:"publishedGuideId,omitempty"`
}

type GormModerationWorkflow struct {
	transactions GormTransactionRunner
	guides       GormGuideStore
	submissions  GormModerationSubmissionStore
	logs         GormModerationLogStore
}

func NewGormModerationWorkflow(transactions GormTransactionRunner, guides GormGuideStore, submissions GormModerationSubmissionStore, logs GormModerationLogStore) *GormModerationWorkflow {
	return &GormModerationWorkflow{
		transactions: transactions,
		guides:       guides,
		submissions:  submissions,
		logs:         logs,
	}
}

func NewGormTransactionRunner(db *gorm.DB) GormTransactionRunner {
	return gormTransactionRunner{db: db}
}

func (s *GormModerationWorkflow) Decide(ctx context.Context, rawID, submissionType string, decision security.ModerationAdminDecision, reason, adminID, ip string) (GormModerationResult, error) {
	id, err := repository.ParsePositiveID(rawID)
	if err != nil {
		return GormModerationResult{}, err
	}

	var result GormModerationResult
	err = s.transactions.Transaction(ctx, func(tx *gorm.DB) error {
		submission, err := s.submissions.FindByIDForUpdate(ctx, tx, id)
		if err != nil {
			return err
		}
		if submission.Type != submissionType {
			return repository.ErrSubmissionNotFound
		}
		fromStatus := submission.Status

		resolved := security.ResolveSubmissionReviewAction(security.ModeratedContentStatus(submission.Status), decision)
		if resolved == nil || (resolved.Action != "publish" && resolved.Action != "update") {
			return ErrModerationConflict
		}

		now := time.Now()
		var publishedGuideID string
		if resolved.Action == "publish" {
			if submission.Type != string(model.SubmissionTypeGuide) {
				return ErrModerationConflict
			}
			payload, err := model.DecodeGormGuidePayload(submission.PayloadJSON)
			if err != nil {
				return err
			}
			guide, err := newPublishedGormGuide(payload, submission, now)
			if err != nil {
				return err
			}
			if err := s.guides.Create(ctx, tx, &guide); err != nil {
				return fmt.Errorf("create published guide: %w", err)
			}
			submission.Status = string(model.SubmissionPublished)
			submission.PublishedItemID = &guide.ID
			submission.PublishedItemModel = "Guide"
			publishedGuideID = strconv.FormatUint(uint64(guide.ID), 10)
		} else {
			submission.Status = string(resolved.NextStatus)
		}

		submission.ReviewedBy = stringPointer(adminID)
		submission.ReviewedAt = &now
		submission.ModerationReason = reason
		submission.UpdatedAt = now
		if err := s.submissions.Update(ctx, tx, submission); err != nil {
			return fmt.Errorf("update reviewed submission: %w", err)
		}

		log := model.GormModerationLog{
			SubmissionID: &submission.ID,
			ItemID:       submission.PublishedItemID,
			ItemModel:    submission.PublishedItemModel,
			AdminID:      stringPointer(adminID),
			Action:       string(decision),
			Reason:       reason,
			FromStatus:   fromStatus,
			ToStatus:     submission.Status,
			IP:           ip,
			CreatedAt:    now,
		}
		if err := s.logs.Create(ctx, tx, &log); err != nil {
			return fmt.Errorf("create moderation log: %w", err)
		}

		view, err := model.GormSubmissionToView(*submission)
		if err != nil {
			return err
		}
		result = GormModerationResult{Submission: view, PublishedGuideID: publishedGuideID}
		return nil
	})
	if err != nil {
		return GormModerationResult{}, err
	}
	return result, nil
}

func newPublishedGormGuide(payload model.GuideSubmissionPayload, submission *model.GormSubmission, now time.Time) (model.GormGuide, error) {
	tagsJSON, err := json.Marshal(payload.Tags)
	if err != nil {
		return model.GormGuide{}, fmt.Errorf("encode guide tags: %w", err)
	}
	riskLabelsJSON := submission.RiskLabelsJSON
	if riskLabelsJSON == "" {
		riskLabelsJSON = "[]"
	}
	return model.GormGuide{
		Title:          payload.Title,
		Author:         submission.Author,
		AuthorID:       submission.AuthorID,
		Destination:    payload.Destination,
		Days:           payload.Days,
		Budget:         payload.Budget,
		Image:          payload.Image,
		TagsJSON:       string(tagsJSON),
		Content:        payload.Content,
		Status:         string(model.GuidePublished),
		Source:         string(model.GuideSourceUser),
		RiskScore:      submission.RiskScore,
		RiskLabelsJSON: riskLabelsJSON,
		CreatedAt:      now,
		UpdatedAt:      now,
	}, nil
}

type gormTransactionRunner struct {
	db *gorm.DB
}

func (r gormTransactionRunner) Transaction(ctx context.Context, callback func(*gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(callback)
}
