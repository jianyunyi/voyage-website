package service

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
	"voyagex-backend/internal/model"
)

var (
	ErrEmailTaken       = errors.New("email already taken")
	ErrUserNotFound     = errors.New("user not found")
	ErrInvalidPassword  = errors.New("invalid password")
	ErrPhoneNotMatched  = errors.New("phone hash does not match")
	ErrEncryptionKeyLen = errors.New("phone encryption key must be 64 hex chars (32 bytes)")
)

// AuthService handles user registration, login, and phone encryption.
type AuthService struct {
	db        *mongo.Database
	encKeyHex string // 64 hex chars (32 bytes) for AES-256-GCM
}

func NewAuthService(db *mongo.Database, encKeyHex string) *AuthService {
	return &AuthService{db: db, encKeyHex: encKeyHex}
}

// ── Register ─────────────────────────────────────────────────────────────────

type RegisterInput struct {
	Email    string
	Password string
	Name     string
}

type RegisterResult struct {
	User model.PublicUser
}

func (s *AuthService) Register(ctx context.Context, input RegisterInput) (*RegisterResult, error) {
	coll := model.UserCollection(s.db)

	// Check for existing user
	var existing model.User
	err := coll.FindOne(ctx, bson.M{"email": input.Email}).Decode(&existing)
	if err == nil {
		return nil, ErrEmailTaken
	}
	if !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, fmt.Errorf("db lookup: %w", err)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), 10)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	now := time.Now()
	user := model.User{
		Name:      input.Name,
		Email:     input.Email,
		Password:  string(hashedPassword),
		Role:      model.RoleUser,
		CreatedAt: now,
		UpdatedAt: now,
	}

	result, err := coll.InsertOne(ctx, user)
	if err != nil {
		if isDuplicateKeyError(err) {
			return nil, ErrEmailTaken
		}
		return nil, fmt.Errorf("insert user: %w", err)
	}

	user.ID = result.InsertedID.(primitive.ObjectID)
	return &RegisterResult{User: user.ToPublic()}, nil
}

// ── Login (password) ─────────────────────────────────────────────────────────

type LoginInput struct {
	Email    string
	Password string
}

type LoginResult struct {
	User model.PublicUser
}

func (s *AuthService) Login(ctx context.Context, input LoginInput) (*LoginResult, error) {
	coll := model.UserCollection(s.db)

	var user model.User
	if err := coll.FindOne(ctx, bson.M{"email": input.Email}).Decode(&user); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("find user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return nil, ErrInvalidPassword
	}

	// Update lastLoginAt (non-fatal)
	now := time.Now()
	if _, err := coll.UpdateByID(ctx, user.ID, bson.M{"$set": bson.M{"lastLoginAt": now}}); err != nil {
		log.Printf("failed to update lastLoginAt: %v", err)
	}

	return &LoginResult{User: user.ToPublic()}, nil
}

// ── SMS Verify (after challenge verified) ────────────────────────────────────

type SmsVerifyFinaliseInput struct {
	Email     string
	Phone     string
	PhoneHash string
}

func (s *AuthService) FinaliseSmsLogin(ctx context.Context, input SmsVerifyFinaliseInput) (*LoginResult, error) {
	coll := model.UserCollection(s.db)

	var user model.User
	if err := coll.FindOne(ctx, bson.M{"email": input.Email}).Decode(&user); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("find user: %w", err)
	}

	// Verify phone hash if already set
	if user.PhoneHash != "" && user.PhoneHash != input.PhoneHash {
		return nil, ErrPhoneNotMatched
	}

	// Encrypt phone for storage
	encryptedPhone, err := encryptPhone(input.Phone, s.encKeyHex)
	if err != nil {
		// Dev fallback: store as PLAINTEXT:base64 (same as TS fallback)
		encryptedPhone = "PLAINTEXT:" + base64.StdEncoding.EncodeToString([]byte(input.Phone))
	}

	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"phoneHash":       input.PhoneHash,
			"phoneEncrypted":  encryptedPhone,
			"phoneVerifiedAt": now,
			"lastLoginAt":     now,
		},
	}
	if _, err := coll.UpdateByID(ctx, user.ID, update); err != nil {
		return nil, fmt.Errorf("update user: %w", err)
	}

	return &LoginResult{User: user.ToPublic()}, nil
}

// ── Admin seeding ────────────────────────────────────────────────────────────

func (s *AuthService) EnsureAdmin(ctx context.Context, email, password, name string) error {
	if email == "" || password == "" {
		return nil
	}

	coll := model.UserCollection(s.db)

	var existing model.User
	err := coll.FindOne(ctx, bson.M{"email": email}).Decode(&existing)
	if err == nil {
		if existing.Role != model.RoleAdmin {
			_, err := coll.UpdateByID(ctx, existing.ID, bson.M{"$set": bson.M{"role": model.RoleAdmin}})
			return err
		}
		return nil
	}
	if !errors.Is(err, mongo.ErrNoDocuments) {
		return fmt.Errorf("lookup admin: %w", err)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return fmt.Errorf("hash admin password: %w", err)
	}

	now := time.Now()
	_, err = coll.InsertOne(ctx, model.User{
		Email:     email,
		Password:  string(hashedPassword),
		Name:      name,
		Role:      model.RoleAdmin,
		CreatedAt: now,
		UpdatedAt: now,
	})
	return err
}

// ── Phone encryption (AES-256-GCM, mirrors TS crypto.ts) ─────────────────────

func encryptPhone(plain, keyHex string) (string, error) {
	if len(keyHex) != 64 {
		return "", ErrEncryptionKeyLen
	}

	key := make([]byte, 32)
	if n, err := fmt.Sscanf(keyHex, "%x", &key); err != nil || n != 1 {
		return "", fmt.Errorf("invalid hex key: %w", err)
	}

	iv := make([]byte, 12)
	if _, err := rand.Read(iv); err != nil {
		return "", fmt.Errorf("generate iv: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("new cipher: %w", err)
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("new gcm: %w", err)
	}

	ciphertext := aesgcm.Seal(nil, iv, []byte(plain), nil)
	tagStart := len(ciphertext) - aesgcm.Overhead()
	tag := ciphertext[tagStart:]
	encrypted := ciphertext[:tagStart]

	// Output: base64(iv || tag || encrypted) — same scheme as TS crypto.ts
	out := make([]byte, 0, len(iv)+len(tag)+len(encrypted))
	out = append(out, iv...)
	out = append(out, tag...)
	out = append(out, encrypted...)

	return base64.StdEncoding.EncodeToString(out), nil
}

// ── Internal ─────────────────────────────────────────────────────────────────

func isDuplicateKeyError(err error) bool {
	return strings.Contains(err.Error(), "duplicate key") ||
		strings.Contains(err.Error(), "E11000")
}
