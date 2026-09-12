package service

import (
	"context"
	"testing"

	"gorm.io/gorm"

	"voyagex-backend/internal/model"
	"voyagex-backend/internal/security"
)

func TestApproveGuidePublishesExactlyOnce(t *testing.T) {
	guides := &fakeGormGuideStore{}
	submissions := &fakeGormSubmissionStore{current: testPendingGuideSubmission(t)}
	logs := &fakeGormModerationLogStore{}
	workflow := NewGormModerationWorkflow(fakeTransactionRunner{}, guides, submissions, logs)

	result, err := workflow.Decide(context.Background(), "12", "guide", security.ModDecisionApprove, "审核通过", "admin-mongo-id", "127.0.0.1")
	if err != nil {
		t.Fatalf("Decide() error = %v", err)
	}
	if result.Submission.Status != string(model.SubmissionPublished) || result.PublishedGuideID != "1" {
		t.Fatalf("result = %#v", result)
	}
	if guides.createCalls != 1 || logs.createCalls != 1 {
		t.Fatalf("guide writes = %d, log writes = %d", guides.createCalls, logs.createCalls)
	}
	if logs.created.FromStatus != "pending_review" || logs.created.ToStatus != "published" {
		t.Fatalf("moderation log = %#v", logs.created)
	}
}

func TestRejectGuideKeepsSubmissionAndDoesNotCreateGuide(t *testing.T) {
	guides := &fakeGormGuideStore{}
	submissions := &fakeGormSubmissionStore{current: testPendingGuideSubmission(t)}
	logs := &fakeGormModerationLogStore{}
	workflow := NewGormModerationWorkflow(fakeTransactionRunner{}, guides, submissions, logs)

	result, err := workflow.Decide(context.Background(), "12", "guide", security.ModDecisionReject, "内容不完整", "admin-mongo-id", "127.0.0.1")
	if err != nil {
		t.Fatalf("Decide() error = %v", err)
	}
	if result.Submission.Status != string(model.SubmissionRejected) || guides.createCalls != 0 {
		t.Fatalf("result = %#v, guide writes = %d", result, guides.createCalls)
	}
	if submissions.updated.ModerationReason != "内容不完整" || logs.createCalls != 1 {
		t.Fatalf("updated = %#v, log writes = %d", submissions.updated, logs.createCalls)
	}
}

func testPendingGuideSubmission(t *testing.T) model.GormSubmission {
	t.Helper()
	payload := `{"title":"武功山徒步攻略","destination":"萍乡","days":2,"budget":800,"content":"准备保暖衣物。","image":"https://example.test/guide.jpg","tags":["徒步"]}`
	return model.GormSubmission{ID: 12, Type: "guide", Status: "pending_review", Author: "张三", PayloadJSON: payload}
}

type fakeTransactionRunner struct{}

func (fakeTransactionRunner) Transaction(_ context.Context, callback func(*gorm.DB) error) error {
	return callback(nil)
}

type fakeGormModerationLogStore struct {
	createCalls int
	created     model.GormModerationLog
}

func (f *fakeGormModerationLogStore) Create(_ context.Context, _ *gorm.DB, log *model.GormModerationLog) error {
	f.createCalls++
	f.created = *log
	return nil
}
