# Gorm Guide and Submission Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move guide submission, review, publishing, and personal-center reads to MySQL through Gin, Gorm repositories, and an atomic moderation service.

**Architecture:** Add SQL-facing view models and repositories without changing existing Mongo services. New Gorm workflow services compose repositories and expose the current API response shapes. In MySQL mode `main` registers Gorm-specific handlers for guide, moderation, and submission routes, while Mongo authentication and unrelated food workflows remain in place.

**Tech Stack:** Go 1.22, Gin, Gorm, MySQL 8.4, standard `testing` package, `encoding/json`.

---

## File Structure

- Modify `backend/internal/model/gorm_models.go`: store transitional Mongo owner/admin identifiers as strings.
- Create `backend/internal/model/gorm_views.go`: safe API view models and conversion helpers for Gorm rows.
- Create `backend/internal/repository/gorm_guide.go`: published-guide persistence and reads.
- Create `backend/internal/repository/gorm_submission.go`: submission persistence, personal list, review queue, and row locking.
- Create `backend/internal/repository/gorm_moderation_log.go`: immutable audit-log writes.
- Create `backend/internal/service/gorm_guide_workflow.go`: submission creation and public guide read workflow.
- Create `backend/internal/service/gorm_moderation_workflow.go`: transaction-scoped approval and rejection workflow.
- Create `backend/internal/handler/gorm_guide.go`, `gorm_submission.go`, `gorm_moderation.go`: MySQL-mode route handlers retaining the existing JSON fields.
- Modify `backend/cmd/server/main.go`: select the Gorm route set when `DB_DRIVER=mysql`.

### Task 1: Transitional SQL Models and Safe Views

**Files:**
- Modify: `backend/internal/model/gorm_models.go`
- Create: `backend/internal/model/gorm_views.go`
- Create: `backend/internal/model/gorm_views_test.go`

- [ ] **Step 1: Write the failing view conversion tests**

```go
func TestGormGuideToPublicDecodesJSONFields(t *testing.T) {
	guide := GormGuide{ID: 42, TagsJSON: `["徒步"]`, RiskLabelsJSON: `["manual_review"]`}
	got, err := GormGuideToPublic(guide)
	if err != nil || got.ID != "42" || got.Tags[0] != "徒步" {
		t.Fatalf("public guide = %#v, err = %v", got, err)
	}
}

func TestGormSubmissionToViewIncludesRejectedReason(t *testing.T) {
	row := GormSubmission{ID: 7, Type: "guide", Status: "rejected", ModerationReason: "图片不合规"}
	got, err := GormSubmissionToView(row)
	if err != nil || got.ID != "7" || got.ModerationReason != "图片不合规" {
		t.Fatalf("submission = %#v, err = %v", got, err)
	}
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `go test ./internal/model -run 'TestGorm(GuideToPublic|SubmissionToView)' -v`

Expected: FAIL because `GormGuideToPublic` and `GormSubmissionToView` do not exist.

- [ ] **Step 3: Add transition-safe ownership fields and views**

Change `GormGuide.AuthorID`, `GormSubmission.AuthorID`, `GormSubmission.ReviewedBy`, and `GormModerationLog.AdminID` to nullable `*string` fields. Add `GormGuideView`/`GormSubmissionView` with string IDs and JSON decoding through `encoding/json`; never expose `PayloadJSON` in the personal-center view.

```go
type GormSubmissionView struct {
	ID                string `json:"id"`
	Type              string `json:"type"`
	Author            string `json:"author"`
	Status            string `json:"status"`
	RiskScore         float64 `json:"riskScore"`
	RiskLabels        []string `json:"riskLabels"`
	ModerationReason  string `json:"moderationReason,omitempty"`
	PublishedItemID   string `json:"publishedItemId,omitempty"`
	PublishedItemModel string `json:"publishedItemModel,omitempty"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}
```

- [ ] **Step 4: Run the model tests**

Run: `go test ./internal/model -v`

Expected: PASS.

### Task 2: Gorm Guide and Submission Repositories

**Files:**
- Create: `backend/internal/repository/gorm_guide.go`
- Create: `backend/internal/repository/gorm_submission.go`
- Create: `backend/internal/repository/gorm_repository_test.go`

- [ ] **Step 1: Write repository contract tests using a fake Gorm executor**

```go
func TestSubmissionRepositoryListByAuthorUsesNewestFirst(t *testing.T) {
	repo := NewGormSubmissionRepository(db)
	_, err := repo.ListByAuthor(context.Background(), "507f1f77bcf86cd799439011")
	if err != nil { t.Fatal(err) }
	// SQL mock expectation asserts WHERE author_id = ? and ORDER BY created_at DESC.
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `go test ./internal/repository -run TestSubmissionRepositoryListByAuthorUsesNewestFirst -v`

Expected: FAIL because the repository package does not exist.

- [ ] **Step 3: Implement focused repository methods**

Implement `ListPublished`, `Create`, `FindByIDForUpdate`, `CreateSubmission`, `ListByAuthor`, `ListReviewQueue`, and `Update`. Use `db.WithContext(ctx)`, `clause.Locking{Strength: "UPDATE"}` for decisions, and explicit `created_at DESC` ordering. Repository methods return Gorm rows, not HTTP responses.

- [ ] **Step 4: Run repository tests**

Run: `go test ./internal/repository -v`

Expected: PASS.

### Task 3: User Submission and Public Guide Workflow

**Files:**
- Create: `backend/internal/service/gorm_guide_workflow.go`
- Create: `backend/internal/service/gorm_guide_workflow_test.go`

- [ ] **Step 1: Write failing workflow tests**

```go
func TestSubmitGuideCreatesNonPublicSubmission(t *testing.T) {
	svc := NewGormGuideWorkflow(fakeGuideRepo, fakeSubmissionRepo, fixedModeration)
	sub, err := svc.SubmitGuide(context.Background(), payload, "张三", "507f1f77bcf86cd799439011")
	if err != nil { t.Fatal(err) }
	if sub.Status == "published" { t.Fatal("submission was published before review") }
	if fakeGuideRepo.createCalls != 0 { t.Fatal("guide created before approval") }
}
```

- [ ] **Step 2: Verify the test fails**

Run: `go test ./internal/service -run TestSubmitGuideCreatesNonPublicSubmission -v`

Expected: FAIL because `NewGormGuideWorkflow` does not exist.

- [ ] **Step 3: Implement guide workflow**

Run moderation before writing. Marshal `GuideSubmissionPayload` and labels with `json.Marshal`; write a `GormSubmission` with the moderation status. Implement `ListPublished` by repository query and view conversion, and `GetUserSubmissions` with author-scoped results.

- [ ] **Step 4: Run workflow tests**

Run: `go test ./internal/service -run 'Test(SubmitGuideCreatesNonPublicSubmission|GormGuideWorkflow)' -v`

Expected: PASS.

### Task 4: Atomic Gorm Moderation Workflow

**Files:**
- Create: `backend/internal/repository/gorm_moderation_log.go`
- Create: `backend/internal/service/gorm_moderation_workflow.go`
- Create: `backend/internal/service/gorm_moderation_workflow_test.go`

- [ ] **Step 1: Write failing approval and rejection tests**

```go
func TestApproveGuidePublishesExactlyOnce(t *testing.T) {
	result, err := svc.Decide(ctx, "12", "guide", security.ModDecisionApprove, "审核通过", "admin-mongo-id", "127.0.0.1")
	if err != nil { t.Fatal(err) }
	if result.Submission.Status != "published" || result.PublishedGuideID == "" { t.Fatal("not published") }
	if fakeGuideRepo.createCalls != 1 || fakeLogRepo.createCalls != 1 { t.Fatal("transactional writes missing") }
}

func TestRejectGuideKeepsSubmissionAndDoesNotCreateGuide(t *testing.T) {
	result, err := svc.Decide(ctx, "12", "guide", security.ModDecisionReject, "内容不完整", "admin-mongo-id", "127.0.0.1")
	if err != nil { t.Fatal(err) }
	if result.Submission.Status != "rejected" || fakeGuideRepo.createCalls != 0 { t.Fatal("rejection handling is wrong") }
}
```

- [ ] **Step 2: Verify the tests fail**

Run: `go test ./internal/service -run 'Test(ApproveGuidePublishesExactlyOnce|RejectGuideKeepsSubmissionAndDoesNotCreateGuide)' -v`

Expected: FAIL because `GormModerationWorkflow` does not exist.

- [ ] **Step 3: Implement transaction-scoped decisions**

Use `db.WithContext(ctx).Transaction`. Lock the submission row, validate `type` and `ResolveSubmissionReviewAction`, then:

```go
if decision == security.ModDecisionApprove {
	payload, err := model.DecodeGormGuidePayload(sub.PayloadJSON)
	if err != nil { return err }
	guide, err := guideRepo.Create(tx, model.NewPublishedGormGuide(payload, sub))
	if err != nil { return err }
	sub.Status = string(model.SubmissionPublished)
	sub.PublishedItemID = &guide.ID
	sub.PublishedItemModel = "Guide"
} else {
	sub.Status = string(model.SubmissionRejected)
}
```

Set reviewer, timestamp, reason, and update the submission. Write one moderation log in the same transaction. Map invalid transitions to a service conflict error.

- [ ] **Step 4: Run service tests**

Run: `go test ./internal/service -run 'Test(ApproveGuidePublishesExactlyOnce|RejectGuideKeepsSubmissionAndDoesNotCreateGuide|GormModeration)' -v`

Expected: PASS.

### Task 5: MySQL Gin Handlers and Route Selection

**Files:**
- Create: `backend/internal/handler/gorm_guide.go`
- Create: `backend/internal/handler/gorm_submission.go`
- Create: `backend/internal/handler/gorm_moderation.go`
- Create: `backend/internal/handler/gorm_workflow_test.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Write failing handler tests**

```go
func TestGormPersonalSubmissionsShowsRejectedReason(t *testing.T) {
	r := gin.New()
	NewGormSubmissionHandler(fakeWorkflow).RegisterRoutes(r)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/users/mongo-user/submissions", nil))
	if !strings.Contains(w.Body.String(), `"moderationReason":"图片不合规"`) { t.Fatal(w.Body.String()) }
}
```

- [ ] **Step 2: Verify the tests fail**

Run: `go test ./internal/handler -run TestGormPersonalSubmissionsShowsRejectedReason -v`

Expected: FAIL because `NewGormSubmissionHandler` does not exist.

- [ ] **Step 3: Add API-compatible handlers**

Register `GET /guides`, `POST /guides/submit`, `GET /guides/pending`, `GET /users/:userId/submissions`, `GET /moderation/queue`, and `POST /moderation/items/:id/decision`. Preserve success wrappers and field names. Parse the existing Mongo `adminId` from Gin context as a string. Reject action updates the submission rather than calling delete.

- [ ] **Step 4: Select the route set in MySQL mode**

Keep the existing Mongo handlers for non-MySQL mode. In MySQL mode construct Gorm repositories/workflows from the already-open `gormDB`, register Gorm guide/submission/moderation handlers, and retain Mongo auth middleware so existing admin login continues to work.

- [ ] **Step 5: Run handler and server tests**

Run: `go test ./internal/handler ./cmd/server -v`

Expected: PASS.

### Task 6: Migration Verification

**Files:**
- Modify: `backend/.env.example`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add optional MySQL test DSN documentation**

Add `MYSQL_TEST_DSN` as an explicitly optional integration-test value. Do not put a production password in it.

- [ ] **Step 2: Run focused unit tests**

Run: `go test ./internal/model ./internal/repository ./internal/service ./internal/handler ./cmd/server`

Expected: PASS without a live MySQL server.

- [ ] **Step 3: Run optional MySQL transaction test**

Run: `$env:MYSQL_TEST_DSN='...'; go test ./internal/service -run TestGormModerationMySQLTransaction -v`

Expected: PASS only against an isolated MySQL schema; verify rejected submissions remain and failed approval transactions create no guide.

## Self-Review

- Spec coverage: Tasks cover safe owner-ID migration, MySQL repositories, guide submission, transactional approval/rejection, audit logs, public guide reads, personal-center queries, unchanged API contracts, and verification.
- Placeholder scan: No implementation step relies on an unstated status transition or deletion behavior.
- Type consistency: SQL ownership fields use `*string`; API IDs are strings; the existing Mongo ID remains only in authentication context and is never parsed as a SQL numeric key.
