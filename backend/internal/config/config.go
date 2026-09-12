package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port          string
	DBDriver      string
	DBDSN         string
	MongoURI      string
	MongoDBName   string
	AdminEmail    string
	AdminPassword string
	AdminName     string
	AdminKey      string
	EncryptionKey string // 32-byte hex for AES-256-GCM phone encryption
	IsProduction  bool

	// SMS challenge service config
	SMSPhoneWindowLimit   int
	SMSEmailWindowLimit   int
	SMSGlobalHourlyBudget int

	// Cache & rate limiting
	CacheTTL          time.Duration // default cache TTL for list queries
	NullCacheTTL      time.Duration // TTL for "not found" null entries
	CacheJitter       time.Duration // jitter spread to avoid avalanche
	RateLimitPerMin   int           // max requests per minute per IP
	MaxOpenConns      int           // MongoDB max open connections
	MaxIdleConns      int           // MongoDB max idle connections
	MySQLMaxOpenConns int           // MySQL max open connections
	MySQLMaxIdleConns int           // MySQL max idle connections

	// CORS
	AllowedOrigin string // front-end URL for CORS ("*" = allow all)
}

func Load() *Config {
	return &Config{
		Port:                  getEnv("SERVER_PORT", "3001"),
		DBDriver:              getEnv("DB_DRIVER", "mongo"),
		DBDSN:                 os.Getenv("DB_DSN"),
		MongoURI:              getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDBName:           getEnv("MONGO_DB_NAME", "voyagex"),
		AdminEmail:            os.Getenv("ADMIN_EMAIL"),
		AdminPassword:         os.Getenv("ADMIN_PASSWORD"),
		AdminName:             getEnv("ADMIN_NAME", "VoyageX 管理员"),
		AdminKey:              os.Getenv("ADMIN_KEY"),
		EncryptionKey:         os.Getenv("PHONE_ENCRYPTION_KEY"),
		IsProduction:          os.Getenv("NODE_ENV") == "production",
		SMSPhoneWindowLimit:   getEnvInt("SMS_PHONE_WINDOW_LIMIT", 3),
		SMSEmailWindowLimit:   getEnvInt("SMS_EMAIL_WINDOW_LIMIT", 3),
		SMSGlobalHourlyBudget: getEnvInt("SMS_GLOBAL_HOURLY_BUDGET", 500),
		CacheTTL:              getEnvDuration("CACHE_TTL", 30*time.Second),
		NullCacheTTL:          getEnvDuration("NULL_CACHE_TTL", 5*time.Second),
		CacheJitter:           getEnvDuration("CACHE_JITTER", 3*time.Second),
		RateLimitPerMin:       getEnvInt("RATE_LIMIT_PER_MIN", 60),
		MaxOpenConns:          getEnvInt("MONGO_MAX_OPEN_CONNS", 10),
		MaxIdleConns:          getEnvInt("MONGO_MAX_IDLE_CONNS", 5),
		MySQLMaxOpenConns:     getEnvInt("MYSQL_MAX_OPEN_CONNS", 10),
		MySQLMaxIdleConns:     getEnvInt("MYSQL_MAX_IDLE_CONNS", 5),
		AllowedOrigin:         getEnv("CORS_ORIGIN", "*"),
	}
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
