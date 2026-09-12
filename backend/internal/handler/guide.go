package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"voyagex-backend/internal/model"
	"voyagex-backend/internal/service"
)

type GuideHandler struct {
	guideSvc *service.GuideService
	subSvc   *service.SubmissionService
}

func NewGuideHandler(guideSvc *service.GuideService, subSvc *service.SubmissionService) *GuideHandler {
	return &GuideHandler{guideSvc: guideSvc, subSvc: subSvc}
}

func (h *GuideHandler) RegisterRoutes(rg *gin.RouterGroup, adminAuth gin.HandlerFunc) {
	guides := rg.Group("/guides")
	{
		guides.GET("", h.ListPublished)
		guides.GET("/pending", adminAuth, h.ListPending)
		guides.POST("/submit", h.Submit)
		guides.POST("", adminAuth, h.CreateAdmin)
		guides.PATCH("/:id/status", adminAuth, h.UpdateStatus)
	}
}

// GET /api/guides
func (h *GuideHandler) ListPublished(c *gin.Context) {
	guides, err := h.guideSvc.ListPublished(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("获取攻略列表失败"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "guides": guides})
}

// GET /api/guides/pending
func (h *GuideHandler) ListPending(c *gin.Context) {
	subs, err := h.subSvc.ListPendingSubmissions(c.Request.Context(), model.SubmissionPendingReview, ptrOf(model.SubmissionTypeGuide))
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("获取待审核攻略失败"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "guides": subs})
}

// POST /api/guides/submit
func (h *GuideHandler) Submit(c *gin.Context) {
	var req struct {
		Title        string   `json:"title" binding:"required"`
		Author       string   `json:"author" binding:"required"`
		AuthorID     string   `json:"authorId"`
		Destination  string   `json:"destination" binding:"required"`
		Days         int      `json:"days" binding:"required,min=1"`
		Budget       float64  `json:"budget" binding:"required,min=0"`
		Content      string   `json:"content" binding:"required"`
		Image        string   `json:"image"`
		Tags         []string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("请填写完整的攻略信息"))
		return
	}

	image := strings.TrimSpace(req.Image)
	if image == "" {
		image = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1000"
	}

	var authorID *primitive.ObjectID
	if req.AuthorID != "" {
		if oid, err := primitive.ObjectIDFromHex(req.AuthorID); err == nil {
			authorID = &oid
		}
	}

	payload := model.GuideSubmissionPayload{
		Title:       strings.TrimSpace(req.Title),
		Destination: strings.TrimSpace(req.Destination),
		Days:        req.Days,
		Budget:      req.Budget,
		Content:     strings.TrimSpace(req.Content),
		Image:       image,
		Tags:        parseTags(req.Tags),
	}

	sub, err := h.guideSvc.SubmitAsUser(c.Request.Context(), payload, strings.TrimSpace(req.Author), authorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("投稿失败，请稍后重试"))
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":    true,
		"submission": sub,
		"guide":      sub,
		"message":    "投稿成功，审核通过后将展示在攻略板块",
	})
}

// POST /api/guides
func (h *GuideHandler) CreateAdmin(c *gin.Context) {
	var req struct {
		Title       string   `json:"title" binding:"required"`
		Destination string   `json:"destination" binding:"required"`
		Days        int      `json:"days" binding:"required,min=1"`
		Budget      float64  `json:"budget" binding:"required,min=0"`
		Content     string   `json:"content" binding:"required"`
		Image       string   `json:"image"`
		Tags        []string `json:"tags"`
		Likes       *int     `json:"likes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("请填写完整的攻略信息"))
		return
	}

	image := strings.TrimSpace(req.Image)
	if image == "" {
		image = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1000"
	}
	likes := 0
	if req.Likes != nil {
		likes = *req.Likes
	}

	guide := model.Guide{
		Title:       strings.TrimSpace(req.Title),
		Author:      "VoyageX 官方",
		Destination: strings.TrimSpace(req.Destination),
		Days:        req.Days,
		Budget:      req.Budget,
		Likes:       likes,
		Image:       image,
		Tags:        parseTags(req.Tags),
		Content:     strings.TrimSpace(req.Content),
	}

	pub, err := h.guideSvc.CreateAdmin(c.Request.Context(), guide)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("发布失败，请稍后重试"))
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "guide": pub, "message": "攻略已发布"})
}

// PATCH /api/guides/:id/status
func (h *GuideHandler) UpdateStatus(c *gin.Context) {
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("无效的状态值"))
		return
	}

	pub, err := h.guideSvc.UpdateStatus(c.Request.Context(), c.Param("id"), req.Status)
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("操作失败"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "guide": pub, "message": "攻略状态已更新"})
}
