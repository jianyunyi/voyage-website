package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"gorm.io/gorm"

	"voyagex-backend/internal/cache"
	"voyagex-backend/internal/config"
	"voyagex-backend/internal/database"
	"voyagex-backend/internal/handler"
	"voyagex-backend/internal/metrics"
	"voyagex-backend/internal/middleware"
	"voyagex-backend/internal/model"
	"voyagex-backend/internal/repository"
	"voyagex-backend/internal/security"
	"voyagex-backend/internal/service"
)

func main() {
	cfg := config.Load()

	// ── Structured logging (Phase 3) ──────────────────────────────────────
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))
	slog.Info("starting server", "port", cfg.Port, "env", map[bool]string{true: "production", false: "development"}[cfg.IsProduction])

	// The existing business services still use MongoDB. When enabled, MySQL is
	// initialized beside MongoDB so its schema is ready for module-by-module
	// Gorm migration without changing the public API contract mid-release.
	var gormDB *gorm.DB
	if usesGormGuideRoutes(cfg.DBDriver) {
		var err error
		gormDB, err = database.OpenMySQL(cfg)
		if err != nil {
			slog.Error("mysql connect failed", "error", err)
			os.Exit(1)
		}
		if err := database.AutoMigrate(gormDB); err != nil {
			slog.Error("mysql migration failed", "error", err)
			os.Exit(1)
		}
		mysqlDB, err := gormDB.DB()
		if err != nil {
			slog.Error("mysql database handle failed", "error", err)
			os.Exit(1)
		}
		defer mysqlDB.Close()
		slog.Info("mysql schema ready")
	}

	// ── MongoDB connection ──────────────────────────────────────────────────
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	clientOpts := options.Client().
		ApplyURI(cfg.MongoURI).
		SetMaxPoolSize(uint64(cfg.MaxOpenConns)).
		SetMinPoolSize(uint64(cfg.MaxIdleConns))

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		slog.Error("mongo connect failed", "error", err)
		os.Exit(1)
	}

	if err := client.Ping(ctx, nil); err != nil {
		slog.Error("mongo ping failed", "error", err)
		os.Exit(1)
	}
	slog.Info("mongo connected", "db", cfg.MongoDBName)

	db := client.Database(cfg.MongoDBName)

	// ── Indexes ─────────────────────────────────────────────────────────────
	if err := model.EnsureUserIndexes(ctx, db); err != nil {
		slog.Warn("index setup", "error", err)
	}

	// ── Cache & traffic control ─────────────────────────────────────────────
	memCache := cache.NewMemoryCache(cfg.CacheTTL, cfg.CacheJitter)
	sf := cache.NewSingleflightGroup()

	rateLimiter := cache.NewSlidingWindowRateLimiter(cfg.RateLimitPerMin, time.Minute)
	go rateLimiter.Cleanup(5 * time.Minute)

	// ── Metrics (Phase 4) ──────────────────────────────────────────────────
	metricsReg := metrics.NewRegistry()
	metricsReg.Counter("voyagex_build_info", "Build info")
	metricsGauges := metrics.RegisterGauges(metricsReg)

	// Periodically update cache size gauge
	go func() {
		for {
			metricsGauges.CacheSize.Set(int64(memCache.Len()))
			time.Sleep(15 * time.Second)
		}
	}()

	// ── Services ────────────────────────────────────────────────────────────
	authSvc := service.NewAuthService(db, cfg.EncryptionKey)
	foodSvc := service.NewFoodService(db, memCache, sf, cfg.NullCacheTTL)
	subSvc := service.NewSubmissionService(db)

	smsSvc := security.NewSmsChallengeService(
		cfg.SMSPhoneWindowLimit,
		cfg.SMSEmailWindowLimit,
		cfg.SMSGlobalHourlyBudget,
	)

	// ── Seed admin ──────────────────────────────────────────────────────────
	if err := authSvc.EnsureAdmin(ctx, cfg.AdminEmail, cfg.AdminPassword, cfg.AdminName); err != nil {
		slog.Warn("admin seeding", "error", err)
	}

	// ── Gin engine ──────────────────────────────────────────────────────────
	if cfg.IsProduction {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(metrics.GinMiddleware(metricsReg)) // before trace/log for accurate timing
	r.Use(middleware.TraceID())
	r.Use(middleware.SecureHeaders())
	r.Use(middleware.RequestLogger())
	r.Use(middleware.CORS(cfg.AllowedOrigin))
	r.Use(middleware.RateLimit(rateLimiter))

	adminAuth := middleware.AdminAuth(db)

	// Metrics endpoint (Prometheus text format — Phase 4)
	r.GET("/api/metrics", func(c *gin.Context) {
		c.String(200, metricsReg.Scrape())
	})

	// Health check
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "ok",
			"timestamp": time.Now().Unix(),
			"version":   "1.0.0",
		})
	})

	api := r.Group("/api")

	handler.NewAuthHandler(authSvc, smsSvc, cfg.IsProduction).RegisterRoutes(api)
	handler.NewFoodHandler(foodSvc, subSvc).RegisterRoutes(api, adminAuth)
	if gormDB != nil {
		guideRepo := repository.NewGormGuideRepository(gormDB)
		submissionRepo := repository.NewGormSubmissionRepository(gormDB)
		logRepo := repository.NewGormModerationLogRepository(gormDB)
		guideWorkflow := service.NewGormGuideWorkflow(guideRepo, submissionRepo)
		moderationWorkflow := service.NewGormModerationWorkflow(
			service.NewGormTransactionRunner(gormDB), guideRepo, submissionRepo, logRepo,
		)
		handler.NewGormGuideHandler(guideWorkflow).RegisterRoutes(api, adminAuth)
		handler.NewGormSubmissionHandler(guideWorkflow).RegisterRoutes(api)
		handler.NewSubmissionHandler(subSvc).RegisterFavoriteRoutes(api)
		handler.NewGormModerationHandler(guideWorkflow, moderationWorkflow).RegisterRoutes(api, adminAuth)
	} else {
		guideSvc := service.NewGuideService(db, memCache, sf, cfg.NullCacheTTL)
		handler.NewGuideHandler(guideSvc, subSvc).RegisterRoutes(api, adminAuth)
		handler.NewSubmissionHandler(subSvc).RegisterRoutes(api)
		handler.NewModerationHandler(subSvc).RegisterRoutes(api, adminAuth)
	}
	handler.NewAvatarHandler().RegisterRoutes(api)

	// ── Graceful shutdown (Phase 2) ─────────────────────────────────────────
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		slog.Info("server listening", "addr", srv.Addr,
			"cache_ttl", cfg.CacheTTL,
			"rate_limit", cfg.RateLimitPerMin,
			"pool", fmt.Sprintf("%d/%d", cfg.MaxIdleConns, cfg.MaxOpenConns),
		)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server listen", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	slog.Info("shutting down", "signal", sig.String())

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("http server shutdown", "error", err)
	}
	if err := client.Disconnect(shutdownCtx); err != nil {
		slog.Error("mongo disconnect", "error", err)
	}
	slog.Info("server stopped")
}

func normalizeDBDriver(driver string) string {
	driver = strings.ToLower(strings.TrimSpace(driver))
	if driver == "" {
		return "mongo"
	}
	return driver
}

func usesGormGuideRoutes(driver string) bool {
	return normalizeDBDriver(driver) == "mysql"
}
