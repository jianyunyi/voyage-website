package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"voyagex-backend/internal/model"
)

type GormSubmissionReader interface {
	GetUserSubmissions(context.Context, string) ([]model.GormSubmissionView, error)
}

type GormSubmissionHandler struct {
	workflow GormSubmissionReader
}

func NewGormSubmissionHandler(workflow GormSubmissionReader) *GormSubmissionHandler {
	return &GormSubmissionHandler{workflow: workflow}
}

func (h *GormSubmissionHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/users/:userId/submissions", h.GetUserSubmissions)
}

func (h *GormSubmissionHandler) GetUserSubmissions(c *gin.Context) {
	submissions, err := h.workflow.GetUserSubmissions(c.Request.Context(), c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("获取投稿失败，请稍后重试"))
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"submissions":  submissions,
		"guides":       filterGormSubmissions(submissions, "guide"),
		"foods":        filterGormSubmissions(submissions, "food"),
		"statusLabels": gormSubmissionStatusLabels(),
	})
}

func filterGormSubmissions(submissions []model.GormSubmissionView, submissionType string) []model.GormSubmissionView {
	filtered := make([]model.GormSubmissionView, 0, len(submissions))
	for _, submission := range submissions {
		if submission.Type == submissionType {
			filtered = append(filtered, submission)
		}
	}
	return filtered
}

func gormSubmissionStatusLabels() map[string]string {
	return map[string]string{
		"draft":               "草稿",
		"pending_review":      "审核中",
		"auto_rejected":       "自动拒绝",
		"needs_manual_review": "待人工审核",
		"approved":            "已通过",
		"published":           "已发布",
		"rejected":            "已拒绝",
		"removed":             "已下架",
	}
}
