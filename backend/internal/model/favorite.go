package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FavoriteItemType string

const (
	FavGuide FavoriteItemType = "guide"
	FavFood  FavoriteItemType = "food"
	FavHotel FavoriteItemType = "hotel"
	FavRoute FavoriteItemType = "route"
)

type Favorite struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"userId" json:"userId"`
	ItemID    string             `bson:"itemId" json:"itemId"`
	ItemType  FavoriteItemType   `bson:"itemType" json:"itemType"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}
