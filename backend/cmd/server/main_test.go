package main

import "testing"

func TestNormalizeDBDriver(t *testing.T) {
	if got := normalizeDBDriver("MYSQL"); got != "mysql" {
		t.Fatalf("got %q, want mysql", got)
	}
	if got := normalizeDBDriver(""); got != "mongo" {
		t.Fatalf("got %q, want mongo", got)
	}
}

func TestUsesGormGuideRoutesOnlyForMySQL(t *testing.T) {
	if !usesGormGuideRoutes("mysql") {
		t.Fatal("mysql must use Gorm guide routes")
	}
	if usesGormGuideRoutes("mongo") {
		t.Fatal("mongo must keep existing guide routes")
	}
}
