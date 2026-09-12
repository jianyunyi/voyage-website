package handler

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"voyagex-backend/internal/model"
	"voyagex-backend/internal/security"
	"voyagex-backend/internal/service"
)

type GormModerationQueue interface {
	ListReviewQueue(context.Context, string, string) ([]model.GormSubmissionView, error)
}

type GormModerationDecider interface {
	Decide(context.Context, string, string, security.ModerationAdminDecision, string, string, string) (service.GormModerationResult, error)
}

type GormModerationHandler struct {
	queue   GormModerationQueue
	decider GormModerationDecider
}

func NewGormModerationHandler(queue GormModerationQueue, decider GormModerationDecider) *GormModerationHandler {
	return &GormModerationHandler{queue: queue, decider: decider}
}

func (h *GormModerationHandler) RegisterRoutes(rg *gin.RouterGroup, adminAuth gin.HandlerFunc) {
	moderation := rg.Group("/moderation", adminAuth)
	moderation.GET("/queue", h.ListQueue)
	moderation.POST("/items/:id/decision", h.MakeDecision)
}

func (h *GormModerationHandler) ListQueue(c *gin.Context) {
	submissionType := c.Query("type")
	if submissionType != "" && submissionType != string(model.SubmissionTypeGuide) {
		c.JSON(http.StatusBadRequest, errResp("当前 MySQL 审核队列仅支持攻略投稿"))
		return
	}
	items, err := h.queue.ListReviewQueue(c.Request.Context(), c.DefaultQuery("status", string(model.SubmissionPendingReview)), submissionType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("Failed to list moderation queue."))
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "items": items})
}

func (h *GormModerationHandler) MakeDecision(c *gin.Context) {
	var req struct {
		Type     string `json:"type" binding:"required"`
		Decision string `json:"decision" binding:"required"`
		Reason   string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Type != string(model.SubmissionTypeGuide) {
		c.JSON(http.StatusBadRequest, errResp("Invalid moderation decision."))
		return
	}
	decision := security.ModerationAdminDecision(req.Decision)
	if decision != security.ModDecisionApprove && decision != security.ModDecisionReject {
		c.JSON(http.StatusBadRequest, errResp("Invalid moderation decision."))
		return
	}
	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		reason = string(decision)
	}
	result, err := h.decider.Decide(c.Request.Context(), c.Param("id"), req.Type, decision, reason, adminIDString(c), c.ClientIP())
	if err != nil {
		status := http.StatusInternalServerError
		if err == service.ErrModerationConflict {
			status = http.StatusConflict
		}
		c.JSON(status, errResp("Failed to review submission."))
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "item": result.Submission, "publishedItemId": result.PublishedGuideID})
}

func adminIDString(c *gin.Context) string {
	raw, exists := c.Get("adminId")
	if !exists {
		return ""
	}
	if id, ok := raw.(primitive.ObjectID); ok && id != primitive.NilObjectID {
		return id.Hex()
	}
	if id, ok := raw.(string); ok {
		return id
	}
	return ""
}
