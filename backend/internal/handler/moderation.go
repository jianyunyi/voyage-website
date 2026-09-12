package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"voyagex-backend/internal/model"
	"voyagex-backend/internal/security"
	"voyagex-backend/internal/service"
)

type ModerationHandler struct {
	subSvc *service.SubmissionService
}

func NewModerationHandler(subSvc *service.SubmissionService) *ModerationHandler {
	return &ModerationHandler{subSvc: subSvc}
}

func (h *ModerationHandler) RegisterRoutes(rg *gin.RouterGroup, adminAuth gin.HandlerFunc) {
	mod := rg.Group("/moderation", adminAuth)
	{
		mod.GET("/queue", h.ListQueue)
		mod.POST("/items/:id/decision", h.MakeDecision)
	}
}

// GET /api/moderation/queue
func (h *ModerationHandler) ListQueue(c *gin.Context) {
	statusStr := c.DefaultQuery("status", "pending_review")
	status := model.SubmissionStatus(statusStr)

	typeFilter := c.Query("type")
	var subType *model.SubmissionType
	if typeFilter == "guide" {
		t := model.SubmissionTypeGuide
		subType = &t
	} else if typeFilter == "food" {
		t := model.SubmissionTypeFood
		subType = &t
	}

	subs, err := h.subSvc.ListPendingSubmissions(c.Request.Context(), status, subType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("Failed to list moderation queue."))
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "items": subs})
}

// POST /api/moderation/items/:id/decision
func (h *ModerationHandler) MakeDecision(c *gin.Context) {
	var req struct {
		Type    string `json:"type" binding:"required"`
		Decision string `json:"decision" binding:"required"`
		Reason  string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("Invalid moderation decision."))
		return
	}

	if req.Type != "guide" && req.Type != "food" {
		c.JSON(http.StatusBadRequest, errResp("Invalid type."))
		return
	}

	decision := security.ModerationAdminDecision(req.Decision)
	switch decision {
	case security.ModDecisionApprove, security.ModDecisionPublish, security.ModDecisionReject, security.ModDecisionRemove:
	default:
		c.JSON(http.StatusBadRequest, errResp("Invalid moderation decision."))
		return
	}

	sub, err := h.subSvc.FindSubmission(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, errResp("Moderation item not found."))
		return
	}

	if string(sub.Type) != req.Type {
		c.JSON(http.StatusBadRequest, errResp("Moderation item not found."))
		return
	}

	resolved := security.ResolveSubmissionReviewAction(security.ModeratedContentStatus(sub.Status), decision)
	if resolved == nil {
		c.JSON(http.StatusBadRequest, errResp("Decision is not allowed for current status."))
		return
	}

	// ── Delete action ────────────────────────────────────────────────────
	if resolved.Action == "delete" {
		if err := h.subSvc.DeleteSubmission(c.Request.Context(), sub.ID); err != nil {
			c.JSON(http.StatusInternalServerError, errResp("Failed to delete submission."))
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"item": gin.H{"id": c.Param("id"), "type": req.Type, "status": "deleted"},
		})
		return
	}

	// Get admin ID from context
	var adminID *primitive.ObjectID
	if raw, exists := c.Get("adminId"); exists {
		if oid, ok := raw.(primitive.ObjectID); ok && oid != primitive.NilObjectID {
			adminID = &oid
		}
	}

	reason := req.Reason
	if reason == "" {
		reason = string(decision)
	}

	// ── Publish action (approve) ──────────────────────────────────────────
	if resolved.Action == "publish" {
		result, err := h.subSvc.PublishReview(c.Request.Context(), sub, adminID, reason)
		if err != nil {
			c.JSON(http.StatusInternalServerError, errResp("Failed to publish submission."))
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"item": gin.H{
				"id":              result.Submission.ID.Hex(),
				"type":            req.Type,
				"status":          result.Submission.Status,
				"publishedItemId": result.PublishedItemID.Hex(),
				"riskScore":       result.Submission.RiskScore,
				"riskLabels":      result.Submission.RiskLabels,
			},
		})
		return
	}

	// ── Update action (reject / remove) ───────────────────────────────────
	now := time.Now()
	sub.Status = model.SubmissionStatus(resolved.NextStatus)
	sub.ModerationReason = reason
	sub.ReviewedBy = adminID
	sub.ReviewedAt = &now
	sub.UpdatedAt = now

	if err := h.subSvc.UpdateSubmission(c.Request.Context(), sub); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("Failed to update submission."))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"item": gin.H{
			"id":         sub.ID.Hex(),
			"type":       req.Type,
			"status":     sub.Status,
			"riskScore":  sub.RiskScore,
			"riskLabels": sub.RiskLabels,
		},
	})
}

func timeNow() time.Time {
	return time.Now()
}
