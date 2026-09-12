# MySQL Gorm Backend Phase One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a MySQL + Gorm backend foundation for VoyageX while keeping the existing `/api/*` frontend contract stable.

**Architecture:** The first phase introduces a Gorm database layer beside the current Gin backend, then wires startup configuration and schema migration without rewriting every business handler in one pass. Business migration will happen module by module after the data layer is compile-safe.

**Tech Stack:** Go 1.22, Gin, Gorm, MySQL driver, Docker Compose MySQL, standard `testing` package.

---

## File Structure

- Create `backend/internal/database/mysql.go`: opens the Gorm MySQL connection, configures connection pool limits, exposes `AutoMigrate`.
- Create `backend/internal/database/mysql_test.go`: verifies DSN selection and migration model registration without connecting to a real database.
- Create `backend/internal/model/gorm_models.go`: defines SQL/Gorm models for users, guides, foods, submissions, favorites, avatar assets, idempotency keys, moderation logs, and user preferences.
- Modify `backend/internal/config/config.go`: adds `DBDriver`, `DBDSN`, and MySQL pool settings while keeping Mongo config during transition.
- Modify `backend/cmd/server/main.go`: selects Mongo or MySQL startup path by `DB_DRIVER`; MySQL path opens Gorm and runs migration.
- Modify `backend/go.mod`: adds `gorm.io/gorm` and `gorm.io/driver/mysql`.
- Modify `backend/.env.example`: adds MySQL/Gorm environment examples.
- Modify `docker-compose.yml`: adds a MySQL service and switches the Go backend example env toward MySQL.

## Task 1: Gorm Configuration

**Files:**
- Modify: `backend/internal/config/config.go`
- Test: `backend/internal/config/config_test.go`

- [ ] **Step 1: Write the failing test**

```go
package config

import "testing"

func TestLoadSupportsMySQLGormConfig(t *testing.T) {
	t.Setenv("DB_DRIVER", "mysql")
	t.Setenv("DB_DSN", "voyagex:secret@tcp(localhost:3306)/voyagex?parseTime=true")
	t.Setenv("MYSQL_MAX_OPEN_CONNS", "25")
	t.Setenv("MYSQL_MAX_IDLE_CONNS", "7")

	cfg := Load()

	if cfg.DBDriver != "mysql" {
		t.Fatalf("DBDriver = %q, want mysql", cfg.DBDriver)
	}
	if cfg.DBDSN != "voyagex:secret@tcp(localhost:3306)/voyagex?parseTime=true" {
		t.Fatalf("DBDSN was not loaded")
	}
	if cfg.MySQLMaxOpenConns != 25 {
		t.Fatalf("MySQLMaxOpenConns = %d, want 25", cfg.MySQLMaxOpenConns)
	}
	if cfg.MySQLMaxIdleConns != 7 {
		t.Fatalf("MySQLMaxIdleConns = %d, want 7", cfg.MySQLMaxIdleConns)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/config`

Expected: FAIL because `DBDriver`, `DBDSN`, `MySQLMaxOpenConns`, and `MySQLMaxIdleConns` do not exist.

- [ ] **Step 3: Add config fields**

Add these fields to `Config`:

```go
DBDriver          string
DBDSN             string
MySQLMaxOpenConns int
MySQLMaxIdleConns int
```

Add these values in `Load()`:

```go
DBDriver:          getEnv("DB_DRIVER", "mongo"),
DBDSN:             os.Getenv("DB_DSN"),
MySQLMaxOpenConns: getEnvInt("MYSQL_MAX_OPEN_CONNS", 10),
MySQLMaxIdleConns: getEnvInt("MYSQL_MAX_IDLE_CONNS", 5),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/config`

Expected: PASS.

## Task 2: Gorm SQL Models

**Files:**
- Create: `backend/internal/model/gorm_models.go`
- Test: `backend/internal/model/gorm_models_test.go`

- [ ] **Step 1: Write the failing test**

```go
package model

import "testing"

func TestGormMigrationModelsIncludeCoreTables(t *testing.T) {
	models := GormMigrationModels()

	if len(models) != 9 {
		t.Fatalf("model count = %d, want 9", len(models))
	}

	names := map[string]bool{}
	for _, m := range models {
		names[gormModelName(m)] = true
	}

	for _, want := range []string{
		"GormUser",
		"GormGuide",
		"GormFood",
		"GormSubmission",
		"GormFavorite",
		"GormAvatarAsset",
		"GormIdempotencyKey",
		"GormModerationLog",
		"GormUserPreference",
	} {
		if !names[want] {
			t.Fatalf("missing migration model %s", want)
		}
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/model`

Expected: FAIL because `GormMigrationModels` does not exist.

- [ ] **Step 3: Add SQL models and migration list**

Define the nine Gorm models with `uint` primary keys, timestamps, status/source strings, and JSON text fields for arrays/payloads. Add:

```go
func GormMigrationModels() []any {
	return []any{
		&GormUser{},
		&GormGuide{},
		&GormFood{},
		&GormSubmission{},
		&GormFavorite{},
		&GormAvatarAsset{},
		&GormIdempotencyKey{},
		&GormModerationLog{},
		&GormUserPreference{},
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/model`

Expected: PASS.

## Task 3: MySQL Gorm Database Package

**Files:**
- Create: `backend/internal/database/mysql.go`
- Test: `backend/internal/database/mysql_test.go`

- [ ] **Step 1: Write the failing test**

```go
package database

import (
	"testing"

	"voyagex-backend/internal/model"
)

func TestDefaultMySQLDSNRequiresExplicitDSN(t *testing.T) {
	if _, err := BuildMySQLConfig(""); err == nil {
		t.Fatalf("expected empty DSN to fail")
	}
}

func TestMigrationModelsAreProvidedByModelPackage(t *testing.T) {
	if len(model.GormMigrationModels()) != 9 {
		t.Fatalf("expected 9 migration models")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/database`

Expected: FAIL because `BuildMySQLConfig` and package `database` do not exist.

- [ ] **Step 3: Implement database package**

Create `BuildMySQLConfig(dsn string) (gorm.Dialector, error)`, `OpenMySQL(cfg *config.Config) (*gorm.DB, error)`, and `AutoMigrate(db *gorm.DB) error`.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/database ./internal/model`

Expected: PASS.

## Task 4: Startup Wiring

**Files:**
- Modify: `backend/cmd/server/main.go`
- Test: `backend/cmd/server/main_test.go`

- [ ] **Step 1: Write the failing test**

```go
package main

import "testing"

func TestNormalizeDBDriver(t *testing.T) {
	if got := normalizeDBDriver("MYSQL"); got != "mysql" {
		t.Fatalf("got %q", got)
	}
	if got := normalizeDBDriver(""); got != "mongo" {
		t.Fatalf("got %q", got)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./cmd/server`

Expected: FAIL because `normalizeDBDriver` does not exist.

- [ ] **Step 3: Add startup branch**

Add a small `normalizeDBDriver` helper and branch startup so `DB_DRIVER=mysql` opens Gorm and runs `database.AutoMigrate`. Keep the Mongo path available for rollback while services are migrated.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./cmd/server`

Expected: PASS.

## Task 5: Environment and Docker

**Files:**
- Modify: `backend/.env.example`
- Modify: `docker-compose.yml`
- Modify: `backend/go.mod`

- [ ] **Step 1: Add MySQL dependencies**

Run: `go get gorm.io/gorm gorm.io/driver/mysql`

Expected: `backend/go.mod` and `backend/go.sum` include Gorm modules.

- [ ] **Step 2: Add env examples**

Add:

```env
DB_DRIVER=mysql
DB_DSN=voyagex:voyagex_password@tcp(localhost:3306)/voyagex?charset=utf8mb4&parseTime=True&loc=Local
MYSQL_MAX_OPEN_CONNS=10
MYSQL_MAX_IDLE_CONNS=5
```

- [ ] **Step 3: Add MySQL service**

Add a `mysql` service using `mysql:8.4` with database `voyagex`, user `voyagex`, and password `voyagex_password`. Keep Mongo service during transition.

- [ ] **Step 4: Verify Go tests**

Run: `go test ./...`

Expected: PASS for packages without live DB integration; no missing `go.sum` errors.

## Self-Review

- Spec coverage: Covers the agreed MySQL + Gin + Gorm direction, core schema, config, dependency, migration, and Docker foundation.
- Placeholder scan: No task contains `TBD`, `TODO`, or open-ended implementation wording.
- Type consistency: `DBDriver`, `DBDSN`, `MySQLMaxOpenConns`, `MySQLMaxIdleConns`, `GormMigrationModels`, `BuildMySQLConfig`, `OpenMySQL`, `AutoMigrate`, and `normalizeDBDriver` are introduced before use.
