package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type GuideStatus string

const (
	GuideDraft             GuideStatus = "draft"
	GuidePendingReview     GuideStatus = "pending_review"
	GuideAutoRejected      GuideStatus = "auto_rejected"
	GuideNeedsManualReview GuideStatus = "needs_manual_review"
	GuideApproved          GuideStatus = "approved"
	GuidePublished         GuideStatus = "published"
	GuideRejected          GuideStatus = "rejected"
	GuideRemoved           GuideStatus = "removed"
)

type GuideSource string

const (
	GuideSourceUser  GuideSource = "user"
	GuideSourceAdmin GuideSource = "admin"
)

type Guide struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title            string             `bson:"title" json:"title"`
	Author           string             `bson:"author" json:"author"`
	AuthorID         *primitive.ObjectID `bson:"authorId,omitempty" json:"-"`
	Destination      string             `bson:"destination" json:"destination"`
	Days             int                `bson:"days" json:"days"`
	Budget           float64            `bson:"budget" json:"budget"`
	Likes            int                `bson:"likes" json:"likes"`
	Image            string             `bson:"image" json:"image"`
	Tags             []string           `bson:"tags" json:"tags"`
	Content          string             `bson:"content" json:"content"`
	Status           GuideStatus        `bson:"status" json:"status"`
	Source           GuideSource        `bson:"source" json:"source"`
	RiskScore        float64            `bson:"riskScore" json:"riskScore"`
	RiskLabels       []string           `bson:"riskLabels" json:"riskLabels"`
	ModerationReason string             `bson:"moderationReason,omitempty" json:"-"`
	CreatedAt        time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt        time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type PublicGuide struct {
	ID          string      `json:"id"`
	Title       string      `json:"title"`
	Author      string      `json:"author"`
	Destination string      `json:"destination"`
	Days        int         `json:"days"`
	Budget      float64     `json:"budget"`
	Likes       int         `json:"likes"`
	Image       string      `json:"image"`
	Tags        []string    `json:"tags"`
	Content     string      `json:"content"`
	Status      GuideStatus `json:"status"`
	Source      GuideSource `json:"source"`
	RiskScore   float64     `json:"riskScore"`
	RiskLabels  []string    `json:"riskLabels"`
}

func (g *Guide) ToPublic() PublicGuide {
	return PublicGuide{
		ID:          g.ID.Hex(),
		Title:       g.Title,
		Author:      g.Author,
		Destination: g.Destination,
		Days:        g.Days,
		Budget:      g.Budget,
		Likes:       g.Likes,
		Image:       g.Image,
		Tags:        g.Tags,
		Content:     g.Content,
		Status:      g.Status,
		Source:      g.Source,
		RiskScore:   g.RiskScore,
		RiskLabels:  g.RiskLabels,
	}
}
