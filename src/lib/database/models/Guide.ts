import mongoose, { type Document, type Model } from 'mongoose';

export type GuideStatus =
  | 'draft'
  | 'pending_review'
  | 'auto_rejected'
  | 'needs_manual_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'removed';
export type GuideSource = 'user' | 'admin';

export interface IGuide extends Document {
  title: string;
  author: string;
  authorId?: mongoose.Types.ObjectId;
  destination: string;
  days: number;
  budget: number;
  likes: number;
  image: string;
  tags: string[];
  content: string;
  status: GuideStatus;
  source: GuideSource;
  riskScore: number;
  riskLabels: string[];
  moderationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const guideSchema = new mongoose.Schema<IGuide>(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    destination: { type: String, required: true, trim: true },
    days: { type: Number, required: true, min: 1 },
    budget: { type: Number, required: true, min: 0 },
    likes: { type: Number, default: 0 },
    image: { type: String, required: true },
    tags: { type: [String], default: [] },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'draft',
        'pending_review',
        'auto_rejected',
        'needs_manual_review',
        'approved',
        'published',
        'rejected',
        'removed',
      ],
      default: 'pending_review',
    },
    source: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    riskScore: { type: Number, default: 0 },
    riskLabels: { type: [String], default: [] },
    moderationReason: { type: String },
  },
  { timestamps: true }
);

const Guide: Model<IGuide> =
  (mongoose.models.Guide as Model<IGuide>) || mongoose.model<IGuide>('Guide', guideSchema);

export default Guide;
