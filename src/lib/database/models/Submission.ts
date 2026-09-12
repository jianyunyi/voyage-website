import mongoose, { type Document, type Model } from 'mongoose';

export type SubmissionType = 'guide' | 'food';

export type SubmissionStatus =
  | 'draft'
  | 'pending_review'
  | 'auto_rejected'
  | 'needs_manual_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'removed';

export interface GuideSubmissionPayload {
  title: string;
  destination: string;
  days: number;
  budget: number;
  content: string;
  image: string;
  tags: string[];
}

export interface FoodSubmissionPayload {
  name: string;
  province: string;
  city: string;
  address: string;
  type: string;
  price: string;
  description: string;
  image: string;
  tags: string[];
}

export type SubmissionPayload = GuideSubmissionPayload | FoodSubmissionPayload;

export interface ISubmission extends Document {
  type: SubmissionType;
  author: string;
  authorId?: mongoose.Types.ObjectId;
  payload: SubmissionPayload;
  status: SubmissionStatus;
  riskScore: number;
  riskLabels: string[];
  moderationReason?: string;
  publishedItemId?: mongoose.Types.ObjectId;
  publishedItemModel?: 'Guide' | 'Food';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isValidPayload(type: SubmissionType, value: SubmissionPayload): boolean {
  if (!value || typeof value !== 'object') return false;

  if (type === 'guide') {
    const payload = value as GuideSubmissionPayload;
    return (
      isString(payload.title) &&
      isString(payload.destination) &&
      Number.isFinite(payload.days) &&
      payload.days >= 1 &&
      Number.isFinite(payload.budget) &&
      payload.budget >= 0 &&
      isString(payload.content) &&
      isString(payload.image) &&
      isStringArray(payload.tags)
    );
  }

  const payload = value as FoodSubmissionPayload;
  return (
    isString(payload.name) &&
    isString(payload.province) &&
    isString(payload.city) &&
    isString(payload.address) &&
    isString(payload.type) &&
    isString(payload.price) &&
    isString(payload.description) &&
    isString(payload.image) &&
    isStringArray(payload.tags)
  );
}

const submissionSchema = new mongoose.Schema<ISubmission>(
  {
    type: {
      type: String,
      enum: ['guide', 'food'],
      required: true,
    },
    author: { type: String, required: true, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
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
    riskScore: { type: Number, default: 0 },
    riskLabels: { type: [String], default: [] },
    moderationReason: { type: String },
    publishedItemId: { type: mongoose.Schema.Types.ObjectId },
    publishedItemModel: { type: String, enum: ['Guide', 'Food'] },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

submissionSchema.pre('validate', function validatePayload() {
  if (!isValidPayload(this.type, this.payload)) {
    throw new Error('Invalid submission payload.');
  }
});

submissionSchema.index({ authorId: 1, createdAt: -1 });
submissionSchema.index({ type: 1, status: 1, createdAt: -1 });

const Submission: Model<ISubmission> =
  (mongoose.models.Submission as Model<ISubmission>) ||
  mongoose.model<ISubmission>('Submission', submissionSchema);

export default Submission;
