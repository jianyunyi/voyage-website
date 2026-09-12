package service

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"voyagex-backend/internal/model"
)

type SubmissionService struct {
	db *mongo.Database
}

func NewSubmissionService(db *mongo.Database) *SubmissionService {
	return &SubmissionService{db: db}
}

// GetUserSubmissions returns all submissions for a user, sorted newest first.
func (s *SubmissionService) GetUserSubmissions(ctx context.Context, userID primitive.ObjectID) ([]model.Submission, error) {
	coll := s.db.Collection("submissions")
	cursor, err := coll.Find(ctx, bson.M{"authorId": userID},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		return nil, fmt.Errorf("find submissions: %w", err)
	}
	defer cursor.Close(ctx)

	var subs []model.Submission
	if err := cursor.All(ctx, &subs); err != nil {
		return nil, fmt.Errorf("decode submissions: %w", err)
	}
	return subs, nil
}

// ToggleFavorite adds or removes a favorite.
func (s *SubmissionService) ToggleFavorite(ctx context.Context, userID primitive.ObjectID, itemID string, itemType model.FavoriteItemType, favorited bool) (int64, error) {
	favColl := s.db.Collection("favorites")

	if favorited {
		_, err := favColl.UpdateOne(ctx,
			bson.M{"userId": userID, "itemId": itemID},
			bson.M{"$setOnInsert": bson.M{
				"userId":   userID,
				"itemId":   itemID,
				"itemType": itemType,
			}},
			options.Update().SetUpsert(true),
		)
		if err != nil {
			return 0, fmt.Errorf("upsert favorite: %w", err)
		}
	} else {
		_, err := favColl.DeleteOne(ctx, bson.M{"userId": userID, "itemId": itemID})
		if err != nil {
			return 0, fmt.Errorf("delete favorite: %w", err)
		}
	}

	count, err := favColl.CountDocuments(ctx, bson.M{"itemId": itemID})
	if err != nil {
		return 0, fmt.Errorf("count favorites: %w", err)
	}
	return count, nil
}

// ListPendingSubmissions returns submissions in a given status, optionally filtered by type.
func (s *SubmissionService) ListPendingSubmissions(ctx context.Context, status model.SubmissionStatus, subType *model.SubmissionType) ([]model.Submission, error) {
	filter := bson.M{"status": status}
	if subType != nil {
		filter["type"] = *subType
	}

	coll := s.db.Collection("submissions")
	cursor, err := coll.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		return nil, fmt.Errorf("find submissions: %w", err)
	}
	defer cursor.Close(ctx)

	var subs []model.Submission
	if err := cursor.All(ctx, &subs); err != nil {
		return nil, fmt.Errorf("decode submissions: %w", err)
	}
	return subs, nil
}

func (s *SubmissionService) FindSubmission(ctx context.Context, id string) (*model.Submission, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid id: %w", err)
	}

	coll := s.db.Collection("submissions")
	var sub model.Submission
	if err := coll.FindOne(ctx, bson.M{"_id": oid}).Decode(&sub); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("submission not found")
		}
		return nil, fmt.Errorf("find submission: %w", err)
	}
	return &sub, nil
}

func (s *SubmissionService) UpdateSubmission(ctx context.Context, sub *model.Submission) error {
	coll := s.db.Collection("submissions")
	sub.UpdatedAt = time.Now()
	_, err := coll.ReplaceOne(ctx, bson.M{"_id": sub.ID}, sub)
	return err
}

func (s *SubmissionService) DeleteSubmission(ctx context.Context, id primitive.ObjectID) error {
	coll := s.db.Collection("submissions")
	_, err := coll.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// optionsFind is a convenience alias used by food/guide services.
func optionsFind() *options.FindOptions {
	return options.Find()
}
