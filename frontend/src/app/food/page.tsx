'use client';

import { useState, useEffect } from 'react';
import { Star, MapPin, ThumbsUp, Search, ChevronDown } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useFavorites } from '@/lib/favorites';
import type { PublicFood, FoodListResponse } from '@/lib/api';

const foodTypes = ['全部', '川菜', '粤菜', '鲁菜', '苏菜', '浙菜', '湘菜', '闽菜', '徽菜', '日料', '西餐', '东南亚', '小吃甜品'];

export default function FoodPage() {
  const [foods, setFoods] = useState<PublicFood[]>([]);
  const [filter, setFilter] = useState('全部');
  const [search, setSearch] = useState('');
  const { toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    apiGet<FoodListResponse>('/api/foods').then(r => { if (r.success) setFoods(r.foods); }).catch(() => {});
  }, []);

  const filtered = foods.filter((f) => {
    if (filter !== '全部' && f.type !== filter) return false;
    if (search && !f.name.includes(search) && !f.description.includes(search)) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">地道美食</h1>
        <p className="text-gray-500">发现各地的隐藏美食宝藏</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text" placeholder="搜索美食..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all"
          />
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2 mb-10">
        {foodTypes.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === t
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Food Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((food) => (
          <div key={food.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="aspect-[4/3] overflow-hidden relative">
              <img src={food.image} alt={food.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <button onClick={() => toggleFavorite({ id: food.id, type: 'food', title: food.name, image: food.image, rating: food.rating, price: food.price })}
                className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-all">
                <ThumbsUp className={`w-4 h-4 ${isFavorite(food.id) ? 'text-orange-600 fill-orange-600' : 'text-gray-400'}`} />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{food.name}</h3>
                  <p className="text-xs text-gray-400">{food.type}</p>
                </div>
                <span className="text-sm font-bold text-orange-600 whitespace-nowrap">{food.price}</span>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">{food.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{food.city}</span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{food.rating}
                  <span className="text-gray-300 ml-1">({food.reviews})</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {food.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
