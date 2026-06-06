import mongoose, { type Document, type Model } from 'mongoose';

export type FoodStatus = 'pending' | 'published' | 'rejected';
export type FoodSource = 'user' | 'admin';

export interface IFoodReview {
  user: string;
  rating: number;
  date: string;
  content: string;
}

export interface IFood extends Document {
  name: string;
  province: string;
  city: string;
  address: string;
  rating: number;
  reviews: number;
  type: string;
  image: string;
  price: string;
  description: string;
  tags: string[];
  reviewsList: IFoodReview[];
  author: string;
  authorId?: mongoose.Types.ObjectId;
  status: FoodStatus;
  source: FoodSource;
  createdAt: Date;
  updatedAt: Date;
}

const foodReviewSchema = new mongoose.Schema<IFoodReview>(
  {
    user: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    date: { type: String, required: true },
    content: { type: String, required: true },
  },
  { _id: true }
);

const foodSchema = new mongoose.Schema<IFood>(
  {
    name: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    type: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    price: { type: String, required: true },
    description: { type: String, required: true },
    tags: { type: [String], default: [] },
    reviewsList: { type: [foodReviewSchema], default: [] },
    author: { type: String, required: true, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'published', 'rejected'],
      default: 'pending',
    },
    source: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

const Food: Model<IFood> =
  (mongoose.models.Food as Model<IFood>) || mongoose.model<IFood>('Food', foodSchema);

export default Food;
