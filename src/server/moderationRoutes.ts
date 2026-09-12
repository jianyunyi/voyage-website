import { type Request, type Router } from 'express';
import Guide from '../lib/database/models/Guide';
import Food from '../lib/database/models/Food';
import User from '../lib/database/models/User';
import Submission, {
  type FoodSubmissionPayload,
  type GuideSubmissionPayload,
  type ISubmission,
  type SubmissionStatus,
} from '../lib/database/models/Submission';
import {
  type ModerationAdminDecision,
} from './security/moderationService';
import {
  buildPublishedFoodFromSubmission,
  buildPublishedGuideFromSubmission,
  resolveSubmissionReviewAction,
} from './security/submissionWorkflow';

async function getAdminUserId(req: Request) {
  const adminKey = process.env.ADMIN_KEY;
  if (adminKey && req.headers['x-admin-key'] === adminKey) return null;

  const rawUserId = req.headers['x-user-id'];
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  if (!userId) return false;

  const user = await User.findById(userId).select('role');
  return user?.role === 'admin' ? user._id : false;
}

async function isAdmin(req: Request): Promise<boolean> {
  return (await getAdminUserId(req)) !== false;
}

function normalizeType(type: unknown): 'guide' | 'food' | null {
  return type === 'guide' || type === 'food' ? type : null;
}

function toQueueItem(doc: ISubmission) {
  if (doc.type === 'guide') {
    const payload = doc.payload as GuideSubmissionPayload;
    return {
      id: doc._id.toString(),
      type: 'guide' as const,
      title: payload.title,
      author: doc.author,
      destination: payload.destination,
      image: payload.image,
      status: doc.status,
      riskScore: doc.riskScore ?? 0,
      riskLabels: doc.riskLabels ?? [],
      submittedAt: doc.createdAt,
    };
  }

  const payload = doc.payload as FoodSubmissionPayload;
  return {
    id: doc._id.toString(),
    type: 'food' as const,
    title: payload.name,
    author: doc.author,
    destination: payload.city,
    image: payload.image,
    status: doc.status,
    riskScore: doc.riskScore ?? 0,
    riskLabels: doc.riskLabels ?? [],
    submittedAt: doc.createdAt,
  };
}

export function registerModerationRoutes(router: Router) {
  router.get('/api/moderation/queue', async (req, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ success: false, message: 'Admin permission required.' });
    }

    const type = normalizeType(req.query.type);
    const status = ((req.query.status as string | undefined) ?? 'pending_review') as SubmissionStatus;
    const query = {
      ...(type ? { type } : {}),
      status,
    };
    const submissions = await Submission.find(query).sort({ createdAt: -1 });

    return res.json({
      success: true,
      items: submissions.map(toQueueItem),
    });
  });

  router.post('/api/moderation/items/:id/decision', async (req, res) => {
    const adminUserId = await getAdminUserId(req);
    if (adminUserId === false) {
      return res.status(403).json({ success: false, message: 'Admin permission required.' });
    }

    const type = normalizeType(req.body.type);
    const decision = req.body.decision as ModerationAdminDecision | undefined;
    if (!type || !decision) {
      return res.status(400).json({ success: false, message: 'Invalid moderation decision.' });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission || submission.type !== type) {
      return res.status(404).json({ success: false, message: 'Moderation item not found.' });
    }

    const resolved = resolveSubmissionReviewAction(submission.status, decision);
    if (!resolved) {
      return res.status(400).json({ success: false, message: 'Decision is not allowed for current status.' });
    }

    if (resolved.action === 'delete') {
      await submission.deleteOne();
      return res.json({
        success: true,
        item: {
          id: req.params.id,
          type,
          status: 'deleted',
        },
      });
    }

    if (resolved.action === 'publish') {
      const created =
        submission.type === 'guide'
          ? await Guide.create(
              buildPublishedGuideFromSubmission({
                payload: submission.payload as GuideSubmissionPayload,
                author: submission.author,
                authorId: submission.authorId,
                riskScore: submission.riskScore,
                riskLabels: submission.riskLabels,
                moderationReason: req.body.reason || decision,
              })
            )
          : await Food.create(
              buildPublishedFoodFromSubmission({
                payload: submission.payload as FoodSubmissionPayload,
                author: submission.author,
                authorId: submission.authorId,
                riskScore: submission.riskScore,
                riskLabels: submission.riskLabels,
                moderationReason: req.body.reason || decision,
              })
            );

      submission.status = 'published';
      submission.moderationReason = req.body.reason || decision;
      submission.publishedItemId = created._id;
      submission.publishedItemModel = submission.type === 'guide' ? 'Guide' : 'Food';
      submission.reviewedBy = adminUserId || undefined;
      submission.reviewedAt = new Date();
      await submission.save();

      return res.json({
        success: true,
        item: {
          id: submission._id.toString(),
          type,
          status: submission.status,
          publishedItemId: created._id.toString(),
          riskScore: submission.riskScore ?? 0,
          riskLabels: submission.riskLabels ?? [],
        },
      });
    }

    submission.status = resolved.nextStatus;
    submission.moderationReason = req.body.reason || decision;
    submission.reviewedBy = adminUserId || undefined;
    submission.reviewedAt = new Date();
    await submission.save();

    return res.json({
      success: true,
      item: {
        id: submission._id.toString(),
        type,
        status: submission.status,
        riskScore: submission.riskScore ?? 0,
        riskLabels: submission.riskLabels ?? [],
      },
    });
  });
}
