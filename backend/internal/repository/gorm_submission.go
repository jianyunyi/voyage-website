package repository

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"voyagex-backend/internal/model"
)

var (
	ErrInvalidID          = errors.New("invalid numeric id")
	ErrSubmissionNotFound = errors.New("submission not found")
)

type GormSubmissionRepository struct {
	db *gorm.DB
}

func NewGormSubmissionRepository(db *gorm.DB) *GormSubmissionRepository {
	return &GormSubmissionRepository{db: db}
}

func ParsePositiveID(raw string) (uint, error) {
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || id == 0 {
		return 0, ErrInvalidID
	}
	return uint(id), nil
}

func (r *GormSubmissionRepository) Create(ctx context.Context, db *gorm.DB, submission *model.GormSubmission) error {
	return r.withDB(db).WithContext(ctx).Create(submission).Error
}

func (r *GormSubmissionRepository) ListByAuthor(ctx context.Context, authorID string) ([]model.GormSubmission, error) {
	var submissions []model.GormSubmission
	err := r.db.WithContext(ctx).
		Where("author_id = ?", authorID).
		Order("created_at DESC").
		Find(&submissions).Error
	if err != nil {
		return nil, fmt.Errorf("list user submissions: %w", err)
	}
	return submissions, nil
}

func (r *GormSubmissionRepository) ListReviewQueue(ctx context.Context, status string, submissionType string) ([]model.GormSubmission, error) {
	query := r.db.WithContext(ctx).Where("status = ?", status).Order("created_at DESC")
	if submissionType != "" {
		query = query.Where("type = ?", submissionType)
	}

	var submissions []model.GormSubmission
	if err := query.Find(&submissions).Error; err != nil {
		return nil, fmt.Errorf("list review queue: %w", err)
	}
	return submissions, nil
}

func (r *GormSubmissionRepository) FindByIDForUpdate(ctx context.Context, db *gorm.DB, id uint) (*model.GormSubmission, error) {
	var submission model.GormSubmission
	err := r.withDB(db).WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&submission, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrSubmissionNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find submission: %w", err)
	}
	return &submission, nil
}

func (r *GormSubmissionRepository) Update(ctx context.Context, db *gorm.DB, submission *model.GormSubmission) error {
	return r.withDB(db).WithContext(ctx).Save(submission).Error
}

func (r *GormSubmissionRepository) withDB(db *gorm.DB) *gorm.DB {
	if db != nil {
		return db
	}
	return r.db
}
