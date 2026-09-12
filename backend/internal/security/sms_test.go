package security

import "testing"

func TestVerifyChallengeRejectsMalformedInput(t *testing.T) {
	service := NewSmsChallengeService(3, 3, 500)

	result := service.VerifyChallenge(VerifyChallengeInput{
		ChallengeID: "",
		Code:        "not-a-code",
	})

	if result.Success {
		t.Fatal("malformed verification input must not succeed")
	}
	if result.Code != SmsVerifyInvalidInput {
		t.Fatalf("Code = %q, want %q", result.Code, SmsVerifyInvalidInput)
	}
}
