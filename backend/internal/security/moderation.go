package security

import (
	"net/url"
	"regexp"
	"strings"
)

// ── Types ────────────────────────────────────────────────────────────────────

type ModeratedContentStatus string

const (
	ModDraft             ModeratedContentStatus = "draft"
	ModPendingReview     ModeratedContentStatus = "pending_review"
	ModAutoRejected      ModeratedContentStatus = "auto_rejected"
	ModNeedsManualReview ModeratedContentStatus = "needs_manual_review"
	ModApproved          ModeratedContentStatus = "approved"
	ModPublished         ModeratedContentStatus = "published"
	ModRejected          ModeratedContentStatus = "rejected"
	ModRemoved           ModeratedContentStatus = "removed"
)

type ModerationAdminDecision string

const (
	ModDecisionApprove ModerationAdminDecision = "approve"
	ModDecisionPublish ModerationAdminDecision = "publish"
	ModDecisionReject  ModerationAdminDecision = "reject"
	ModDecisionRemove  ModerationAdminDecision = "remove"
)

type ModerationInput struct {
	Title    string
	Body     string
	ImageURL string
}

type ModerationDecision struct {
	Status     ModeratedContentStatus `json:"status"`
	CanPublish bool                   `json:"canPublish"`
	RiskScore  float64                `json:"riskScore"`
	RiskLabels []string               `json:"riskLabels"`
}

type ModerationResolvedAction struct {
	Action     string                 `json:"action"` // "publish", "update", "delete"
	NextStatus ModeratedContentStatus `json:"nextStatus,omitempty"`
}

// ── No Safe Import mod (content-based) —───────────────────────────────────────

var unsafeTextPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)scam`),
	regexp.MustCompile(`(?i)illegal`),
	regexp.MustCompile(`(?i)gambling`),
	regexp.MustCompile(`(?i)malware`),
	regexp.MustCompile(`诈骗`),
	regexp.MustCompile(`赌博`),
	regexp.MustCompile(`木马`),
	regexp.MustCompile(`违法`),
}

func isUnsafeURL(rawURL string) bool {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return false
	}
	lower := strings.ToLower(trimmed)
	if strings.HasPrefix(lower, "javascript:") || strings.HasPrefix(lower, "data:") {
		return true
	}
	parsed, err := url.Parse(trimmed)
	if err != nil {
		return true
	}
	return parsed.Scheme != "https"
}

func ModerateSubmission(input ModerationInput) ModerationDecision {
	text := input.Title + "\n" + input.Body
	riskLabels := []string{}

	for _, pattern := range unsafeTextPatterns {
		if pattern.MatchString(text) {
			riskLabels = append(riskLabels, "unsafe_text")
			break
		}
	}

	if input.ImageURL != "" && isUnsafeURL(input.ImageURL) {
		riskLabels = append(riskLabels, "unsafe_url")
	}

	riskScore := float64(len(riskLabels)) * 50
	if riskScore >= 50 {
		return ModerationDecision{
			Status:     ModAutoRejected,
			CanPublish: false,
			RiskScore:  riskScore,
			RiskLabels: riskLabels,
		}
	}

	return ModerationDecision{
		Status:     ModPendingReview,
		CanPublish: false,
		RiskScore:  riskScore,
		RiskLabels: riskLabels,
	}
}

func CanExposePublicly(status ModeratedContentStatus) bool {
	return status == ModPublished
}

// ── State machine: decision + currentStatus → nextStatus ─────────────────────

func ApplyModerationDecision(currentStatus ModeratedContentStatus, decision ModerationAdminDecision) *ModeratedContentStatus {
	switch decision {
	case ModDecisionApprove:
		if currentStatus == ModPendingReview || currentStatus == ModNeedsManualReview {
			return ptrOf(ModApproved)
		}
	case ModDecisionPublish:
		if currentStatus == ModApproved {
			return ptrOf(ModPublished)
		}
	case ModDecisionReject:
		if currentStatus == ModPendingReview || currentStatus == ModNeedsManualReview || currentStatus == ModApproved {
			return ptrOf(ModRejected)
		}
	case ModDecisionRemove:
		if currentStatus == ModPublished {
			return ptrOf(ModRemoved)
		}
	}
	return nil
}

// ResolveSubmissionReviewAction matches TS resolveModerationAction.
// "approve" on pending/needs_manual/approved → publish
// "reject" on pending/needs_manual/approved/auto_rejected → rejected
// Otherwise → update via ApplyModerationDecision.
func ResolveSubmissionReviewAction(currentStatus ModeratedContentStatus, decision ModerationAdminDecision) *ModerationResolvedAction {
	if decision == ModDecisionApprove &&
		(currentStatus == ModPendingReview || currentStatus == ModNeedsManualReview || currentStatus == ModApproved) {
		return &ModerationResolvedAction{Action: "publish", NextStatus: ModPublished}
	}

	if decision == ModDecisionReject &&
		(currentStatus == ModPendingReview || currentStatus == ModNeedsManualReview || currentStatus == ModApproved || currentStatus == ModAutoRejected) {
		return &ModerationResolvedAction{Action: "update", NextStatus: ModRejected}
	}

	next := ApplyModerationDecision(currentStatus, decision)
	if next != nil {
		return &ModerationResolvedAction{Action: "update", NextStatus: *next}
	}
	return nil
}

func ptrOf[T any](v T) *T { return &v }
