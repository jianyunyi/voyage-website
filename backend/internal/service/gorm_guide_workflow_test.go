package service

import (
	"context"
	"testing"

	"gorm.io/gorm"

	"voyagex-backend/internal/model"
)

func TestSubmitGuideCreatesNonPublicSubmission(t *testing.T) {
	guides := &fakeGormGuideStore{}
	submissions := &fakeGormSubmissionStore{}
	workflow := NewGormGuideWorkflow(guides, submissions)

	result, err := workflow.SubmitGuide(context.Background(), model.GuideSubmissionPayload{
		Title:       "武功山徒步攻略",
		Destination: "萍乡",
		Days:        2,
		Budget:      800,
		Content:     "准备保暖衣物和充足饮水。",
		Image:       "https://example.test/guide.jpg",
		Tags:        []string{"徒步"},
	}, "张三", "507f1f77bcf86cd799439011")
	if err != nil {
		t.Fatalf("SubmitGuide() error = %v", err)
	}
	if result.Status == string(model.SubmissionPublished) {
		t.Fatal("submission must not be public before review")
	}
	if guides.createCalls != 0 {
		t.Fatal("guide was created before moderation approval")
	}
	if submissions.created.AuthorID == nil || *submissions.created.AuthorID != "507f1f77bcf86cd799439011" {
		t.Fatalf("submission owner = %#v", submissions.created.AuthorID)
	}
}

type fakeGormGuideStore struct {
	createCalls int
	created     model.GormGuide
}

func (f *fakeGormGuideStore) ListPublished(context.Context) ([]model.GormGuide, error) {
	return nil, nil
}

func (f *fakeGormGuideStore) Create(_ context.Context, _ *gorm.DB, guide *model.GormGuide) error {
	f.createCalls++
	guide.ID = uint(f.createCalls)
	f.created = *guide
	return nil
}

type fakeGormSubmissionStore struct {
	created model.GormSubmission
	current model.GormSubmission
	updated model.GormSubmission
}

func (f *fakeGormSubmissionStore) Create(_ context.Context, _ *gorm.DB, submission *model.GormSubmission) error {
	submission.ID = 1
	f.created = *submission
	return nil
}

func (f *fakeGormSubmissionStore) ListByAuthor(context.Context, string) ([]model.GormSubmission, error) {
	return nil, nil
}

func (f *fakeGormSubmissionStore) ListReviewQueue(context.Context, string, string) ([]model.GormSubmission, error) {
	return nil, nil
}

func (f *fakeGormSubmissionStore) FindByIDForUpdate(context.Context, *gorm.DB, uint) (*model.GormSubmission, error) {
	copy := f.current
	return &copy, nil
}

func (f *fakeGormSubmissionStore) Update(_ context.Context, _ *gorm.DB, submission *model.GormSubmission) error {
	f.updated = *submission
	return nil
}
