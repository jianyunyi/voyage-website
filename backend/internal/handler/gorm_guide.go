package handler

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"voyagex-backend/internal/model"
)

type GormGuideWorkflow interface {
	ListPublished(context.Context) ([]model.PublicGuide, error)
	SubmitGuide(context.Context, model.GuideSubmissionPayload, string, string) (model.GormSubmissionView, error)
	ListReviewQueue(context.Context, string, string) ([]model.GormSubmissionView, error)
}

type GormGuideHandler struct {
	workflow GormGuideWorkflow
}

func NewGormGuideHandler(workflow GormGuideWorkflow) *GormGuideHandler {
	return &GormGuideHandler{workflow: workflow}
}

func (h *GormGuideHandler) RegisterRoutes(rg *gin.RouterGroup, adminAuth gin.HandlerFunc) {
	guides := rg.Group("/guides")
	guides.GET("", h.ListPublished)
	guides.GET("/pending", adminAuth, h.ListPending)
	guides.POST("/submit", h.Submit)
}

func (h *GormGuideHandler) ListPublished(c *gin.Context) {
	guides, err := h.workflow.ListPublished(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("获取攻略列表失败"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "guides": guides})
}

func (h *GormGuideHandler) ListPending(c *gin.Context) {
	submissions, err := h.workflow.ListReviewQueue(c.Request.Context(), string(model.SubmissionPendingReview), string(model.SubmissionTypeGuide))
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("获取待审核攻略失败"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "guides": submissions})
}

func (h *GormGuideHandler) Submit(c *gin.Context) {
	var req struct {
		Title       string   `json:"title" binding:"required"`
		Author      string   `json:"author" binding:"required"`
		AuthorID    string   `json:"authorId"`
		Destination string   `json:"destination" binding:"required"`
		Days        int      `json:"days" binding:"required,min=1"`
		Budget      float64  `json:"budget" binding:"required,min=0"`
		Content     string   `json:"content" binding:"required"`
		Image       string   `json:"image"`
		Tags        []string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("请填写完整的攻略信息"))
		return
	}
	image := strings.TrimSpace(req.Image)
	if image == "" {
		image = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1000"
	}
	submission, err := h.workflow.SubmitGuide(c.Request.Context(), model.GuideSubmissionPayload{
		Title:       strings.TrimSpace(req.Title),
		Destination: strings.TrimSpace(req.Destination),
		Days:        req.Days,
		Budget:      req.Budget,
		Content:     strings.TrimSpace(req.Content),
		Image:       image,
		Tags:        parseTags(req.Tags),
	}, strings.TrimSpace(req.Author), strings.TrimSpace(req.AuthorID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("投稿失败，请稍后重试"))
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"success":    true,
		"submission": submission,
		"guide":      submission,
		"message":    "投稿成功，审核通过后将展示在攻略板块",
	})
}
