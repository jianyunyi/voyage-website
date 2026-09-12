'use client';

import { useState, useEffect } from 'react';
import { Star, MapPin, BookOpen, Calendar, ThumbsUp, Search, Clock, DollarSign } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useFavorites } from '@/lib/favorites';
import type { PublicGuide, GuideListResponse } from '@/lib/api';

export default function GuidesPage() {
  const [guides, setGuides] = useState<PublicGuide[]>([]);
  const [search, setSearch] = useState('');
  const { toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    apiGet<GuideListResponse>('/api/guides').then(r => { if (r.success) setGuides(r.guides); }).catch(() => {});
  }, []);

  const filtered = guides.filter((g) => {
    if (search && !g.title.includes(search) && !g.destination.includes(search) && !g.content.includes(search)) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">旅行攻略</h1>
        <p className="text-gray-500">来自旅行者的真实经验分享</p>
      </div>

      {/* Search */}
      <div className="relative mb-10 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text" placeholder="搜索目的地、攻略..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all"
        />
      </div>

      {/* Guide Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((guide) => (
          <div key={guide.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row">
            <div className="sm:w-72 aspect-[4/3] sm:aspect-auto overflow-hidden">
              <img src={guide.image} alt={guide.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg text-gray-900 group-hover:text-orange-600 transition-colors">{guide.title}</h3>
                <button onClick={() => toggleFavorite({ id: guide.id, type: 'guide', title: guide.title, image: guide.image })}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-all flex-shrink-0">
                  <ThumbsUp className={`w-4 h-4 ${isFavorite(guide.id) ? 'text-orange-600 fill-orange-600' : 'text-gray-400'}`} />
                </button>
              </div>

              <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">{guide.content}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{guide.destination}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{guide.days}天</span>
                <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />¥{guide.budget.toLocaleString()}</span>
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{guide.author}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {guide.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">{tag}</span>
                  ))}
                </div>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />{guide.likes}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <p className="font-medium">暂无攻略</p>
        </div>
      )}
    </div>
  );
}
