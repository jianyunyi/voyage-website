package database

import (
	"testing"

	"voyagex-backend/internal/model"
)

func TestBuildMySQLConfigRequiresExplicitDSN(t *testing.T) {
	if _, err := BuildMySQLConfig(""); err == nil {
		t.Fatalf("expected empty DSN to fail")
	}
}

func TestMigrationModelsAreProvidedByModelPackage(t *testing.T) {
	if len(model.GormMigrationModels()) != 9 {
		t.Fatalf("expected 9 migration models")
	}
}
