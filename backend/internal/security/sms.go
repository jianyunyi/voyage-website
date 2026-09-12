package security

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"regexp"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// ── Types ────────────────────────────────────────────────────────────────────

type SmsChallengeStatus string

const (
	ChallengePending  SmsChallengeStatus = "pending"
	ChallengeVerified SmsChallengeStatus = "verified"
	ChallengeExpired  SmsChallengeStatus = "expired"
	ChallengeLocked   SmsChallengeStatus = "locked"
	ChallengeConsumed SmsChallengeStatus = "consumed"
)

type SmsRequestErrorCode string

const (
	SmsInvalidInput     SmsRequestErrorCode = "SMS_INVALID_INPUT"
	SmsPhoneRateLimited SmsRequestErrorCode = "SMS_PHONE_RATE_LIMITED"
	SmsEmailRateLimited SmsRequestErrorCode = "SMS_EMAIL_RATE_LIMITED"
	SmsBudgetExhausted  SmsRequestErrorCode = "SMS_BUDGET_EXHAUSTED"
)

type SmsVerifyErrorCode string

const (
	SmsVerifyInvalidInput SmsVerifyErrorCode = "SMS_INVALID_INPUT"
	SmsInvalidCode        SmsVerifyErrorCode = "SMS_INVALID_CODE"
	SmsChallengeExpired   SmsVerifyErrorCode = "SMS_CHALLENGE_EXPIRED"
	SmsChallengeLocked    SmsVerifyErrorCode = "SMS_CHALLENGE_LOCKED"
)

type SmsRequestResult struct {
	Success           bool                `json:"success"`
	Code              SmsRequestErrorCode `json:"code,omitempty"`
	ChallengeID       string              `json:"challengeId,omitempty"`
	ExpiresInSeconds  int                 `json:"expiresInSeconds,omitempty"`
	RetryAfterSeconds int                 `json:"retryAfterSeconds,omitempty"`
	DebugCode         string              `json:"debugCode,omitempty"`
	Message           string              `json:"message,omitempty"`
}

type SmsVerifyResult struct {
	Success bool               `json:"success"`
	Code    SmsVerifyErrorCode `json:"code,omitempty"`
	Email   string             `json:"email,omitempty"`
	Phone   string             `json:"phone,omitempty"`
	Message string             `json:"message,omitempty"`
}

type RequestChallengeInput struct {
	Email    string
	Phone    string
	IP       string
	DeviceID string
}

type VerifyChallengeInput struct {
	ChallengeID string
	Code        string
}

// ── Service ──────────────────────────────────────────────────────────────────

type storedChallenge struct {
	ID           string
	Email        string
	Phone        string
	EmailHash    string
	PhoneHash    string
	CodeHash     string
	Status       SmsChallengeStatus
	AttemptCount int
	ExpiresAtMs  int64
	CreatedAtMs  int64
}

type SmsChallengeService struct {
	mu                  sync.Mutex
	now                 func() time.Time
	sendLimitPerPhone   int
	sendLimitPerEmail   int
	globalBudgetPerHour int
	phoneSendBuckets    map[string][]int64
	emailSendBuckets    map[string][]int64
	globalSends         []int64
	challenges          map[string]*storedChallenge
}

func NewSmsChallengeService(phoneLimit, emailLimit, globalBudget int) *SmsChallengeService {
	return &SmsChallengeService{
		now:                 time.Now,
		sendLimitPerPhone:   phoneLimit,
		sendLimitPerEmail:   emailLimit,
		globalBudgetPerHour: globalBudget,
		phoneSendBuckets:    make(map[string][]int64),
		emailSendBuckets:    make(map[string][]int64),
		challenges:          make(map[string]*storedChallenge),
	}
}

// ── Public API ───────────────────────────────────────────────────────────────

func (s *SmsChallengeService) RequestChallenge(input RequestChallengeInput) *SmsRequestResult {
	s.mu.Lock()
	defer s.mu.Unlock()

	email := normalizeEmail(input.Email)
	phone := normalizePhone(input.Phone)
	nowMs := s.now().UnixMilli()
	emailHash := HashValue(email)
	phoneHash := HashValue(phone)

	if !isValidEmail(email) || !isValidPhone(phone) {
		return &SmsRequestResult{
			Success: false,
			Code:    SmsInvalidInput,
			Message: "Invalid email or phone.",
		}
	}

	s.pruneBuckets(nowMs)

	if len(s.phoneSendBuckets[phoneHash]) >= s.sendLimitPerPhone {
		return &SmsRequestResult{
			Success:           false,
			Code:              SmsPhoneRateLimited,
			RetryAfterSeconds: 600,
			Message:           "Too many SMS requests for this phone.",
		}
	}

	if len(s.emailSendBuckets[emailHash]) >= s.sendLimitPerEmail {
		return &SmsRequestResult{
			Success:           false,
			Code:              SmsEmailRateLimited,
			RetryAfterSeconds: 600,
			Message:           "Too many SMS requests for this email.",
		}
	}

	if len(s.globalSends) >= s.globalBudgetPerHour {
		return &SmsRequestResult{
			Success:           false,
			Code:              SmsBudgetExhausted,
			RetryAfterSeconds: 3600,
			Message:           "SMS budget exhausted.",
		}
	}

	code := makeCode()
	codeHash, err := bcrypt.GenerateFromPassword([]byte(code), 10)
	if err != nil {
		return &SmsRequestResult{
			Success: false,
			Code:    SmsInvalidInput,
			Message: "Internal error generating code.",
		}
	}

	challenge := &storedChallenge{
		ID:           newUUID(),
		Email:        email,
		Phone:        phone,
		EmailHash:    emailHash,
		PhoneHash:    phoneHash,
		CodeHash:     string(codeHash),
		Status:       ChallengePending,
		AttemptCount: 0,
		ExpiresAtMs:  nowMs + 5*60*1000,
		CreatedAtMs:  nowMs,
	}

	s.phoneSendBuckets[phoneHash] = append(s.phoneSendBuckets[phoneHash], nowMs)
	s.emailSendBuckets[emailHash] = append(s.emailSendBuckets[emailHash], nowMs)
	s.globalSends = append(s.globalSends, nowMs)
	s.challenges[challenge.ID] = challenge

	return &SmsRequestResult{
		Success:           true,
		ChallengeID:       challenge.ID,
		ExpiresInSeconds:  300,
		RetryAfterSeconds: 60,
		DebugCode:         code,
	}
}

func (s *SmsChallengeService) VerifyChallenge(input VerifyChallengeInput) *SmsVerifyResult {
	s.mu.Lock()
	defer s.mu.Unlock()

	if input.ChallengeID == "" || !codePattern.MatchString(input.Code) {
		return &SmsVerifyResult{
			Success: false,
			Code:    SmsVerifyInvalidInput,
			Message: "Invalid challenge or code.",
		}
	}

	challenge, ok := s.challenges[input.ChallengeID]
	if !ok {
		return &SmsVerifyResult{
			Success: false,
			Code:    SmsVerifyInvalidInput,
			Message: "Invalid challenge or code.",
		}
	}

	if challenge.Status == ChallengeLocked {
		return &SmsVerifyResult{
			Success: false,
			Code:    SmsChallengeLocked,
			Message: "Challenge is locked.",
		}
	}

	if s.now().UnixMilli() > challenge.ExpiresAtMs {
		challenge.Status = ChallengeExpired
		return &SmsVerifyResult{
			Success: false,
			Code:    SmsChallengeExpired,
			Message: "Challenge expired.",
		}
	}

	if err := bcrypt.CompareHashAndPassword([]byte(challenge.CodeHash), []byte(input.Code)); err != nil {
		challenge.AttemptCount++
		if challenge.AttemptCount >= 5 {
			challenge.Status = ChallengeLocked
			return &SmsVerifyResult{
				Success: false,
				Code:    SmsChallengeLocked,
				Message: "Challenge is locked.",
			}
		}
		return &SmsVerifyResult{
			Success: false,
			Code:    SmsInvalidCode,
			Message: "Invalid verification code.",
		}
	}

	challenge.Status = ChallengeConsumed
	return &SmsVerifyResult{
		Success: true,
		Email:   challenge.Email,
		Phone:   challenge.Phone,
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

var codePattern = regexp.MustCompile(`^\d{6}$`)

func normalizeEmail(e string) string {
	return regexp.MustCompile(`\s+`).ReplaceAllString(e, "")
	// Note: full lowercasing is done by the caller or added here if needed
}

func normalizePhone(p string) string {
	re := regexp.MustCompile(`[\s-]`)
	return re.ReplaceAllString(p, "")
}

func HashValue(v string) string {
	h := sha256.Sum256([]byte(v))
	return hex.EncodeToString(h[:])
}

func makeCode() string {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "000000"
	}
	return fmt.Sprintf("%06d", n.Int64())
}

func newUUID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func isValidEmail(e string) bool {
	return regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`).MatchString(e)
}

func isValidPhone(p string) bool {
	return regexp.MustCompile(`^\+\d{8,15}$`).MatchString(p)
}

func (s *SmsChallengeService) pruneBuckets(nowMs int64) {
	tenMin := nowMs - 10*60*1000
	oneHour := nowMs - 60*60*1000

	for k, vals := range s.phoneSendBuckets {
		s.phoneSendBuckets[k] = filterInt64(vals, func(v int64) bool { return v >= tenMin })
	}
	for k, vals := range s.emailSendBuckets {
		s.emailSendBuckets[k] = filterInt64(vals, func(v int64) bool { return v >= tenMin })
	}
	s.globalSends = filterInt64(s.globalSends, func(v int64) bool { return v >= oneHour })
}

func filterInt64(s []int64, keep func(int64) bool) []int64 {
	var out []int64
	for _, v := range s {
		if keep(v) {
			out = append(out, v)
		}
	}
	return out
}
