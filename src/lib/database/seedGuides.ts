import Guide from './models/Guide';
import { travelGuides } from '../../data/mockData';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1000';

export async function seedGuidesIfEmpty(): Promise<void> {
  const count = await Guide.countDocuments();
  if (count > 0) return;

  const seedData = travelGuides.map((guide) => ({
    title: guide.title,
    author: guide.author,
    destination: guide.destination,
    days: guide.days,
    budget: guide.budget,
    likes: guide.likes,
    image: guide.image,
    tags: guide.tags,
    content: `${guide.title} — 由 VoyageX 官方整理的精选攻略内容。`,
    status: 'published' as const,
    source: 'admin' as const,
  }));

  await Guide.insertMany(seedData);
  console.log(`已初始化 ${seedData.length} 条官方攻略数据`);
}

export { DEFAULT_IMAGE };
