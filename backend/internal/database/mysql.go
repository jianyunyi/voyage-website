package database

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"voyagex-backend/internal/config"
	"voyagex-backend/internal/model"
)

var ErrEmptyMySQLDSN = errors.New("mysql dsn is required")

func BuildMySQLConfig(dsn string) (gorm.Dialector, error) {
	if dsn == "" {
		return nil, ErrEmptyMySQLDSN
	}
	return mysql.Open(dsn), nil
}

func OpenMySQL(cfg *config.Config) (*gorm.DB, error) {
	dialector, err := BuildMySQLConfig(cfg.DBDSN)
	if err != nil {
		return nil, err
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("open mysql: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("mysql sql db: %w", err)
	}

	sqlDB.SetMaxOpenConns(cfg.MySQLMaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MySQLMaxIdleConns)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(model.GormMigrationModels()...); err != nil {
		return fmt.Errorf("auto migrate mysql: %w", err)
	}
	return nil
}
