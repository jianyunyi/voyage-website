package middleware

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// AdminAuth returns middleware that checks x-admin-key header or x-user-id admin role.
func AdminAuth(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		adminKey := os.Getenv("ADMIN_KEY")

		// Check admin key header first
		if adminKey != "" && c.GetHeader("X-Admin-Key") == adminKey {
			c.Set("adminId", primitive.NilObjectID)
			c.Next()
			return
		}

		// Check user ID header + admin role
		rawUserID := c.GetHeader("X-User-Id")
		if rawUserID == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false, "code": "FORBIDDEN", "message": "Admin permission required.",
			})
			return
		}

		oid, err := primitive.ObjectIDFromHex(rawUserID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false, "code": "FORBIDDEN", "message": "Admin permission required.",
			})
			return
		}

		coll := db.Collection("users")
		var result struct {
			Role string `bson:"role"`
		}
		if err := coll.FindOne(c.Request.Context(),
			bson.M{"_id": oid, "role": "admin"},
			options.FindOne().SetProjection(bson.M{"role": 1}),
		).Decode(&result); err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false, "code": "FORBIDDEN", "message": "Admin permission required.",
			})
			return
		}

		c.Set("adminId", oid)
		c.Next()
	}
}
