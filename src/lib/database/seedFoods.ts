import Food from './models/Food';
import { foodRecommendations } from '../../data/mockData';

export const DEFAULT_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800';

export async function seedFoodsIfEmpty(): Promise<void> {
  const count = await Food.countDocuments();
  if (count > 0) return;

  const seedData = foodRecommendations.map((food) => ({
    name: food.name,
    province: food.province,
    city: food.city,
    address: food.address,
    rating: food.rating,
    reviews: food.reviews,
    type: food.type,
    image: food.image,
    price: food.price,
    description: food.description,
    tags: food.tags,
    reviewsList: food.reviewsList,
    author: 'VoyageX 官方',
    status: 'published' as const,
    source: 'admin' as const,
  }));

  await Food.insertMany(seedData);
  console.log(`已初始化 ${seedData.length} 条官方美食数据`);
}
