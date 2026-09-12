package model

import "testing"

func TestGormGuideToPublicDecodesJSONFields(t *testing.T) {
	guide := GormGuide{
		ID:             42,
		TagsJSON:       `["徒步"]`,
		RiskLabelsJSON: `["manual_review"]`,
	}

	got, err := GormGuideToPublic(guide)
	if err != nil {
		t.Fatalf("GormGuideToPublic() error = %v", err)
	}
	if got.ID != "42" || len(got.Tags) != 1 || got.Tags[0] != "徒步" {
		t.Fatalf("public guide = %#v", got)
	}
}

func TestGormSubmissionToViewIncludesRejectedReason(t *testing.T) {
	row := GormSubmission{
		ID:               7,
		Type:             "guide",
		Status:           "rejected",
		ModerationReason: "图片不合规",
	}

	got, err := GormSubmissionToView(row)
	if err != nil {
		t.Fatalf("GormSubmissionToView() error = %v", err)
	}
	if got.ID != "7" || got.ModerationReason != "图片不合规" {
		t.Fatalf("submission = %#v", got)
	}
}
