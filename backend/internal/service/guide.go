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

type GuideService struct {
	db      *mongo.Database
	cache   *cache.MemoryCache
	sf      *cache.SingleflightGroup
	nullTTL time.Duration
}

func NewGuideService(db *mongo.Database, memCache *cache.MemoryCache, sf *cache.SingleflightGroup, nullTTL time.Duration) *GuideService {
	return &GuideService{
		db:      db,
		cache:   memCache,
		sf:      sf,
		nullTTL: nullTTL,
	}
}

func (s *GuideService) cacheKey(suffix string) string {
	return "guide:" + suffix
}

func (s *GuideService) ListPublished(ctx context.Context) ([]model.PublicGuide, error) {
	key := s.cacheKey("list_published")

	if v, ok := s.cache.Get(key); ok {
		if cache.IsNull(v) {
			return nil, nil
		}
		return v.([]model.PublicGuide), nil
	}

	v, err, _ := s.sf.Do(key, func() (any, error) {
		coll := s.db.Collection("guides")
		cursor, err := coll.Find(ctx, bson.M{"status": model.GuidePublished},
			optionsFind().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
		if err != nil {
			return nil, fmt.Errorf("list guides: %w", err)
		}
		defer cursor.Close(ctx)

		var guides []model.Guide
		if err := cursor.All(ctx, &guides); err != nil {
			return nil, fmt.Errorf("decode guides: %w", err)
		}

		result := make([]model.PublicGuide, len(guides))
		for i, g := range guides {
			result[i] = g.ToPublic()
		}

		if len(result) == 0 {
			s.cache.SetNull(key, s.nullTTL)
		} else {
			s.cache.Set(key, result)
		}
		return result, nil
	})

	if err != nil {
		return nil, err
	}
	return v.([]model.PublicGuide), nil
}

func (s *GuideService) CreateAdmin(ctx context.Context, guide model.Guide) (*model.PublicGuide, error) {
	coll := s.db.Collection("guides")
	now := time.Now()
	guide.CreatedAt = now
	guide.UpdatedAt = now
	if guide.Status == "" {
		guide.Status = model.GuidePublished
	}
	if guide.Source == "" {
		guide.Source = model.GuideSourceAdmin
	}

	res, err := coll.InsertOne(ctx, guide)
	if err != nil {
		return nil, fmt.Errorf("insert guide: %w", err)
	}
	guide.ID = res.InsertedID.(primitive.ObjectID)

	s.cache.Delete(s.cacheKey("list_published"))

	pub := guide.ToPublic()
	return &pub, nil
}

func (s *GuideService) UpdateStatus(ctx context.Context, id string, statusStr string) (*model.PublicGuide, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid id: %w", err)
	}

	coll := s.db.Collection("guides")
	var guide model.Guide
	if err := coll.FindOne(ctx, bson.M{"_id": oid}).Decode(&guide); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("guide not found")
		}
		return nil, fmt.Errorf("find guide: %w", err)
	}

	decision := mapStatusToDecision(statusStr)
	if decision == "" {
		return nil, fmt.Errorf("invalid status value")
	}

	curStatus := mapGuideToModStatus(guide.Status)
	next := security.ApplyModerationDecision(curStatus, decision)
	if next == nil {
		return nil, fmt.Errorf("invalid status transition")
	}

	guide.Status = mapModToGuideStatus(*next)
	guide.ModerationReason = statusStr
	guide.UpdatedAt = time.Now()

	if _, err := coll.ReplaceOne(ctx, bson.M{"_id": oid}, guide); err != nil {
		return nil, fmt.Errorf("update guide: %w", err)
	}

	s.cache.Delete(s.cacheKey("list_published"))

	pub := guide.ToPublic()
	return &pub, nil
}

func (s *GuideService) SubmitAsUser(ctx context.Context, payload model.GuideSubmissionPayload, author string, authorID *primitive.ObjectID) (*model.Submission, error) {
	mod := security.ModerateSubmission(security.ModerationInput{
		Title:    payload.Title,
		Body:     payload.Content,
		ImageURL: payload.Image,
	})

	sub := model.Submission{
		Type:             model.SubmissionTypeGuide,
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

	coll := s.db.Collection("submissions")
	res, err := coll.InsertOne(ctx, sub)
	if err != nil {
		return nil, fmt.Errorf("insert submission: %w", err)
	}
	sub.ID = res.InsertedID.(primitive.ObjectID)
	return &sub, nil
}

// ── Status mapping helpers ───────────────────────────────────────────────────

func mapGuideToModStatus(s model.GuideStatus) security.ModeratedContentStatus {
	return security.ModeratedContentStatus(s)
}

func mapModToGuideStatus(s security.ModeratedContentStatus) model.GuideStatus {
	return model.GuideStatus(s)
}
