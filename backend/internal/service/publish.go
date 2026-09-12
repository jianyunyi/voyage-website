package service

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"voyagex-backend/internal/model"
)

// PublishReviewResult describes the outcome of publishing a submission.
type PublishReviewResult struct {
	Submission      model.Submission
	PublishedItemID primitive.ObjectID
}

// PublishReview converts a submission into a published guide or food.
func (s *SubmissionService) PublishReview(ctx context.Context, sub *model.Submission, adminID *primitive.ObjectID, reason string) (*PublishReviewResult, error) {
	now := time.Now()

	switch sub.Type {
	case model.SubmissionTypeGuide:
		payload, ok := sub.Payload.(model.GuideSubmissionPayload)
		if !ok {
			// Try BSON map fallback
			if m, ok2 := sub.Payload.(primitive.M); ok2 {
				payload = model.GuideSubmissionPayload{
					Title:       toString(m["title"]),
					Destination: toString(m["destination"]),
					Days:        toInt(m["days"]),
					Budget:      toFloat(m["budget"]),
					Content:     toString(m["content"]),
					Image:       toString(m["image"]),
					Tags:        toStringSlice(m["tags"]),
				}
			} else {
				return nil, fmt.Errorf("invalid guide payload type: %T", sub.Payload)
			}
		}

		guide := model.Guide{
			Title:       payload.Title,
			Author:      sub.Author,
			AuthorID:    sub.AuthorID,
			Destination: payload.Destination,
			Days:        payload.Days,
			Budget:      payload.Budget,
			Image:       payload.Image,
			Tags:        payload.Tags,
			Content:     payload.Content,
			Status:      model.GuidePublished,
			Source:      model.GuideSourceUser,
			RiskScore:   sub.RiskScore,
			RiskLabels:  sub.RiskLabels,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		coll := s.db.Collection("guides")
		res, err := coll.InsertOne(ctx, guide)
		if err != nil {
			return nil, fmt.Errorf("insert published guide: %w", err)
		}

		pubID := res.InsertedID.(primitive.ObjectID)
		sub.Status = model.SubmissionPublished
		sub.PublishedItemID = &pubID
		sub.PublishedItemModel = "Guide"
		sub.ReviewedBy = adminID
		sub.ReviewedAt = &now
		sub.ModerationReason = reason
		sub.UpdatedAt = now

		if err := s.UpdateSubmission(ctx, sub); err != nil {
			return nil, err
		}

		return &PublishReviewResult{Submission: *sub, PublishedItemID: pubID}, nil

	case model.SubmissionTypeFood:
		payload, ok := sub.Payload.(model.FoodSubmissionPayload)
		if !ok {
			if m, ok2 := sub.Payload.(primitive.M); ok2 {
				payload = model.FoodSubmissionPayload{
					Name:        toString(m["name"]),
					Province:    toString(m["province"]),
					City:        toString(m["city"]),
					Address:     toString(m["address"]),
					Type:        toString(m["type"]),
					Price:       toString(m["price"]),
					Description: toString(m["description"]),
					Image:       toString(m["image"]),
					Tags:        toStringSlice(m["tags"]),
				}
			} else {
				return nil, fmt.Errorf("invalid food payload type: %T", sub.Payload)
			}
		}

		food := model.Food{
			Name:        payload.Name,
			Province:    payload.Province,
			City:        payload.City,
			Address:     payload.Address,
			Type:        payload.Type,
			Price:       payload.Price,
			Description: payload.Description,
			Author:      sub.Author,
			AuthorID:    sub.AuthorID,
			Image:       payload.Image,
			Tags:        payload.Tags,
			Rating:      0,
			Reviews:     0,
			ReviewsList: []model.FoodReview{},
			Status:      model.FoodPublished,
			Source:      model.FoodSourceUser,
			RiskScore:   sub.RiskScore,
			RiskLabels:  sub.RiskLabels,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		coll := s.db.Collection("foods")
		res, err := coll.InsertOne(ctx, food)
		if err != nil {
			return nil, fmt.Errorf("insert published food: %w", err)
		}

		pubID := res.InsertedID.(primitive.ObjectID)
		sub.Status = model.SubmissionPublished
		sub.PublishedItemID = &pubID
		sub.PublishedItemModel = "Food"
		sub.ReviewedBy = adminID
		sub.ReviewedAt = &now
		sub.ModerationReason = reason
		sub.UpdatedAt = now

		if err := s.UpdateSubmission(ctx, sub); err != nil {
			return nil, err
		}

		return &PublishReviewResult{Submission: *sub, PublishedItemID: pubID}, nil

	default:
		return nil, fmt.Errorf("unknown submission type: %s", sub.Type)
	}

}

// ── BSON map helpers ─────────────────────────────────────────────────────────

func toString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

func toInt(v any) int {
	if v == nil {
		return 0
	}
	switch n := v.(type) {
	case int:
		return n
	case int32:
		return int(n)
	case int64:
		return int(n)
	case float64:
		return int(n)
	default:
		return 0
	}
}

func toFloat(v any) float64 {
	if v == nil {
		return 0
	}
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	case int32:
		return float64(n)
	case int64:
		return float64(n)
	default:
		return 0
	}
}

func toStringSlice(v any) []string {
	if v == nil {
		return nil
	}
	switch s := v.(type) {
	case []string:
		return s
	case primitive.A:
		out := make([]string, len(s))
		for i, item := range s {
			out[i] = fmt.Sprintf("%v", item)
		}
		return out
	default:
		return nil
	}
}
