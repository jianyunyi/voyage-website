package security

import "testing"

func TestRejectDecisionKeepsSubmissionForPersonalCenter(t *testing.T) {
	resolved := ResolveSubmissionReviewAction(ModPendingReview, ModDecisionReject)
	if resolved == nil {
		t.Fatal("reject decision was not resolved")
	}
	if resolved.Action != "update" || resolved.NextStatus != ModRejected {
		t.Fatalf("resolved = %#v, want update to rejected", resolved)
	}
}
