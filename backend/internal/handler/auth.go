package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"voyagex-backend/internal/model"
	"voyagex-backend/internal/security"
	"voyagex-backend/internal/service"
)

type AuthHandler struct {
	svc          *service.AuthService
	smsSvc       *security.SmsChallengeService
	isProduction bool
}

func NewAuthHandler(svc *service.AuthService, smsSvc *security.SmsChallengeService, isProduction bool) *AuthHandler {
	return &AuthHandler{svc: svc, smsSvc: smsSvc, isProduction: isProduction}
}

// ── Request / Response DTOs ──────────────────────────────────────────────────

type registerRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required,min=2,max=20"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type smsRequest struct {
	Email string `json:"email" binding:"required,email"`
	Phone string `json:"phone" binding:"required"`
}

type smsVerifyRequest struct {
	ChallengeID string `json:"challengeId" binding:"required"`
	Code        string `json:"code" binding:"required,len=6"`
}

type successResponse struct {
	Success bool           `json:"success"`
	User    model.PublicUser `json:"user,omitempty"`
}

type errorResponse struct {
	Success bool   `json:"success"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ── Routes ───────────────────────────────────────────────────────────────────

func (h *AuthHandler) RegisterRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	{
		auth.POST("/register", h.Register)
		auth.POST("/login", h.Login)
		auth.POST("/login/sms/request", h.SmsRequest)
		auth.POST("/login/sms/verify", h.SmsVerify)
	}
}

// POST /api/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse{
			Success: false,
			Code:    "INVALID_INPUT",
			Message: "请填写完整的注册信息",
		})
		return
	}

	result, err := h.svc.Register(c.Request.Context(), service.RegisterInput{
		Email:    req.Email,
		Password: req.Password,
		Name:     req.Name,
	})
	if err != nil {
		code, msg := mapServiceError(err)
		c.JSON(code, errorResponse{Success: false, Code: "STORAGE_ERROR", Message: msg})
		return
	}

	c.JSON(http.StatusCreated, successResponse{Success: true, User: result.User})
}

// POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse{
			Success: false,
			Code:    "INVALID_INPUT",
			Message: "邮箱或密码错误",
		})
		return
	}

	result, err := h.svc.Login(c.Request.Context(), service.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		code, msg := mapServiceError(err)
		c.JSON(code, errorResponse{Success: false, Code: "INVALID_CREDENTIALS", Message: msg})
		return
	}

	c.JSON(http.StatusOK, successResponse{Success: true, User: result.User})
}

// POST /api/auth/login/sms/request
func (h *AuthHandler) SmsRequest(c *gin.Context) {
	var req smsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse{
			Success: false,
			Code:    "SMS_INVALID_INPUT",
			Message: "Invalid email or phone.",
		})
		return
	}

	result := h.smsSvc.RequestChallenge(security.RequestChallengeInput{
		Email:    req.Email,
		Phone:    req.Phone,
		IP:       c.ClientIP(),
		DeviceID: c.GetHeader("User-Agent"),
	})

	if !result.Success {
		status := http.StatusTooManyRequests
		if result.Code == security.SmsBudgetExhausted {
			status = http.StatusServiceUnavailable
		} else if result.Code == security.SmsInvalidInput {
			status = http.StatusBadRequest
		}
		c.JSON(status, result)
		return
	}

	debugCode := ""
	if !h.isProduction {
		debugCode = result.DebugCode
	}

	c.JSON(http.StatusAccepted, gin.H{
		"success":          true,
		"challengeId":      result.ChallengeID,
		"expiresInSeconds": result.ExpiresInSeconds,
		"retryAfterSeconds": result.RetryAfterSeconds,
		"debugCode":        debugCode,
		"message":          "If the account can receive verification, a code has been sent.",
	})
}

// POST /api/auth/login/sms/verify
func (h *AuthHandler) SmsVerify(c *gin.Context) {
	var req smsVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse{
			Success: false,
			Code:    "SMS_INVALID_INPUT",
			Message: "Invalid challenge or code.",
		})
		return
	}

	verifyResult := h.smsSvc.VerifyChallenge(security.VerifyChallengeInput{
		ChallengeID: req.ChallengeID,
		Code:        req.Code,
	})

	if !verifyResult.Success {
		status := http.StatusBadRequest
		switch verifyResult.Code {
		case security.SmsChallengeExpired:
			status = http.StatusGone
		case security.SmsChallengeLocked:
			status = http.StatusLocked
		case security.SmsInvalidCode:
			status = http.StatusUnauthorized
		}
		c.JSON(status, verifyResult)
		return
	}

	phoneHash := security.HashValue(verifyResult.Phone)
	result, err := h.svc.FinaliseSmsLogin(c.Request.Context(), service.SmsVerifyFinaliseInput{
		Email:     verifyResult.Email,
		Phone:     verifyResult.Phone,
		PhoneHash: phoneHash,
	})
	if err != nil {
		c.JSON(http.StatusUnauthorized, errorResponse{
			Success: false,
			Code:    "INVALID_CREDENTIALS",
			Message: "Invalid verification challenge.",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    result.User,
		"session": gin.H{
			"expiresAt": time.Now().Add(7 * 24 * time.Hour).Format(time.RFC3339),
		},
	})
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func mapServiceError(err error) (int, string) {
	switch err {
	case service.ErrEmailTaken:
		return http.StatusConflict, "该邮箱已被注册"
	case service.ErrUserNotFound:
		return http.StatusNotFound, "未找到此用户，请先注册"
	case service.ErrInvalidPassword:
		return http.StatusUnauthorized, "邮箱或密码错误"
	default:
		return http.StatusInternalServerError, "操作失败，请稍后重试"
	}
}


