import { useState, useMemo, useEffect, useRef, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";
import { uploadAvatarRemote } from "../lib/api";
import { Camera } from "lucide-react";
import { exportIcs, exportPdf } from "../lib/export";
import { fetchMySubmissions, fetchMyItineraries, fetchAlertsRemote, checkAlertsRemote, type Submission, type SavedItinerary, type PriceAlert } from "../lib/api";
import { Heart, Trash2, Map, BookOpen, Coffee, Building, Filter, ArrowUpDown, LogOut, Sparkles, FileText, Clock, MapPin, Bell, TrendingDown, Download, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Profile() {
  const navigate = useNavigate();
  const { favorites, removeFavorite } = useFavorites();
  const { user, logout, accessToken, updateUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    if (file.size > 500 * 1024) {
      alert("头像不能超过 500KB");
      return;
    }
    setAvatarUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const updated = await uploadAvatarRemote(String(reader.result), accessToken);
          updateUser(updated);
        } finally {
          setAvatarUploading(false);
        }
      };
      reader.onerror = () => setAvatarUploading(false);
      reader.readAsDataURL(file);
    } catch {
      setAvatarUploading(false);
    }
  };
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('time_desc');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [itinsLoading, setItinsLoading] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  // 加载我的投稿
  useEffect(() => {
    if (!accessToken) return;
    setSubsLoading(true);
    fetchMySubmissions(accessToken)
      .then(setSubmissions)
      .catch(() => undefined)
      .finally(() => setSubsLoading(false));
  }, [accessToken]);

  // 加载我的行程
  useEffect(() => {
    if (!accessToken) return;
    setItinsLoading(true);
    fetchMyItineraries(accessToken)
      .then(setItineraries)
      .catch(() => undefined)
      .finally(() => setItinsLoading(false));
  }, [accessToken]);

  // 加载降价提醒
  useEffect(() => {
    if (!accessToken) return;
    setAlertsLoading(true);
    fetchAlertsRemote(accessToken)
      .then(setAlerts)
      .catch(() => undefined)
      .finally(() => setAlertsLoading(false));
  }, [accessToken]);

  // 检查降价（模拟波动）
  const handleCheck = async () => {
    if (!accessToken || checking) return;
    setChecking(true);
    try {
      setAlerts(await checkAlertsRemote(accessToken));
    } catch {
      // 忽略
    } finally {
      setChecking(false);
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'guide': return <BookOpen className="w-4 h-4" />;
      case 'food': return <Coffee className="w-4 h-4" />;
      case 'hotel': return <Building className="w-4 h-4" />;
      case 'route': return <Map className="w-4 h-4" />;
      default: return <Heart className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'guide': return '攻略';
      case 'food': return '美食';
      case 'hotel': return '酒店';
      case 'route': return '路线';
      default: return '其他';
    }
  };

  const filteredAndSortedFavorites = useMemo(() => {
    let result = [...favorites];

    // Filter
    if (filterType !== 'all') {
      result = result.filter(item => item.type === filterType);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'time_desc') {
        return (b.addedAt || 0) - (a.addedAt || 0);
      } else if (sortBy === 'time_asc') {
        return (a.addedAt || 0) - (b.addedAt || 0);
      } else if (sortBy === 'name_asc') {
        return a.title.localeCompare(b.title, 'zh-CN');
      } else if (sortBy === 'name_desc') {
        return b.title.localeCompare(a.title, 'zh-CN');
      } else if (sortBy === 'type') {
        return a.type.localeCompare(b.type);
      }
      return 0;
    });

    return result;
  }, [favorites, filterType, sortBy]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-16 h-16 rounded-full bg-orange-600 text-white flex items-center justify-center text-xl font-bold overflow-hidden group shadow-md shadow-orange-600/20"
            title="点击上传头像"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.nickname} className="w-full h-full object-cover" />
            ) : (
              user?.nickname?.charAt(0)?.toUpperCase() || "U"
            )}
            <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {avatarUploading ? (
                <span className="text-xs">上传中...</span>
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div>
            <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-stone-100 mb-0.5">{user?.nickname || "旅行者"}</h1>
            <p className="text-sm text-gray-500 dark:text-stone-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              VoyageX 会员 · 收藏 {favorites.length} 项
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-stone-400 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </div>

      {/* 数据统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "我的收藏", value: favorites.length, icon: Heart, color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40" },
          { label: "我的行程", value: itineraries.length, icon: MapPin, color: "text-orange-500 bg-orange-50 dark:bg-orange-950/40" },
          { label: "我的投稿", value: submissions.length, icon: FileText, color: "text-teal-500 bg-teal-50 dark:bg-teal-950/40" },
          { label: "降价提醒", value: alerts.length, icon: Bell, color: "text-violet-500 bg-violet-50 dark:bg-violet-950/40" },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 dark:bg-stone-900 rounded-2xl p-4 flex items-center gap-3 border border-gray-100 dark:border-stone-800">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-stone-100 num">{s.value}</div>
              <div className="text-xs text-gray-500 dark:text-stone-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 降价提醒 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-orange-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-stone-100">降价提醒</h2>
          <span className="text-sm text-gray-500 dark:text-stone-400">({alerts.length})</span>
          <button
            onClick={handleCheck}
            disabled={checking || alerts.length === 0}
            className="ml-auto flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50 transition-colors"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            {checking ? "检查中..." : "检查降价"}
          </button>
        </div>
        {alertsLoading ? (
          <p className="text-sm text-gray-400 dark:text-stone-500">加载中...</p>
        ) : alerts.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-dashed border-gray-200 dark:border-stone-700 dark:border-stone-700 p-8 text-center">
            <Bell className="w-8 h-8 text-gray-300 dark:text-stone-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-stone-400">还没有订阅比价，去 全网比价 页订阅降价提醒吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(a => (
              <div key={a.id} className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-gray-100 dark:border-stone-800 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-900 dark:text-stone-100 truncate pr-3">{a.title}</div>
                  {a.dropped ? (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      <TrendingDown className="w-3 h-3" /> 降 {a.dropPercent}%
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:text-stone-400">监控中</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 dark:text-stone-500 line-through">¥{a.subscribedPrice}</span>
                  <span className="text-orange-600 font-bold num">¥{a.currentPrice}</span>
                  {a.dropped && <span className="text-emerald-600 text-xs">已降价，建议入手</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 我的行程 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-orange-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-stone-100">我的行程</h2>
          <span className="text-sm text-gray-500 dark:text-stone-400">({itineraries.length})</span>
        </div>
        {itinsLoading ? (
          <p className="text-sm text-gray-400 dark:text-stone-500">加载中...</p>
        ) : itineraries.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-dashed border-gray-200 dark:border-stone-700 dark:border-stone-700 p-8 text-center">
            <MapPin className="w-8 h-8 text-gray-300 dark:text-stone-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-stone-400">还没有保存的行程，去 AI 行程页生成并保存吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            {itineraries.map(it => (
              <div key={it.id} className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-gray-100 dark:border-stone-800 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-900 dark:text-stone-100">{it.title}</div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    {it.days} 天
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-stone-500">
                  {it.destination && <span>📍 {it.destination}</span>}
                  {it.budget && <span>· {it.budget}</span>}
                  {it.startDate && <span>· {it.startDate}</span>}
                  <span>· {new Date(it.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-stone-500 mt-1.5">
                  <span className="text-orange-500">{it.dayData.length} 天计划</span>
                  <span>· 首日 {it.dayData[0]?.steps[0]?.title || ""}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => exportIcs(it)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> 导出 ICS
                  </button>
                  <button
                    onClick={() => exportPdf(it)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-stone-950 text-gray-600 dark:text-stone-300 hover:bg-gray-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> 导出 PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 我的投稿 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-orange-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-stone-100">我的投稿</h2>
          <span className="text-sm text-gray-500 dark:text-stone-400">({submissions.length})</span>
        </div>
        {subsLoading ? (
          <p className="text-sm text-gray-400 dark:text-stone-500">加载中...</p>
        ) : submissions.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-dashed border-gray-200 dark:border-stone-700 dark:border-stone-700 p-8 text-center">
            <FileText className="w-8 h-8 text-gray-300 dark:text-stone-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-stone-400">还没有投稿，去 攻略/美食 页分享你的旅行经验吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map(s => (
              <div key={s.id} className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-gray-100 dark:border-stone-800 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-900 dark:text-stone-100">{s.title}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    s.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {s.status === "approved" ? "已发布" : "审核中"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-stone-500">
                  <span>{s.type === "guide" ? "攻略" : "美食"}</span>
                  {s.destination && <span>· {s.destination}</span>}
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {new Date(s.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-stone-400 mt-2 line-clamp-2">{s.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-gray-100 dark:border-stone-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-stone-800 bg-gray-50 dark:bg-stone-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-orange-600 fill-orange-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-stone-100">我的收藏 ({favorites.length})</h2>
          </div>

          {favorites.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex items-center">
                <Filter className="w-4 h-4 text-gray-400 dark:text-stone-500 absolute left-3" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-stone-700 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none cursor-pointer"
                >
                  <option value="all">全部类型</option>
                  <option value="guide">攻略</option>
                  <option value="food">美食</option>
                  <option value="hotel">酒店</option>
                  <option value="route">路线</option>
                </select>
              </div>

              <div className="relative flex items-center">
                <ArrowUpDown className="w-4 h-4 text-gray-400 dark:text-stone-500 absolute left-3" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-stone-700 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none cursor-pointer"
                >
                  <option value="time_desc">最新添加</option>
                  <option value="time_asc">最早添加</option>
                  <option value="name_asc">名称 (A-Z)</option>
                  <option value="name_desc">名称 (Z-A)</option>
                  <option value="type">类型</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {favorites.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-stone-400 text-lg">您还没有收藏任何内容</p>
              <p className="text-gray-400 dark:text-stone-500 text-sm mt-2">在浏览攻略、美食或比价时，点击心形图标即可收藏</p>
            </div>
          ) : filteredAndSortedFavorites.length === 0 ? (
            <div className="text-center py-16">
              <Filter className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-stone-400 text-lg">没有找到符合条件的收藏</p>
              <button 
                onClick={() => setFilterType('all')} 
                className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
              >
                清除筛选
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {filteredAndSortedFavorites.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col rounded-xl border border-gray-100 dark:border-stone-800 overflow-hidden hover:shadow-md transition-shadow bg-white"
                  >
                    {item.image && (
                      <div className="h-40 w-full overflow-hidden relative">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute top-2 left-2 flex items-center gap-1 text-xs font-medium text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                          {getIcon(item.type)}
                          {getTypeLabel(item.type)}
                        </div>
                      </div>
                    )}
                    <div className="p-4 flex-grow flex flex-col">
                      {!item.image && (
                        <div className="flex items-center gap-1 text-xs font-medium text-orange-600 mb-2 bg-orange-50 w-fit px-2 py-1 rounded">
                          {getIcon(item.type)}
                          {getTypeLabel(item.type)}
                        </div>
                      )}
                      <h3 className="font-bold text-gray-900 dark:text-stone-100 mb-1 line-clamp-1">{item.title}</h3>
                      {item.subtitle && <p className="text-sm text-gray-500 dark:text-stone-400 line-clamp-2 mb-3">{item.subtitle}</p>}
                      
                      <div className="mt-auto pt-4 flex justify-between items-center border-t border-gray-50">
                        <span className="text-sm font-medium text-gray-900 dark:text-stone-100">
                          {item.rating && <span className="text-orange-500 mr-2">★ {item.rating}</span>}
                          {item.price && <span className="text-emerald-600">{item.price}</span>}
                        </span>
                        <button 
                          onClick={() => removeFavorite(item.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="取消收藏"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
