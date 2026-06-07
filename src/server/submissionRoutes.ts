import mongoose from 'mongoose';
import { type Router } from 'express';
import Guide, { type IGuide } from '../lib/database/models/Guide';
import Food, { type IFood } from '../lib/database/models/Food';
import Favorite, { type FavoriteItemType } from '../lib/database/models/Favorite';

function toOwnerGuide(doc: IGuide, favoritesCount: number) {
  return {
    id: doc._id.toString(),
    type: 'guide' as const,
    title: doc.title,
    author: doc.author,
    destination: doc.destination,
    days: doc.days,
    budget: doc.budget,
    likes: doc.likes,
    favoritesCount,
    image: doc.image,
    tags: doc.tags,
    content: doc.content,
    status: doc.status,
    source: doc.source,
    moderationReason: doc.moderationReason,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    comments: [] as { user: string; content: string; date: string }[],
  };
}

function toOwnerFood(doc: IFood, favoritesCount: number) {
  return {
    id: doc._id.toString(),
    type: 'food' as const,
    title: doc.name,
    name: doc.name,
    province: doc.province,
    city: doc.city,
    address: doc.address,
    rating: doc.rating,
    reviews: doc.reviews,
    favoritesCount,
    typeLabel: doc.type,
    image: doc.image,
    price: doc.price,
    description: doc.description,
    tags: doc.tags,
    status: doc.status,
    source: doc.source,
    moderationReason: doc.moderationReason,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    comments: doc.reviewsList.map((r) => ({
      user: r.user,
      content: r.content,
      date: r.date,
      rating: r.rating,
    })),
  };
}

async function countFavoritesByItems(
  items: { id: string; type: FavoriteItemType }[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (items.length === 0) return counts;

  const itemIds = items.map((i) => i.id);
  const agg = await Favorite.aggregate<{ _id: string; count: number }>([
    { $match: { itemId: { $in: itemIds } } },
    { $group: { _id: '$itemId', count: { $sum: 1 } } },
  ]);

  for (const row of agg) {
    counts.set(row._id, row.count);
  }
  return counts;
}

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending_review: '审核中',
  auto_rejected: '自动拒绝',
  needs_manual_review: '待人工审核',
  approved: '已通过',
  published: '已发布',
  rejected: '已拒绝',
  removed: '已下架',
};

export function registerSubmissionRoutes(router: Router) {
  router.get('/api/users/:userId/submissions', async (req, res) => {
    try {
      const { userId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: '无效的用户 ID' });
      }

      const authorId = new mongoose.Types.ObjectId(userId);
      const [guides, foods] = await Promise.all([
        Guide.find({ authorId }).sort({ createdAt: -1 }),
        Food.find({ authorId }).sort({ createdAt: -1 }),
      ]);

      const favoriteItems = [
        ...guides.map((g) => ({ id: g._id.toString(), type: 'guide' as const })),
        ...foods.map((f) => ({ id: f._id.toString(), type: 'food' as const })),
      ];
      const favoriteCounts = await countFavoritesByItems(favoriteItems);

      const guideSubmissions = guides.map((g) =>
        toOwnerGuide(g, favoriteCounts.get(g._id.toString()) ?? 0)
      );
      const foodSubmissions = foods.map((f) =>
        toOwnerFood(f, favoriteCounts.get(f._id.toString()) ?? 0)
      );

      const all = [...guideSubmissions, ...foodSubmissions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return res.json({
        success: true,
        submissions: all,
        guides: guideSubmissions,
        foods: foodSubmissions,
        statusLabels: STATUS_LABELS,
      });
    } catch (error) {
      console.error('获取用户投稿失败:', error);
      return res.status(500).json({ success: false, message: '获取投稿失败，请稍后重试' });
    }
  });

  router.post('/api/favorites/toggle', async (req, res) => {
    try {
      const { userId, itemId, itemType, favorited } = req.body as {
        userId?: string;
        itemId?: string;
        itemType?: FavoriteItemType;
        favorited?: boolean;
      };

      if (!userId || !itemId || !itemType) {
        return res.status(400).json({ success: false, message: '缺少必要参数' });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: '无效的用户 ID' });
      }

      const validTypes: FavoriteItemType[] = ['guide', 'food', 'hotel', 'route'];
      if (!validTypes.includes(itemType)) {
        return res.status(400).json({ success: false, message: '无效的内容类型' });
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);

      if (favorited) {
        await Favorite.findOneAndUpdate(
          { userId: userObjectId, itemId },
          { $setOnInsert: { itemType } },
          { upsert: true, new: true }
        );
      } else {
        await Favorite.deleteOne({ userId: userObjectId, itemId });
      }

      const favoritesCount = await Favorite.countDocuments({ itemId });

      return res.json({ success: true, favoritesCount });
    } catch (error) {
      console.error('切换收藏状态失败:', error);
      return res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
    }
  });
}
