package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SubmissionType string

const (
	SubmissionTypeGuide SubmissionType = "guide"
	SubmissionTypeFood  SubmissionType = "food"
)

type SubmissionStatus string

const (
	SubmissionDraft             SubmissionStatus = "draft"
	SubmissionPendingReview     SubmissionStatus = "pending_review"
	SubmissionAutoRejected      SubmissionStatus = "auto_rejected"
	SubmissionNeedsManualReview SubmissionStatus = "needs_manual_review"
	SubmissionApproved          SubmissionStatus = "approved"
	SubmissionPublished         SubmissionStatus = "published"
	SubmissionRejected          SubmissionStatus = "rejected"
	SubmissionRemoved           SubmissionStatus = "removed"
)

// GuideSubmissionPayload mirrors TS GuideSubmissionPayload.
type GuideSubmissionPayload struct {
	Title       string   `bson:"title" json:"title"`
	Destination string   `bson:"destination" json:"destination"`
	Days        int      `bson:"days" json:"days"`
	Budget      float64  `bson:"budget" json:"budget"`
	Content     string   `bson:"content" json:"content"`
	Image       string   `bson:"image" json:"image"`
	Tags        []string `bson:"tags" json:"tags"`
}

// FoodSubmissionPayload mirrors TS FoodSubmissionPayload.
type FoodSubmissionPayload struct {
	Name        string   `bson:"name" json:"name"`
	Province    string   `bson:"province" json:"province"`
	City        string   `bson:"city" json:"city"`
	Address     string   `bson:"address" json:"address"`
	Type        string   `bson:"type" json:"type"`
	Price       string   `bson:"price" json:"price"`
	Description string   `bson:"description" json:"description"`
	Image       string   `bson:"image" json:"image"`
	Tags        []string `bson:"tags" json:"tags"`
}

// Submission is stored as raw BSON so polymorphic payload works without generics.
type Submission struct {
	ID                primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Type              SubmissionType      `bson:"type" json:"type"`
	Author            string              `bson:"author" json:"author"`
	AuthorID          *primitive.ObjectID `bson:"authorId,omitempty" json:"-"`
	Payload           any                 `bson:"payload" json:"-"` // raw BSON — decoded per Type
	Status            SubmissionStatus    `bson:"status" json:"status"`
	RiskScore         float64             `bson:"riskScore" json:"riskScore"`
	RiskLabels        []string            `bson:"riskLabels" json:"riskLabels"`
	ModerationReason  string              `bson:"moderationReason,omitempty" json:"-"`
	PublishedItemID   *primitive.ObjectID `bson:"publishedItemId,omitempty" json:"-"`
	PublishedItemModel string             `bson:"publishedItemModel,omitempty" json:"-"`
	ReviewedBy        *primitive.ObjectID `bson:"reviewedBy,omitempty" json:"-"`
	ReviewedAt        *time.Time          `bson:"reviewedAt,omitempty" json:"-"`
	CreatedAt         time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt         time.Time           `bson:"updatedAt" json:"updatedAt"`
}

// DecodePayload unmarshals the polymorphic payload into the correct type.
func (s *Submission) DecodePayload() (any, error) {
	// The BSON driver stores Payload as bson.M / bson.D when inserted;
	// in practice we return it directly and let service code cast it.
	return s.Payload, nil
}
