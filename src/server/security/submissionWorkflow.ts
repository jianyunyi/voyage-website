import type mongoose from 'mongoose';
import type {
  FoodSubmissionPayload,
  GuideSubmissionPayload,
  SubmissionStatus,
} from '../../lib/database/models/Submission';
import {
  resolveModerationAction,
  type ModerationAdminDecision,
} from './moderationService';

export type { FoodSubmissionPayload, GuideSubmissionPayload };

export interface PublishedContentInput<TPayload> {
  payload: TPayload;
  author: string;
  authorId?: mongoose.Types.ObjectId;
  riskScore: number;
  riskLabels: string[];
  moderationReason?: string;
}

export function resolveSubmissionReviewAction(
  currentStatus: SubmissionStatus,
  decision: ModerationAdminDecision
) {
  return resolveModerationAction(currentStatus, decision);
}

export function buildPublishedGuideFromSubmission({
  payload,
  author,
  authorId,
  riskScore,
  riskLabels,
  moderationReason,
}: PublishedContentInput<GuideSubmissionPayload>) {
  return {
    title: payload.title,
    author,
    authorId,
    destination: payload.destination,
    days: payload.days,
    budget: payload.budget,
    content: payload.content,
    image: payload.image,
    tags: payload.tags,
    status: 'published' as const,
    source: 'user' as const,
    riskScore,
    riskLabels,
    moderationReason: moderationReason || 'admin_approved',
  };
}

export function buildPublishedFoodFromSubmission({
  payload,
  author,
  authorId,
  riskScore,
  riskLabels,
  moderationReason,
}: PublishedContentInput<FoodSubmissionPayload>) {
  return {
    name: payload.name,
    province: payload.province,
    city: payload.city,
    address: payload.address,
    type: payload.type,
    price: payload.price,
    description: payload.description,
    author,
    authorId,
    image: payload.image,
    tags: payload.tags,
    rating: 0,
    reviews: 0,
    reviewsList: [],
    status: 'published' as const,
    source: 'user' as const,
    riskScore,
    riskLabels,
    moderationReason: moderationReason || 'admin_approved',
  };
}
