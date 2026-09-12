package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── Food Review ──────────────────────────────────────────────────────────────

type FoodReview struct {
	User    string  `bson:"user" json:"user"`
	Rating  float64 `bson:"rating" json:"rating"`
	Date    string  `bson:"date" json:"date"`
	Content string  `bson:"content" json:"content"`
}

// ── Food ─────────────────────────────────────────────────────────────────────

type FoodStatus string

const (
	FoodDraft             FoodStatus = "draft"
	FoodPendingReview     FoodStatus = "pending_review"
	FoodAutoRejected      FoodStatus = "auto_rejected"
	FoodNeedsManualReview FoodStatus = "needs_manual_review"
	FoodApproved          FoodStatus = "approved"
	FoodPublished         FoodStatus = "published"
	FoodRejected          FoodStatus = "rejected"
	FoodRemoved           FoodStatus = "removed"
)

type FoodSource string

const (
	FoodSourceUser  FoodSource = "user"
	FoodSourceAdmin FoodSource = "admin"
)

type Food struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name             string             `bson:"name" json:"name"`
	Province         string             `bson:"province" json:"province"`
	City             string             `bson:"city" json:"city"`
	Address          string             `bson:"address" json:"address"`
	Rating           float64            `bson:"rating" json:"rating"`
	Reviews          int                `bson:"reviews" json:"reviews"`
	Type             string             `bson:"type" json:"type"`
	Image            string             `bson:"image" json:"image"`
	Price            string             `bson:"price" json:"price"`
	Description      string             `bson:"description" json:"description"`
	Tags             []string           `bson:"tags" json:"tags"`
	ReviewsList      []FoodReview       `bson:"reviewsList" json:"reviewsList"`
	Author           string             `bson:"author" json:"author"`
	AuthorID         *primitive.ObjectID `bson:"authorId,omitempty" json:"-"`
	Status           FoodStatus         `bson:"status" json:"status"`
	Source           FoodSource         `bson:"source" json:"source"`
	RiskScore        float64            `bson:"riskScore" json:"riskScore"`
	RiskLabels       []string           `bson:"riskLabels" json:"riskLabels"`
	ModerationReason string             `bson:"moderationReason,omitempty" json:"-"`
	CreatedAt        time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt        time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type PublicFood struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Province    string       `json:"province"`
	City        string       `json:"city"`
	Address     string       `json:"address"`
	Rating      float64      `json:"rating"`
	Reviews     int          `json:"reviews"`
	Type        string       `json:"type"`
	Image       string       `json:"image"`
	Price       string       `json:"price"`
	Description string       `json:"description"`
	Tags        []string     `json:"tags"`
	ReviewsList []FoodReview `json:"reviewsList"`
	Author      string       `json:"author"`
	Status      FoodStatus   `json:"status"`
	Source      FoodSource   `json:"source"`
	RiskScore   float64      `json:"riskScore"`
	RiskLabels  []string     `json:"riskLabels"`
}

func (f *Food) ToPublic() PublicFood {
	return PublicFood{
		ID:          f.ID.Hex(),
		Name:        f.Name,
		Province:    f.Province,
		City:        f.City,
		Address:     f.Address,
		Rating:      f.Rating,
		Reviews:     f.Reviews,
		Type:        f.Type,
		Image:       f.Image,
		Price:       f.Price,
		Description: f.Description,
		Tags:        f.Tags,
		ReviewsList: f.ReviewsList,
		Author:      f.Author,
		Status:      f.Status,
		Source:      f.Source,
		RiskScore:   f.RiskScore,
		RiskLabels:  f.RiskLabels,
	}
}
