package service

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"voyagex-backend/internal/cache"
	"voyagex-backend/internal/model"
	"voyagex-backend/internal/security"
)

// FoodService now integrates cache + singleflight for traffic control.
type FoodService struct {
	db      *mongo.Database
	cache   *cache.MemoryCache
	sf      *cache.SingleflightGroup
	nullTTL time.Duration
}

func NewFoodService(db *mongo.Database, memCache *cache.MemoryCache, sf *cache.SingleflightGroup, nullTTL time.Duration) *FoodService {
	return &FoodService{
		db:      db,
		cache:   memCache,
		sf:      sf,
		nullTTL: nullTTL,
	}
}

// cacheKey returns a namespaced cache key for food queries.
func (s *FoodService) cacheKey(suffix string) string {
	return "food:" + suffix
}

// ListPublished returns all published foods with caching + singleflight.
// This defends against:
//   - Cache penetration: null values are cached for s.nullTTL
//   - Cache avalanche: cache entries have random jitter in TTL
//   - Cache breakdown: SingleflightGroup deduplicates concurrent DB hits
func (s *FoodService) ListPublished(ctx context.Context) ([]model.PublicFood, error) {
	key := s.cacheKey("list_published")

	// 1. Try cache first
	if v, ok := s.cache.Get(key); ok {
		if cache.IsNull(v) {
			return nil, nil // known to be empty
		}
		return v.([]model.PublicFood), nil
	}

	// 2. Singleflight — only one goroutine hits MongoDB
	v, err, _ := s.sf.Do(key, func() (any, error) {
		coll := s.db.Collection("foods")
		cursor, err := coll.Find(ctx, bson.M{"status": model.FoodPublished},
			optionsFind().SetSort(bson.D{{Key: "rating", Value: -1}, {Key: "createdAt", Value: -1}}))
		if err != nil {
			return nil, fmt.Errorf("list foods: %w", err)
		}
		defer cursor.Close(ctx)

		var foods []model.Food
		if err := cursor.All(ctx, &foods); err != nil {
			return nil, fmt.Errorf("decode foods: %w", err)
		}

		result := make([]model.PublicFood, len(foods))
		for i, f := range foods {
			result[i] = f.ToPublic()
		}

		// 3. Store in cache
		if len(result) == 0 {
			s.cache.SetNull(key, s.nullTTL) // cache penetration defence
		} else {
			s.cache.Set(key, result)
		}
		return result, nil
	})

	if err != nil {
		return nil, err
	}
	return v.([]model.PublicFood), nil
}

// CreateAdmin inserts a food directly, then invalidates the list cache.
func (s *FoodService) CreateAdmin(ctx context.Context, food model.Food) (*model.PublicFood, error) {
	coll := s.db.Collection("foods")
	now := time.Now()
	food.CreatedAt = now
	food.UpdatedAt = now
	if food.Status == "" {
		food.Status = model.FoodPublished
	}
	if food.Source == "" {
		food.Source = model.FoodSourceAdmin
	}

	res, err := coll.InsertOne(ctx, food)
	if err != nil {
		return nil, fmt.Errorf("insert food: %w", err)
	}
	food.ID = res.InsertedID.(primitive.ObjectID)

	// Invalidate cache so next ListPublished is fresh
	s.cache.Delete(s.cacheKey("list_published"))

	pub := food.ToPublic()
	return &pub, nil
}

// UpdateStatus updates a food's status and invalidates cache.
func (s *FoodService) UpdateStatus(ctx context.Context, id string, statusStr string) (*model.PublicFood, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid id: %w", err)
	}

	coll := s.db.Collection("foods")
	var food model.Food
	if err := coll.FindOne(ctx, bson.M{"_id": oid}).Decode(&food); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("food not found")
		}
		return nil, fmt.Errorf("find food: %w", err)
	}

	decision := mapStatusToDecision(statusStr)
	if decision == "" {
		return nil, fmt.Errorf("invalid status value")
	}

	next := security.ApplyModerationDecision(security.ModeratedContentStatus(food.Status), decision)
	if next == nil {
		return nil, fmt.Errorf("invalid status transition")
	}

	food.Status = model.FoodStatus(*next)
	food.ModerationReason = statusStr
	food.UpdatedAt = time.Now()

	if _, err := coll.ReplaceOne(ctx, bson.M{"_id": oid}, food); err != nil {
		return nil, fmt.Errorf("update food: %w", err)
	}

	s.cache.Delete(s.cacheKey("list_published"))

	pub := food.ToPublic()
	return &pub, nil
}

// SubmitAsUser creates a submission for user-submitted food.
func (s *FoodService) SubmitAsUser(ctx context.Context, payload model.FoodSubmissionPayload, author string, authorID *primitive.ObjectID) (*model.Submission, error) {
	// Keep unchanged — submissions don't affect the published list cache
	mod := security.ModerateSubmission(security.ModerationInput{
		Title:    payload.Name,
		Body:     payload.Description,
		ImageURL: payload.Image,
	})

	sub := model.Submission{
		Type:             model.SubmissionTypeFood,
		Author:           author,
		AuthorID:         authorID,
		Payload:          payload,
		Status:           model.SubmissionStatus(mod.Status),
		RiskScore:        mod.RiskScore,
		RiskLabels:       mod.RiskLabels,
		ModerationReason: joinLabels(mod.RiskLabels, "submitted_for_review"),
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
	return s.createSubmission(ctx, sub)
}

func (s *FoodService) createSubmission(ctx context.Context, sub model.Submission) (*model.Submission, error) {
	coll := s.db.Collection("submissions")
	res, err := coll.InsertOne(ctx, sub)
	if err != nil {
		return nil, fmt.Errorf("insert submission: %w", err)
	}
	sub.ID = res.InsertedID.(primitive.ObjectID)
	return &sub, nil
}

// ── Status helpers ───────────────────────────────────────────────────────────

func mapStatusToDecision(status string) security.ModerationAdminDecision {
	switch status {
	case "approved":
		return security.ModDecisionApprove
	case "published":
		return security.ModDecisionPublish
	case "rejected":
		return security.ModDecisionReject
	case "removed":
		return security.ModDecisionRemove
	}
	return ""
}

func joinLabels(labels []string, fallback string) string {
	if len(labels) > 0 {
		result := ""
		for i, l := range labels {
			if i > 0 {
				result += ","
			}
			result += l
		}
		return result
	}
	return fallback
}
