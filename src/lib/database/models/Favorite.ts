import mongoose, { type Document, type Model } from 'mongoose';

export type FavoriteItemType = 'guide' | 'food' | 'hotel' | 'route';

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  itemId: string;
  itemType: FavoriteItemType;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new mongoose.Schema<IFavorite>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemId: { type: String, required: true },
    itemType: {
      type: String,
      enum: ['guide', 'food', 'hotel', 'route'],
      required: true,
    },
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, itemId: 1 }, { unique: true });
favoriteSchema.index({ itemId: 1, itemType: 1 });

const Favorite: Model<IFavorite> =
  (mongoose.models.Favorite as Model<IFavorite>) ||
  mongoose.model<IFavorite>('Favorite', favoriteSchema);

export default Favorite;
