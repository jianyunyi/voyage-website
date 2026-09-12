import { type Request, type Response, type Router } from 'express';
import Guide, { type IGuide } from '../lib/database/models/Guide';
import Submission, { type GuideSubmissionPayload, type ISubmission } from '../lib/database/models/Submission';
import { DEFAULT_IMAGE } from '../lib/database/seedGuides';
import {
  applyModerationDecision,
  moderateSubmission,
  type ModeratedContentStatus,
} from './security/moderationService';
import { normalizeOptionalObjectId } from './security/mongoIdentity';

function toPublicGuide(doc: IGuide) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    author: doc.author,
    destination: doc.destination,
    days: doc.days,
    budget: doc.budget,
    likes: doc.likes,
    image: doc.image,
    tags: doc.tags,
    content: doc.content,
    status: doc.status,
    source: doc.source,
    riskScore: doc.riskScore,
    riskLabels: doc.riskLabels,
  };
}

function toSubmittedGuide(doc: ISubmission) {
  const payload = doc.payload as GuideSubmissionPayload;
  return {
    id: doc._id.toString(),
    title: payload.title,
    author: doc.author,
    destination: payload.destination,
    days: payload.days,
    budget: payload.budget,
    likes: 0,
    image: payload.image,
    tags: payload.tags,
    content: payload.content,
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

export function registerGuideRoutes(router: Router) {
  router.get('/api/guides', async (_req, res) => {
    try {
      const guides = await Guide.find({ status: 'published' }).sort({ createdAt: -1 });
      return res.json({ success: true, guides: guides.map(toPublicGuide) });
    } catch (error) {
      console.error('获取攻略列表失败:', error);
      return res.status(500).json({ success: false, message: '获取攻略失败，请稍后重试' });
    }
  });

  router.get('/api/guides/pending', async (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: '无管理员权限' });
    }

    try {
      const guides = await Submission.find({ type: 'guide', status: 'pending_review' }).sort({
        createdAt: -1,
      });
      return res.json({ success: true, guides: guides.map(toSubmittedGuide) });
    } catch (error) {
      console.error('获取待审核攻略失败:', error);
      return res.status(500).json({ success: false, message: '获取待审核攻略失败' });
    }
  });

  router.post('/api/guides/submit', async (req, res) => {
    try {
      const { title, destination, days, budget, content, author, authorId, image, tags } =
        req.body as {
          title?: string;
          destination?: string;
          days?: number;
          budget?: number;
          content?: string;
          author?: string;
          authorId?: string;
          image?: string;
          tags?: string | string[];
        };

      if (!title?.trim() || !destination?.trim() || !content?.trim() || !author?.trim()) {
        return res.status(400).json({ success: false, message: '请填写完整的攻略信息' });
      }

      if (!days || days < 1 || budget === undefined || budget < 0) {
        return res.status(400).json({ success: false, message: '请填写有效的天数和预算' });
      }

      const moderation = moderateSubmission({
        title: title.trim(),
        body: content.trim(),
        imageUrl: image?.trim(),
      });

      const payload: GuideSubmissionPayload = {
        title: title.trim(),
        destination: destination.trim(),
        days,
        budget,
        content: content.trim(),
        image: image?.trim() || DEFAULT_IMAGE,
        tags: parseTags(tags),
      };

      const submission = await Submission.create({
        type: 'guide',
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
        submission: toSubmittedGuide(submission),
        guide: toSubmittedGuide(submission),
        message: '投稿成功，审核通过后将展示在攻略板块',
      });
    } catch (error) {
      console.error('用户投稿失败:', error);
      return res.status(500).json({ success: false, message: '投稿失败，请稍后重试' });
    }
  });

  router.post('/api/guides', async (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: '无管理员权限' });
    }

    try {
      const { title, destination, days, budget, content, author, image, tags } = req.body as {
        title?: string;
        destination?: string;
        days?: number;
        budget?: number;
        content?: string;
        author?: string;
        image?: string;
        tags?: string | string[];
      };

      if (!title?.trim() || !destination?.trim() || !content?.trim()) {
        return res.status(400).json({ success: false, message: '请填写完整的攻略信息' });
      }

      if (!days || days < 1 || budget === undefined || budget < 0) {
        return res.status(400).json({ success: false, message: '请填写有效的天数和预算' });
      }

      const guide = await Guide.create({
        title: title.trim(),
        author: author?.trim() || 'VoyageX 官方',
        destination: destination.trim(),
        days,
        budget,
        content: content.trim(),
        image: image?.trim() || DEFAULT_IMAGE,
        tags: parseTags(tags),
        status: 'published',
        source: 'admin',
      });

      return res.status(201).json({
        success: true,
        guide: toPublicGuide(guide),
        message: '攻略已发布',
      });
    } catch (error) {
      console.error('管理员发布攻略失败:', error);
      return res.status(500).json({ success: false, message: '发布失败，请稍后重试' });
    }
  });

  router.patch('/api/guides/:id/status', async (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: '无管理员权限' });
    }

    try {
      const { status } = req.body as { status?: 'approved' | 'published' | 'rejected' | 'removed' };
      const guide = await Guide.findById(req.params.id);
      if (!guide) {
        return res.status(404).json({ success: false, message: '攻略不存在' });
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
        ? applyModerationDecision(guide.status as ModeratedContentStatus, decision)
        : null;

      if (!nextStatus) {
        return res.status(400).json({ success: false, message: '无效的状态值' });
      }

      guide.status = nextStatus;
      guide.moderationReason = status || 'status_update';
      await guide.save();

      return res.json({
        success: true,
        guide: toPublicGuide(guide),
        message: nextStatus === 'published' ? '攻略已发布' : '攻略状态已更新',
      });
    } catch (error) {
      console.error('更新攻略状态失败:', error);
      return res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
    }
  });
}
