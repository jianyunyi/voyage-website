package model

import "time"

type GormUser struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	Name            string     `gorm:"size:80;not null" json:"name"`
	Email           string     `gorm:"size:191;uniqueIndex;not null" json:"email"`
	Password        string     `gorm:"size:255;not null" json:"-"`
	Role            string     `gorm:"size:20;not null;default:user" json:"role"`
	PhoneEncrypted  string     `gorm:"size:512" json:"-"`
	PhoneHash       string     `gorm:"size:128;uniqueIndex" json:"-"`
	PhoneVerifiedAt *time.Time `json:"-"`
	AvatarAssetID   string     `gorm:"size:64" json:"-"`
	LastLoginAt     *time.Time `json:"lastLoginAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

type GormGuide struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Title            string    `gorm:"size:255;not null;index" json:"title"`
	Author           string    `gorm:"size:80;not null" json:"author"`
	AuthorID         *string   `gorm:"size:64;index" json:"-"`
	Destination      string    `gorm:"size:120;not null;index" json:"destination"`
	Days             int       `gorm:"not null" json:"days"`
	Budget           float64   `gorm:"not null" json:"budget"`
	Likes            int       `gorm:"not null;default:0" json:"likes"`
	Image            string    `gorm:"size:1024;not null" json:"image"`
	TagsJSON         string    `gorm:"type:json" json:"-"`
	Content          string    `gorm:"type:text;not null" json:"content"`
	Status           string    `gorm:"size:40;not null;index" json:"status"`
	Source           string    `gorm:"size:20;not null;index" json:"source"`
	RiskScore        float64   `gorm:"not null;default:0" json:"riskScore"`
	RiskLabelsJSON   string    `gorm:"type:json" json:"-"`
	ModerationReason string    `gorm:"size:255" json:"-"`
	CreatedAt        time.Time `gorm:"index" json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type GormFood struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Name             string    `gorm:"size:255;not null;index" json:"name"`
	Province         string    `gorm:"size:80;not null;index" json:"province"`
	City             string    `gorm:"size:80;not null;index" json:"city"`
	Address          string    `gorm:"size:255;not null" json:"address"`
	Rating           float64   `gorm:"not null;default:0" json:"rating"`
	Reviews          int       `gorm:"not null;default:0" json:"reviews"`
	Type             string    `gorm:"size:80;not null;index" json:"type"`
	Image            string    `gorm:"size:1024;not null" json:"image"`
	Price            string    `gorm:"size:80;not null" json:"price"`
	Description      string    `gorm:"type:text;not null" json:"description"`
	TagsJSON         string    `gorm:"type:json" json:"-"`
	ReviewsJSON      string    `gorm:"type:json" json:"-"`
	Author           string    `gorm:"size:80;not null" json:"author"`
	AuthorID         *uint     `gorm:"index" json:"-"`
	Status           string    `gorm:"size:40;not null;index" json:"status"`
	Source           string    `gorm:"size:20;not null;index" json:"source"`
	RiskScore        float64   `gorm:"not null;default:0" json:"riskScore"`
	RiskLabelsJSON   string    `gorm:"type:json" json:"-"`
	ModerationReason string    `gorm:"size:255" json:"-"`
	CreatedAt        time.Time `gorm:"index" json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type GormSubmission struct {
	ID                 uint       `gorm:"primaryKey" json:"id"`
	Type               string     `gorm:"size:20;not null;index:idx_submission_queue" json:"type"`
	Author             string     `gorm:"size:80;not null" json:"author"`
	AuthorID           *string    `gorm:"size:64;index" json:"-"`
	PayloadJSON        string     `gorm:"type:json;not null" json:"-"`
	Status             string     `gorm:"size:40;not null;index:idx_submission_queue" json:"status"`
	RiskScore          float64    `gorm:"not null;default:0" json:"riskScore"`
	RiskLabelsJSON     string     `gorm:"type:json" json:"-"`
	ModerationReason   string     `gorm:"size:255" json:"-"`
	PublishedItemID    *uint      `gorm:"index" json:"-"`
	PublishedItemModel string     `gorm:"size:40" json:"-"`
	ReviewedBy         *string    `gorm:"size:64;index" json:"-"`
	ReviewedAt         *time.Time `json:"-"`
	CreatedAt          time.Time  `gorm:"index:idx_submission_queue" json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
}

type GormFavorite struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;uniqueIndex:idx_favorite_user_item" json:"userId"`
	ItemID    string    `gorm:"size:64;not null;uniqueIndex:idx_favorite_user_item" json:"itemId"`
	ItemType  string    `gorm:"size:20;not null;index" json:"itemType"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type GormAvatarAsset struct {
	ID               uint       `gorm:"primaryKey" json:"id"`
	AssetID          string     `gorm:"size:64;uniqueIndex;not null" json:"assetId"`
	OwnerID          uint       `gorm:"not null;index" json:"ownerId"`
	FileName         string     `gorm:"size:255;not null" json:"fileName"`
	MimeType         string     `gorm:"size:80;not null" json:"mimeType"`
	SizeBytes        int64      `gorm:"not null" json:"sizeBytes"`
	Status           string     `gorm:"size:40;not null;index" json:"status"`
	PrivateObjectKey string     `gorm:"size:512;not null" json:"-"`
	PublicObjectKey  string     `gorm:"size:512" json:"-"`
	RejectionReason  string     `gorm:"size:255" json:"rejectionReason,omitempty"`
	ReviewedAt       *time.Time `json:"-"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

type GormIdempotencyKey struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	Key          string     `gorm:"size:128;uniqueIndex;not null" json:"key"`
	Fingerprint  string     `gorm:"size:191;not null;index" json:"fingerprint"`
	Method       string     `gorm:"size:16;not null" json:"method"`
	Path         string     `gorm:"size:255;not null" json:"path"`
	UserID       *uint      `gorm:"index" json:"userId,omitempty"`
	Status       string     `gorm:"size:40;not null;index" json:"status"`
	ResponseCode int        `json:"responseCode"`
	ResponseBody string     `gorm:"type:longtext" json:"-"`
	LockedUntil  *time.Time `json:"-"`
	ExpiresAt    time.Time  `gorm:"index" json:"expiresAt"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type GormModerationLog struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	SubmissionID *uint     `gorm:"index" json:"submissionId,omitempty"`
	ItemID       *uint     `gorm:"index" json:"itemId,omitempty"`
	ItemModel    string    `gorm:"size:40;index" json:"itemModel"`
	AdminID      *string   `gorm:"size:64;index" json:"adminId,omitempty"`
	Action       string    `gorm:"size:40;not null;index" json:"action"`
	Reason       string    `gorm:"size:255" json:"reason"`
	FromStatus   string    `gorm:"size:40" json:"fromStatus"`
	ToStatus     string    `gorm:"size:40" json:"toStatus"`
	IP           string    `gorm:"size:64" json:"ip"`
	CreatedAt    time.Time `gorm:"index" json:"createdAt"`
}

type GormUserPreference struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	UserID           uint      `gorm:"uniqueIndex;not null" json:"userId"`
	DestinationsJSON string    `gorm:"type:json" json:"-"`
	TravelTypesJSON  string    `gorm:"type:json" json:"-"`
	FoodSpiciness    string    `gorm:"size:40;not null;default:不限" json:"foodSpiciness"`
	FoodFlavorsJSON  string    `gorm:"type:json" json:"-"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

func (GormUser) TableName() string { return "users" }

func (GormGuide) TableName() string { return "guides" }

func (GormFood) TableName() string { return "foods" }

func (GormSubmission) TableName() string { return "submissions" }

func (GormFavorite) TableName() string { return "favorites" }

func (GormAvatarAsset) TableName() string { return "avatar_assets" }

func (GormIdempotencyKey) TableName() string { return "idempotency_keys" }

func (GormModerationLog) TableName() string { return "moderation_logs" }

func (GormUserPreference) TableName() string { return "user_preferences" }

func GormMigrationModels() []any {
	return []any{
		&GormUser{},
		&GormGuide{},
		&GormFood{},
		&GormSubmission{},
		&GormFavorite{},
		&GormAvatarAsset{},
		&GormIdempotencyKey{},
		&GormModerationLog{},
		&GormUserPreference{},
	}
}
