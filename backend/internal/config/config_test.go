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
