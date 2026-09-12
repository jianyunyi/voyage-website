package model

import (
	"reflect"
	"testing"
)

func TestGormMigrationModelsIncludeCoreTables(t *testing.T) {
	models := GormMigrationModels()

	if len(models) != 9 {
		t.Fatalf("model count = %d, want 9", len(models))
	}

	names := map[string]bool{}
	for _, m := range models {
		typ := reflect.TypeOf(m)
		if typ.Kind() == reflect.Pointer {
			typ = typ.Elem()
		}
		names[typ.Name()] = true
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

func TestGormModelsUseStableTableNames(t *testing.T) {
	tableNames := map[string]string{
		"users":            (&GormUser{}).TableName(),
		"guides":           (&GormGuide{}).TableName(),
		"foods":            (&GormFood{}).TableName(),
		"submissions":      (&GormSubmission{}).TableName(),
		"favorites":        (&GormFavorite{}).TableName(),
		"avatar_assets":    (&GormAvatarAsset{}).TableName(),
		"idempotency_keys": (&GormIdempotencyKey{}).TableName(),
		"moderation_logs":  (&GormModerationLog{}).TableName(),
		"user_preferences": (&GormUserPreference{}).TableName(),
	}

	for want, got := range tableNames {
		if got != want {
			t.Fatalf("table name = %q, want %q", got, want)
		}
	}
}
