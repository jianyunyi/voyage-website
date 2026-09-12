package repository

import (
	"context"

	"gorm.io/gorm"

	"voyagex-backend/internal/model"
)

type GormModerationLogRepository struct {
	db *gorm.DB
}

func NewGormModerationLogRepository(db *gorm.DB) *GormModerationLogRepository {
	return &GormModerationLogRepository{db: db}
}

func (r *GormModerationLogRepository) Create(ctx context.Context, db *gorm.DB, log *model.GormModerationLog) error {
	target := r.db
	if db != nil {
		target = db
	}
	return target.WithContext(ctx).Create(log).Error
}
