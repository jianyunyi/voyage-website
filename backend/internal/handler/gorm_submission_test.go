package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"voyagex-backend/internal/model"
)

func TestGormPersonalSubmissionsShowsRejectedReason(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	NewGormSubmissionHandler(fakeGormSubmissionReader{}).RegisterRoutes(router.Group("/api"))

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/users/mongo-user/submissions", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"moderationReason":"图片不合规"`) {
		t.Fatal(recorder.Body.String())
	}
}

type fakeGormSubmissionReader struct{}

func (fakeGormSubmissionReader) GetUserSubmissions(_ context.Context, _ string) ([]model.GormSubmissionView, error) {
	return []model.GormSubmissionView{{
		ID:               "7",
		Type:             "guide",
		Status:           "rejected",
		ModerationReason: "图片不合规",
	}}, nil
}
