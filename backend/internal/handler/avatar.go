package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── In-memory avatar store (matches TS in-memory Map) ────────────────────────

type avatarAsset struct {
	ID              string
	OwnerID         string
	FileName        string
	MimeType        string
	SizeBytes       int64
	Status          string // upload_pending, approved, rejected, etc.
	PrivateObjectKey string
	PublicObjectKey  string
	RejectionReason string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

var avatarAssets = make(map[string]*avatarAsset)

type AvatarHandler struct {
}

func NewAvatarHandler() *AvatarHandler {
	return &AvatarHandler{}
}

func (h *AvatarHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/profile/avatar/uploads", h.RequestUpload)
	rg.POST("/profile/avatar/uploads/:assetId/complete", h.CompleteUpload)
	rg.GET("/profile/avatar/uploads/:assetId", h.GetUploadStatus)
	rg.GET("/users/:userId/avatar", h.GetAvatar)
}

// POST /api/profile/avatar/uploads
func (h *AvatarHandler) RequestUpload(c *gin.Context) {
	userID := getUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, errResp("Authentication required."))
		return
	}

	var req struct {
		FileName  string `json:"fileName" binding:"required"`
		MimeType  string `json:"mimeType" binding:"required"`
		SizeBytes float64 `json:"sizeBytes" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("Invalid request."))
		return
	}

	// Validate (matching TS validateAvatarUploadRequest)
	allowedTypes := map[string]string{
		"jpg": "image/jpeg", "jpeg": "image/jpeg",
		"png": "image/png", "webp": "image/webp",
	}

	parts := strings.Split(req.FileName, ".")
	ext := strings.ToLower(parts[len(parts)-1])
	expectedMime, ok := allowedTypes[ext]
	if !ok {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{
			"success": false, "code": "UPLOAD_UNSUPPORTED_MEDIA_TYPE", "message": "Unsupported avatar image type.",
		})
		return
	}

	if req.MimeType != expectedMime {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false, "code": "UPLOAD_INVALID_FORMAT", "message": "File extension and MIME type do not match.",
		})
		return
	}

	if req.SizeBytes <= 0 || req.SizeBytes > 5*1024*1024 {
		code := "UPLOAD_INVALID_FORMAT"
		msg := "Invalid file size."
		if req.SizeBytes > 5*1024*1024 {
			code = "UPLOAD_TOO_LARGE"
			msg = "Avatar image is larger than 5 MB."
		}
		status := http.StatusBadRequest
		if code == "UPLOAD_TOO_LARGE" {
			status = http.StatusRequestEntityTooLarge
		}
		c.JSON(status, gin.H{"success": false, "code": code, "message": msg})
		return
	}

	normalizedExt := ext
	if normalizedExt == "jpeg" {
		normalizedExt = "jpg"
	}

	assetID := newAssetID()
	now := time.Now()
	asset := &avatarAsset{
		ID:               assetID,
		OwnerID:          userID,
		FileName:         req.FileName,
		MimeType:         expectedMime,
		SizeBytes:        int64(req.SizeBytes),
		Status:           "upload_pending",
		PrivateObjectKey: "profile/original/" + userID + "/" + assetID,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	avatarAssets[assetID] = asset

	c.JSON(http.StatusCreated, gin.H{
		"success":         true,
		"assetId":         assetID,
		"uploadUrl":       "/api/profile/avatar/uploads/" + assetID + "/local-object",
		"expiresInSeconds": 300,
		"headers":         gin.H{"Content-Type": expectedMime},
	})
}

// POST /api/profile/avatar/uploads/:assetId/complete
func (h *AvatarHandler) CompleteUpload(c *gin.Context) {
	userID := getUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, errResp("Authentication required."))
		return
	}

	asset, ok := avatarAssets[c.Param("assetId")]
	if !ok || asset.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false, "code": "UPLOAD_FORBIDDEN", "message": "Upload does not belong to this user.",
		})
		return
	}

	asset.Status = "approved"
	asset.PublicObjectKey = "profile/approved/" + userID + "/" + asset.ID + ".webp"
	asset.UpdatedAt = time.Now()

	c.JSON(http.StatusAccepted, gin.H{"success": true, "assetId": asset.ID, "status": asset.Status})
}

// GET /api/profile/avatar/uploads/:assetId
func (h *AvatarHandler) GetUploadStatus(c *gin.Context) {
	userID := getUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, errResp("Authentication required."))
		return
	}

	asset, ok := avatarAssets[c.Param("assetId")]
	if !ok || asset.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false, "code": "UPLOAD_FORBIDDEN", "message": "Upload does not belong to this user.",
		})
		return
	}

	avatarURL := ""
	if asset.Status == "approved" {
		avatarURL = "/api/users/" + userID + "/avatar?asset=" + asset.ID
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"asset": gin.H{
			"id":              asset.ID,
			"status":          asset.Status,
			"rejectionReason": asset.RejectionReason,
			"avatarUrl":       avatarURL,
		},
	})
}

// GET /api/users/:userId/avatar
func (h *AvatarHandler) GetAvatar(c *gin.Context) {
	requestedAsset := c.Query("asset")
	userID := c.Param("userId")

	var asset *avatarAsset
	if requestedAsset != "" {
		if a, ok := avatarAssets[requestedAsset]; ok {
			asset = a
		}
	}

	c.Header("Content-Security-Policy", "default-src 'none'; img-src 'self' https://ui-avatars.com")
	c.Header("Cache-Control", "public, max-age=3600")

	if asset != nil && asset.OwnerID == userID && asset.Status == "approved" {
		c.Redirect(http.StatusFound, "https://ui-avatars.com/api/?name="+userID+"&background=random")
		return
	}

	c.Redirect(http.StatusFound, "https://ui-avatars.com/api/?name=VoyageX&background=random")
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func getUserID(c *gin.Context) string {
	return c.GetHeader("X-User-Id")
}

func newAssetID() string {
	return primitive.NewObjectID().Hex()
}
