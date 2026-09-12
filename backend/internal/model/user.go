package model

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// UserRole matches the enum in the TS User model.
type UserRole string

const (
	RoleUser  UserRole = "user"
	RoleAdmin UserRole = "admin"
)

// User is the MongoDB document model, mirroring src/lib/database/models/User.ts.
type User struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name            string             `bson:"name" json:"name"`
	Email           string             `bson:"email" json:"email"`
	Password        string             `bson:"password" json:"-"` // never serialised
	Role            UserRole           `bson:"role" json:"role"`
	PhoneEncrypted  string             `bson:"phoneEncrypted,omitempty" json:"-"`
	PhoneHash       string             `bson:"phoneHash,omitempty" json:"-"`
	PhoneVerifiedAt *time.Time         `bson:"phoneVerifiedAt,omitempty" json:"-"`
	AvatarAssetID   string             `bson:"avatarAssetId,omitempty" json:"-"`
	LastLoginAt     *time.Time         `bson:"lastLoginAt,omitempty" json:"lastLoginAt,omitempty"`
	CreatedAt       time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// PublicUser is the safe JSON payload sent to clients (no password/phone).
type PublicUser struct {
	ID     string   `json:"id"`
	Email  string   `json:"email"`
	Name   string   `json:"name"`
	Avatar string   `json:"avatar"`
	Role   UserRole `json:"role"`
}

// ToPublic converts a User document to its public representation.
func (u *User) ToPublic() PublicUser {
	return PublicUser{
		ID:     u.ID.Hex(),
		Email:  u.Email,
		Name:   u.Name,
		Avatar: "/api/users/" + u.ID.Hex() + "/avatar",
		Role:   u.Role,
	}
}

// UserCollection returns a typed handle for the "users" collection.
func UserCollection(db *mongo.Database) *mongo.Collection {
	return db.Collection("users")
}

// EnsureUserIndexes creates the unique email index and sparse phoneHash index.
func EnsureUserIndexes(ctx context.Context, db *mongo.Database) error {
	coll := UserCollection(db)

	if _, err := coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	}); err != nil {
		return err
	}

	if _, err := coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "phoneHash", Value: 1}},
		Options: options.Index().SetUnique(true).SetSparse(true),
	}); err != nil {
		return err
	}

	return nil
}
