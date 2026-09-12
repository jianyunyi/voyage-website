package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"voyagex-backend/internal/model"
	"voyagex-backend/internal/service"
)

type FoodHandler struct {
	foodSvc *service.FoodService
	subSvc  *service.SubmissionService
}

func NewFoodHandler(foodSvc *service.FoodService, subSvc *service.SubmissionService) *FoodHandler {
	return &FoodHandler{foodSvc: foodSvc, subSvc: subSvc}
}

func (h *FoodHandler) RegisterRoutes(rg *gin.RouterGroup, adminAuth gin.HandlerFunc) {
	foods := rg.Group("/foods")
	{
		foods.GET("", h.ListPublished)
		foods.GET("/pending", adminAuth, h.ListPending)
		foods.POST("/submit", h.Submit)
		foods.POST("", adminAuth, h.CreateAdmin)
		foods.PATCH("/:id/status", adminAuth, h.UpdateStatus)
	}
}

// GET /api/foods
func (h *FoodHandler) ListPublished(c *gin.Context) {
	foods, err := h.foodSvc.ListPublished(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("获取美食失败，请稍后重试"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "foods": foods})
}

// GET /api/foods/pending
func (h *FoodHandler) ListPending(c *gin.Context) {
	subs, err := h.subSvc.ListPendingSubmissions(c.Request.Context(), model.SubmissionPendingReview, ptrOf(model.SubmissionTypeFood))
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("获取待审核美食失败"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "foods": subs})
}

// POST /api/foods/submit
func (h *FoodHandler) Submit(c *gin.Context) {
	var req struct {
		Name        string  `json:"name" binding:"required"`
		Province    string  `json:"province" binding:"required"`
		City        string  `json:"city" binding:"required"`
		Address     string  `json:"address" binding:"required"`
		Type        string  `json:"type" binding:"required"`
		Price       string  `json:"price" binding:"required"`
		Description string  `json:"description" binding:"required"`
		Author      string  `json:"author" binding:"required"`
		AuthorID    string  `json:"authorId"`
		Image       string  `json:"image"`
		Tags        []string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("请填写完整的美食信息"))
		return
	}

	image := strings.TrimSpace(req.Image)
	if image == "" {
		image = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1000"
	}

	var authorID *primitive.ObjectID
	if req.AuthorID != "" {
		if oid, err := primitive.ObjectIDFromHex(req.AuthorID); err == nil {
			authorID = &oid
		}
	}

	payload := model.FoodSubmissionPayload{
		Name:        strings.TrimSpace(req.Name),
		Province:    strings.TrimSpace(req.Province),
		City:        strings.TrimSpace(req.City),
		Address:     strings.TrimSpace(req.Address),
		Type:        strings.TrimSpace(req.Type),
		Price:       formatPrice(req.Price),
		Description: strings.TrimSpace(req.Description),
		Image:       image,
		Tags:        parseTags(req.Tags),
	}

	sub, err := h.foodSvc.SubmitAsUser(c.Request.Context(), payload, strings.TrimSpace(req.Author), authorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("投稿失败，请稍后重试"))
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":    true,
		"submission": sub,
		"food":       sub,
		"message":    "投稿成功，审核通过后将展示在美食板块",
	})
}

// POST /api/foods
func (h *FoodHandler) CreateAdmin(c *gin.Context) {
	var req struct {
		Name        string           `json:"name" binding:"required"`
		Province    string           `json:"province" binding:"required"`
		City        string           `json:"city" binding:"required"`
		Address     string           `json:"address" binding:"required"`
		Type        string           `json:"type" binding:"required"`
		Price       string           `json:"price" binding:"required"`
		Description string           `json:"description" binding:"required"`
		Image       string           `json:"image"`
		Tags        []string         `json:"tags"`
		Rating      *float64         `json:"rating"`
		Reviews     *int             `json:"reviews"`
		ReviewsList []model.FoodReview `json:"reviewsList"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("请填写完整的美食信息"))
		return
	}

	image := strings.TrimSpace(req.Image)
	if image == "" {
		image = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1000"
	}

	rating := 4.5
	if req.Rating != nil {
		rating = *req.Rating
	}
	reviews := 0
	if req.Reviews != nil {
		reviews = *req.Reviews
	}
	if req.ReviewsList == nil {
		req.ReviewsList = []model.FoodReview{}
	}

	food := model.Food{
		Name:        strings.TrimSpace(req.Name),
		Province:    strings.TrimSpace(req.Province),
		City:        strings.TrimSpace(req.City),
		Address:     strings.TrimSpace(req.Address),
		Type:        strings.TrimSpace(req.Type),
		Price:       formatPrice(req.Price),
		Description: strings.TrimSpace(req.Description),
		Image:       image,
		Tags:        parseTags(req.Tags),
		Rating:      rating,
		Reviews:     reviews,
		ReviewsList: req.ReviewsList,
		Author:      "VoyageX 官方",
	}

	pub, err := h.foodSvc.CreateAdmin(c.Request.Context(), food)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("发布失败，请稍后重试"))
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "food": pub, "message": "美食已发布"})
}

// PATCH /api/foods/:id/status
func (h *FoodHandler) UpdateStatus(c *gin.Context) {
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("无效的状态值"))
		return
	}

	pub, err := h.foodSvc.UpdateStatus(c.Request.Context(), c.Param("id"), req.Status)
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("操作失败"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "food": pub, "message": "美食状态已更新"})
}

// ── Format helpers ───────────────────────────────────────────────────────────

func formatPrice(price string) string {
	price = strings.TrimSpace(price)
	if strings.Contains(price, "¥") {
		return price + "/人"
	}
	return "¥" + price + "/人"
}

func parseTags(tags []string) []string {
	var out []string
	for _, t := range tags {
		t = strings.TrimSpace(t)
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}

func ptrOf[T any](v T) *T { return &v }

func errResp(msg string) gin.H {
	return gin.H{"success": false, "message": msg}
}
