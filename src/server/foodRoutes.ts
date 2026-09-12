import { type Request, type Router } from 'express';
import Food, { type IFood } from '../lib/database/models/Food';
import Submission, { type FoodSubmissionPayload, type ISubmission } from '../lib/database/models/Submission';
import { DEFAULT_FOOD_IMAGE } from '../lib/database/seedFoods';
import {
  applyModerationDecision,
  moderateSubmission,
  type ModeratedContentStatus,
} from './security/moderationService';
import { normalizeOptionalObjectId } from './security/mongoIdentity';

function toPublicFood(doc: IFood) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    province: doc.province,
    city: doc.city,
    address: doc.address,
    rating: doc.rating,
    reviews: doc.reviews,
    type: doc.type,
    image: doc.image,
    price: doc.price,
    description: doc.description,
    tags: doc.tags,
    reviewsList: doc.reviewsList,
    author: doc.author,
    status: doc.status,
    source: doc.source,
    riskScore: doc.riskScore,
    riskLabels: doc.riskLabels,
  };
}

function toSubmittedFood(doc: ISubmission) {
  const payload = doc.payload as FoodSubmissionPayload;
  return {
    id: doc._id.toString(),
    name: payload.name,
    province: payload.province,
    city: payload.city,
    address: payload.address,
    rating: 0,
    reviews: 0,
    type: payload.type,
    image: payload.image,
    price: payload.price,
    description: payload.description,
    tags: payload.tags,
    reviewsList: [],
    author: doc.author,
    status: doc.status,
    source: 'user' as const,
    riskScore: doc.riskScore,
    riskLabels: doc.riskLabels,
  };
}

function isAdmin(req: Request): boolean {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return false;
  return req.headers['x-admin-key'] === adminKey;
}

function parseTags(tags?: string | string[]): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((t) => t.trim()).filter(Boolean);
  return tags
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatPrice(price: number | string): string {
  if (typeof price === 'string') {
    return price.includes('¥') ? price : `¥${price}/人`;
  }
  return `¥${price}/人`;
}

export function registerFoodRoutes(router: Router) {
  router.get('/api/foods', async (_req, res) => {
    try {
      const foods = await Food.find({ status: 'published' }).sort({ rating: -1, createdAt: -1 });
      return res.json({ success: true, foods: foods.map(toPublicFood) });
    } catch (error) {
      console.error('获取美食列表失败:', error);
      return res.status(500).json({ success: false, message: '获取美食失败，请稍后重试' });
    }
  });

  router.get('/api/foods/pending', async (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: '无管理员权限' });
    }

    try {
      const foods = await Submission.find({ type: 'food', status: 'pending_review' }).sort({
        createdAt: -1,
      });
      return res.json({ success: true, foods: foods.map(toSubmittedFood) });
    } catch (error) {
      console.error('获取待审核美食失败:', error);
      return res.status(500).json({ success: false, message: '获取待审核美食失败' });
    }
  });

  router.post('/api/foods/submit', async (req, res) => {
    try {
      const {
        name,
        province,
        city,
        address,
        type,
        price,
        description,
        author,
        authorId,
        image,
        tags,
      } = req.body as {
        name?: string;
        province?: string;
        city?: string;
        address?: string;
        type?: string;
        price?: number | string;
        description?: string;
        author?: string;
        authorId?: string;
        image?: string;
        tags?: string | string[];
      };

      if (
        !name?.trim() ||
        !province?.trim() ||
        !city?.trim() ||
        !address?.trim() ||
        !type?.trim() ||
        !description?.trim() ||
        !author?.trim()
      ) {
        return res.status(400).json({ success: false, message: '请填写完整的美食信息' });
      }

      if (price === undefined || price === '') {
        return res.status(400).json({ success: false, message: '请填写人均消费' });
      }

      const moderation = moderateSubmission({
        title: name.trim(),
        body: description.trim(),
        imageUrl: image?.trim(),
      });

      const payload: FoodSubmissionPayload = {
        name: name.trim(),
        province: province.trim(),
        city: city.trim(),
        address: address.trim(),
        type: type.trim(),
        price: formatPrice(price),
        description: description.trim(),
        image: image?.trim() || DEFAULT_FOOD_IMAGE,
        tags: parseTags(tags),
      };

      const submission = await Submission.create({
        type: 'food',
        author: author.trim(),
        authorId: normalizeOptionalObjectId(authorId),
        payload,
        status: moderation.status,
        riskScore: moderation.riskScore,
        riskLabels: moderation.riskLabels,
        moderationReason: moderation.riskLabels.join(',') || 'submitted_for_review',
      });

      return res.status(201).json({
        success: true,
        submission: toSubmittedFood(submission),
        food: toSubmittedFood(submission),
        message: '投稿成功，审核通过后将展示在美食板块',
      });
    } catch (error) {
      console.error('用户美食投稿失败:', error);
      return res.status(500).json({ success: false, message: '投稿失败，请稍后重试' });
    }
  });

  router.post('/api/foods', async (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: '无管理员权限' });
    }

    try {
      const {
        name,
        province,
        city,
        address,
        type,
        price,
        description,
        image,
        tags,
        rating,
        reviews,
        reviewsList,
      } = req.body as {
        name?: string;
        province?: string;
        city?: string;
        address?: string;
        type?: string;
        price?: number | string;
        description?: string;
        image?: string;
        tags?: string | string[];
        rating?: number;
        reviews?: number;
        reviewsList?: IFood['reviewsList'];
      };

      if (
        !name?.trim() ||
        !province?.trim() ||
        !city?.trim() ||
        !address?.trim() ||
        !type?.trim() ||
        !description?.trim()
      ) {
        return res.status(400).json({ success: false, message: '请填写完整的美食信息' });
      }

      if (price === undefined || price === '') {
        return res.status(400).json({ success: false, message: '请填写人均消费' });
      }

      const food = await Food.create({
        name: name.trim(),
        province: province.trim(),
        city: city.trim(),
        address: address.trim(),
        type: type.trim(),
        price: formatPrice(price),
        description: description.trim(),
        author: 'VoyageX 官方',
        image: image?.trim() || DEFAULT_FOOD_IMAGE,
        tags: parseTags(tags),
        rating: rating ?? 4.5,
        reviews: reviews ?? 0,
        reviewsList: reviewsList ?? [],
        status: 'published',
        source: 'admin',
      });

      return res.status(201).json({
        success: true,
        food: toPublicFood(food),
        message: '美食已发布',
      });
    } catch (error) {
      console.error('管理员发布美食失败:', error);
      return res.status(500).json({ success: false, message: '发布失败，请稍后重试' });
    }
  });

  router.patch('/api/foods/:id/status', async (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: '无管理员权限' });
    }

    try {
      const { status } = req.body as { status?: 'approved' | 'published' | 'rejected' | 'removed' };
      const food = await Food.findById(req.params.id);
      if (!food) {
        return res.status(404).json({ success: false, message: '美食不存在' });
      }

      const decision =
        status === 'approved'
          ? 'approve'
          : status === 'published'
            ? 'publish'
            : status === 'removed'
              ? 'remove'
              : status === 'rejected'
                ? 'reject'
                : null;
      const nextStatus = decision
        ? applyModerationDecision(food.status as ModeratedContentStatus, decision)
        : null;

      if (!nextStatus) {
        return res.status(400).json({ success: false, message: '无效的状态值' });
      }

      food.status = nextStatus;
      food.moderationReason = status || 'status_update';
      await food.save();

      return res.json({
        success: true,
        food: toPublicFood(food),
        message: nextStatus === 'published' ? '美食已发布' : '美食状态已更新',
      });
    } catch (error) {
      console.error('更新美食状态失败:', error);
      return res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
    }
  });
}
