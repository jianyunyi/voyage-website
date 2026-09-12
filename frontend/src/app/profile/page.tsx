'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart, Trash2, Map, BookOpen, Utensils, Building, User, Settings,
  FileText, ThumbsUp, MessageSquare, Loader2, MapPin, Star, Upload, LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useFavorites } from '@/lib/favorites';
import { usePreferences } from '@/lib/preferences';
import { apiGet } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import type { SubmissionsResponse, Submission } from '@/lib/api';

type Tab = 'favorites' | 'submissions' | 'preferences';

const typeIcons: Record<string, typeof Heart> = {
  guide: BookOpen, food: Utensils, hotel: Building, route: Map,
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { favorites, removeFavorite } = useFavorites();
  const { preferences, updatePreferences } = usePreferences();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('favorites');
  const [filterType, setFilterType] = useState<string>('all');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  useEffect(() => {
    if (tab === 'submissions' && user?.id && submissions.length === 0) {
      setSubmissionsLoading(true);
      apiGet<SubmissionsResponse>(`/api/users/${user.id}/submissions`)
        .then(r => {
          if (r.success) {
            setSubmissions(r.submissions);
            setStatusLabels(r.statusLabels);
          }
        })
        .catch(() => {})
        .finally(() => setSubmissionsLoading(false));
    }
  }, [tab, user?.id]);

  const filteredFavorites = favorites.filter(
    (f) => filterType === 'all' || f.type === filterType
  );

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* ── Profile Header ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <img
                src={user?.avatar || 'https://ui-avatars.com/api/?name=VoyageX&background=random'}
                alt={user?.name}
                className="w-20 h-20 rounded-full border-2 border-gray-100"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-gray-500">{user?.email}</p>
              {user?.role === 'admin' && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded-full font-bold">管理员</span>
              )}
            </div>
            <button onClick={() => { logout(); router.push('/'); }}
              className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="登出">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 max-w-md">
          {([
            { key: 'favorites' as Tab, label: '我的收藏', icon: Heart },
            { key: 'submissions' as Tab, label: '我的投稿', icon: FileText },
            { key: 'preferences' as Tab, label: '偏好设置', icon: Settings },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 flex-1 py-2.5 px-4 text-sm font-bold rounded-lg transition-all ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab: Favorites ────────────────────────────────────────────────── */}
        {tab === 'favorites' && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              {['all', 'guide', 'food', 'hotel', 'route'].map((t) => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filterType === t
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {t === 'all' ? '全部' : t === 'guide' ? '攻略' : t === 'food' ? '美食' : t === 'hotel' ? '酒店' : '路线'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFavorites.map((item) => {
                const Icon = typeIcons[item.type] || Heart;
                return (
                  <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4 group hover:shadow-md transition-shadow">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Icon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate">{item.title}</h4>
                      {item.subtitle && <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {item.rating && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{item.rating}</span>}
                        {item.price && <span>{item.price}</span>}
                      </div>
                    </div>
                    <button onClick={() => removeFavorite(item.id)}
                      className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            {filteredFavorites.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Heart className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="font-medium">暂无收藏</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Submissions ──────────────────────────────────────────────── */}
        {tab === 'submissions' && (
          <div>
            {submissionsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="font-medium">暂无投稿</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        sub.type === 'guide' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {sub.type === 'guide' ? <BookOpen className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{statusLabels[sub.status] || sub.status}</p>
                        <p className="text-xs text-gray-400">{new Date(sub.createdAt).toLocaleDateString('zh-CN')}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sub.status === 'published' ? 'bg-green-50 text-green-600' :
                      sub.status === 'pending_review' ? 'bg-yellow-50 text-yellow-600' :
                      sub.status === 'rejected' ? 'bg-red-50 text-red-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {statusLabels[sub.status] || sub.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Preferences ──────────────────────────────────────────────── */}
        {tab === 'preferences' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">辣度偏好</label>
                <div className="flex gap-2">
                  {['不限', '微辣', '中辣', '重辣'].map((s) => (
                    <button key={s} onClick={() => updatePreferences({ foodSpiciness: s })}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        preferences.foodSpiciness === s
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">口味偏好</label>
                <div className="flex flex-wrap gap-2">
                  {['麻辣', '清淡', '酸甜', '鲜香', '咸鲜', '甜'].map((f) => (
                    <button key={f} onClick={() => {
                      const next = preferences.foodFlavors.includes(f)
                        ? preferences.foodFlavors.filter((x) => x !== f)
                        : [...preferences.foodFlavors, f];
                      updatePreferences({ foodFlavors: next });
                    }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        preferences.foodFlavors.includes(f)
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">旅行类型</label>
                <div className="flex flex-wrap gap-2">
                  {['自由行', '跟团游', '自驾', '骑行', '徒步', '邮轮'].map((t) => (
                    <button key={t} onClick={() => {
                      const next = preferences.travelTypes.includes(t)
                        ? preferences.travelTypes.filter((x) => x !== t)
                        : [...preferences.travelTypes, t];
                      updatePreferences({ travelTypes: next });
                    }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        preferences.travelTypes.includes(t)
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
