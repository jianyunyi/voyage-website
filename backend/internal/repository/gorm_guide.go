package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"voyagex-backend/internal/model"
)

type GormGuideRepository struct {
	db *gorm.DB
}

func NewGormGuideRepository(db *gorm.DB) *GormGuideRepository {
	return &GormGuideRepository{db: db}
}

func (r *GormGuideRepository) ListPublished(ctx context.Context) ([]model.GormGuide, error) {
	var guides []model.GormGuide
	if err := r.db.WithContext(ctx).
		Where("status = ?", string(model.GuidePublished)).
		Order("created_at DESC").
		Find(&guides).Error; err != nil {
		return nil, fmt.Errorf("list published guides: %w", err)
	}
	return guides, nil
}

func (r *GormGuideRepository) Create(ctx context.Context, db *gorm.DB, guide *model.GormGuide) error {
	target := r.db
	if db != nil {
		target = db
	}
	return target.WithContext(ctx).Create(guide).Error
}
