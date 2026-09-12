package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"voyagex-backend/internal/model"
	"voyagex-backend/internal/service"
)

type SubmissionHandler struct {
	subSvc *service.SubmissionService
}

func NewSubmissionHandler(subSvc *service.SubmissionService) *SubmissionHandler {
	return &SubmissionHandler{subSvc: subSvc}
}

func (h *SubmissionHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/users/:userId/submissions", h.GetUserSubmissions)
	h.RegisterFavoriteRoutes(rg)
}

func (h *SubmissionHandler) RegisterFavoriteRoutes(rg *gin.RouterGroup) {
	rg.POST("/favorites/toggle", h.ToggleFavorite)
}

// GET /api/users/:userId/submissions
func (h *SubmissionHandler) GetUserSubmissions(c *gin.Context) {
	userID, err := primitive.ObjectIDFromHex(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("无效的用户 ID"))
		return
	}

	subs, err := h.subSvc.GetUserSubmissions(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("获取投稿失败，请稍后重试"))
		return
	}

	// Build status labels matching TS
	statusLabels := map[string]string{
		"draft":               "草稿",
		"pending_review":      "审核中",
		"auto_rejected":       "自动拒绝",
		"needs_manual_review": "待人工审核",
		"approved":            "已通过",
		"published":           "已发布",
		"rejected":            "已拒绝",
		"removed":             "已下架",
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"submissions":  subs,
		"guides":       filterSubmissions(subs, model.SubmissionTypeGuide),
		"foods":        filterSubmissions(subs, model.SubmissionTypeFood),
		"statusLabels": statusLabels,
	})
}

// POST /api/favorites/toggle
func (h *SubmissionHandler) ToggleFavorite(c *gin.Context) {
	var req struct {
		UserID    string                 `json:"userId" binding:"required"`
		ItemID    string                 `json:"itemId" binding:"required"`
		ItemType  model.FavoriteItemType `json:"itemType" binding:"required"`
		Favorited bool                   `json:"favorited"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("缺少必要参数"))
		return
	}

	userID, err := primitive.ObjectIDFromHex(req.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("无效的用户 ID"))
		return
	}

	validTypes := map[model.FavoriteItemType]bool{
		model.FavGuide: true, model.FavFood: true, model.FavHotel: true, model.FavRoute: true,
	}
	if !validTypes[req.ItemType] {
		c.JSON(http.StatusBadRequest, errResp("无效的内容类型"))
		return
	}

	count, err := h.subSvc.ToggleFavorite(c.Request.Context(), userID, req.ItemID, req.ItemType, req.Favorited)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("操作失败，请稍后重试"))
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "favoritesCount": count})
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func filterSubmissions(subs []model.Submission, typ model.SubmissionType) []model.Submission {
	var out []model.Submission
	for _, s := range subs {
		if s.Type == typ {
			out = append(out, s)
		}
	}
	return out
}
