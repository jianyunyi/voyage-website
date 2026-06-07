import { useState, useMemo, useEffect, useCallback } from "react";
import { useFavorites } from "../context/FavoritesContext";
import { usePreferences } from "../context/PreferencesContext";
import { useAuth } from "../context/AuthContext";
import {
  Heart, Trash2, Map, BookOpen, Coffee, Building, User, Filter, ArrowUpDown, Settings,
  FileText, ThumbsUp, MessageSquare, Loader2, ChevronDown, ChevronUp, MapPin, Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchMySubmissions, type UserSubmission } from "../lib/submissionService";

export default function Profile() {
  const { favorites, removeFavorite } = useFavorites();
  const { preferences, updatePreferences } = usePreferences();
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('time_desc');
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'guide' | 'food'>('all');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const loadSubmissions = useCallback(async () => {
    if (!user?.id) {
      setSubmissions([]);
      setSubmissionsLoading(false);
      return;
    }
    setSubmissionsLoading(true);
    const data = await fetchMySubmissions(user.id);
    setSubmissions(data.submissions);
    setStatusLabels(data.statusLabels);
    setSubmissionsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const filteredSubmissions = useMemo(() => {
    if (submissionFilter === 'all') return submissions;
    return submissions.filter((s) => s.type === submissionFilter);
  }, [submissions, submissionFilter]);

  const toggleComments = (id: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'published':
      case 'approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'pending_review':
      case 'needs_manual_review':
        return 'bg-amber-100 text-amber-700';
      case 'rejected':
      case 'auto_rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
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

  const handleDestinationToggle = (dest: string) => {
    const newDests = preferences.destinations.includes(dest)
      ? preferences.destinations.filter(d => d !== dest)
      : [...preferences.destinations, dest];
    updatePreferences({ destinations: newDests });
  };

  const handleTravelTypeToggle = (type: string) => {
    const newTypes = preferences.travelTypes.includes(type)
      ? preferences.travelTypes.filter(t => t !== type)
      : [...preferences.travelTypes, type];
    updatePreferences({ travelTypes: newTypes });
  };

  const handleFlavorToggle = (flavor: string) => {
    const newFlavors = preferences.foodFlavors.includes(flavor)
      ? preferences.foodFlavors.filter(f => f !== flavor)
      : [...preferences.foodFlavors, flavor];
    updatePreferences({ foodFlavors: newFlavors });
  };

  return (
    <div className="bg-[#fcfbf9] min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center gap-6 mb-12">
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
            />
          ) : (
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shadow-inner">
              <User className="w-10 h-10" />
            </div>
          )}
          <div>
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">
              {user ? `你好，${user.name}` : '个人中心'}
            </h1>
            <p className="text-gray-600 font-medium">管理您的投稿、收藏与偏好</p>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-serif font-bold text-gray-900">我的偏好设置</h2>
          </div>
          <div className="p-8 space-y-10">
          {/* Destinations */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">偏好目的地</h3>
            <div className="flex flex-wrap gap-2">
              {['北京', '上海', '广州', '成都', '西安', '杭州', '三亚', '丽江'].map(dest => (
                <button
                  key={dest}
                  onClick={() => handleDestinationToggle(dest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    preferences.destinations.includes(dest)
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {dest}
                </button>
              ))}
            </div>
          </div>

          {/* Travel Types */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">旅行类型</h3>
            <div className="flex flex-wrap gap-2">
              {['探险', '休闲', '文化', '亲子', '情侣', '美食', '购物'].map(type => (
                <button
                  key={type}
                  onClick={() => handleTravelTypeToggle(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    preferences.travelTypes.includes(type)
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Food Preferences */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">美食偏好</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">辣度接受能力</p>
                <div className="flex flex-wrap gap-2">
                  {['不限', '不辣', '微辣', '中辣', '特辣'].map(level => (
                    <button
                      key={level}
                      onClick={() => updatePreferences({ foodSpiciness: level })}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        preferences.foodSpiciness === level
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">口味偏好</p>
                <div className="flex flex-wrap gap-2">
                  {['清淡', '重口', '甜口', '酸口', '海鲜', '肉食', '素食'].map(flavor => (
                    <button
                      key={flavor}
                      onClick={() => handleFlavorToggle(flavor)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        preferences.foodFlavors.includes(flavor)
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {flavor}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* My Submissions Section */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-violet-600" />
              <h2 className="text-2xl font-serif font-bold text-gray-900">
                我的投稿 ({submissions.length})
              </h2>
            </div>
            {submissions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(['all', 'guide', 'food'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSubmissionFilter(type)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                      submissionFilter === type
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? '全部' : type === 'guide' ? '攻略' : '美食'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-8">
            {submissionsLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>加载投稿中...</span>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                <p className="text-gray-500 text-xl font-medium">您还没有发布任何内容</p>
                <p className="text-gray-400 text-base mt-3">
                  前往攻略或美食板块，点击「发布攻略」或「推荐美食」即可投稿
                </p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-20">
                <Filter className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                <p className="text-gray-500 text-xl font-medium">没有找到符合条件的投稿</p>
                <button
                  onClick={() => setSubmissionFilter('all')}
                  className="mt-6 text-violet-600 hover:text-violet-700 font-bold px-6 py-2 bg-violet-50 rounded-full transition-colors"
                >
                  查看全部
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredSubmissions.map((item) => {
                  const isGuide = item.type === 'guide';
                  const commentCount = item.comments.length;
                  const showComments = expandedComments.has(item.id);

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-gray-100 overflow-hidden bg-white hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-48 h-40 md:h-auto flex-shrink-0 overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-grow p-6">
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                                isGuide ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                              }`}>
                                {isGuide ? <BookOpen className="w-3.5 h-3.5" /> : <Coffee className="w-3.5 h-3.5" />}
                                {isGuide ? '攻略' : '美食'}
                              </span>
                              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${getStatusBadgeClass(item.status)}`}>
                                {statusLabels[item.status] || item.status}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 font-medium">
                              {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>

                          {isGuide ? (
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" /> {item.destination}
                              </span>
                              <span>{item.days} 天</span>
                              <span>¥{item.budget}</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" /> {item.city} · {item.typeLabel}
                              </span>
                              <span className="text-emerald-600 font-bold">{item.price}</span>
                            </div>
                          )}

                          <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                            {isGuide ? item.content : item.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-gray-500">
                            {isGuide ? (
                              <span className="flex items-center gap-1.5 text-orange-600">
                                <ThumbsUp className="w-4 h-4" />
                                {item.likes} 点赞
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-amber-500">
                                <Star className="w-4 h-4 fill-amber-400" />
                                {item.rating.toFixed(1)} 评分
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-red-500">
                              <Heart className="w-4 h-4" />
                              {item.favoritesCount} 收藏
                            </span>
                            <span className="flex items-center gap-1.5 text-blue-600">
                              <MessageSquare className="w-4 h-4" />
                              {isGuide ? commentCount : item.reviews} 评论
                            </span>
                          </div>

                          {(commentCount > 0 || (!isGuide && item.reviews > 0)) && (
                            <button
                              onClick={() => toggleComments(item.id)}
                              className="mt-4 flex items-center gap-1.5 text-sm font-bold text-violet-600 hover:text-violet-700 transition-colors"
                            >
                              {showComments ? (
                                <>
                                  <ChevronUp className="w-4 h-4" /> 收起评论
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" /> 查看评论
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {showComments && item.comments.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-100 bg-gray-50/50 overflow-hidden"
                          >
                            <div className="p-6 space-y-4">
                              {item.comments.map((comment, idx) => (
                                <div key={idx} className="bg-white rounded-xl p-4 border border-gray-100">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-gray-900 text-sm">{comment.user}</span>
                                    <div className="flex items-center gap-2">
                                      {comment.rating !== undefined && (
                                        <span className="flex items-center gap-0.5 text-amber-500 text-xs font-bold">
                                          <Star className="w-3 h-3 fill-amber-400" />
                                          {comment.rating}
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-400">{comment.date}</span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 leading-relaxed">{comment.content}</p>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {showComments && item.comments.length === 0 && !isGuide && (
                        <div className="border-t border-gray-100 bg-gray-50/50 p-6 text-center text-sm text-gray-400">
                          暂无评论内容
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Heart className="w-6 h-6 text-orange-600 fill-orange-600" />
              <h2 className="text-2xl font-serif font-bold text-gray-900">我的收藏 ({favorites.length})</h2>
            </div>

            {favorites.length > 0 && (
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex items-center">
                  <Filter className="w-4 h-4 text-gray-400 absolute left-4" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="pl-10 pr-10 py-2.5 text-sm font-medium border border-gray-200 rounded-full bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none cursor-pointer transition-all"
                  >
                    <option value="all">全部类型</option>
                    <option value="guide">攻略</option>
                    <option value="food">美食</option>
                    <option value="hotel">酒店</option>
                    <option value="route">路线</option>
                  </select>
                </div>

                <div className="relative flex items-center">
                  <ArrowUpDown className="w-4 h-4 text-gray-400 absolute left-4" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="pl-10 pr-10 py-2.5 text-sm font-medium border border-gray-200 rounded-full bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none cursor-pointer transition-all"
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

          <div className="p-8">
            {favorites.length === 0 ? (
              <div className="text-center py-20">
                <Heart className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                <p className="text-gray-500 text-xl font-medium">您还没有收藏任何内容</p>
                <p className="text-gray-400 text-base mt-3">在浏览攻略、美食或比价时，点击心形图标即可收藏</p>
              </div>
            ) : filteredAndSortedFavorites.length === 0 ? (
              <div className="text-center py-20">
                <Filter className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                <p className="text-gray-500 text-xl font-medium">没有找到符合条件的收藏</p>
                <button 
                  onClick={() => setFilterType('all')} 
                  className="mt-6 text-orange-600 hover:text-orange-700 font-bold px-6 py-2 bg-orange-50 rounded-full transition-colors"
                >
                  清除筛选
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                <AnimatePresence>
                  {filteredAndSortedFavorites.map((item) => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 bg-white hover:-translate-y-1"
                    >
                      {item.image && (
                        <div className="h-48 w-full overflow-hidden relative">
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" referrerPolicy="no-referrer" />
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-bold tracking-wide text-white bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                            {getIcon(item.type)}
                            {getTypeLabel(item.type)}
                          </div>
                        </div>
                      )}
                      <div className="p-6 flex-grow flex flex-col">
                        {!item.image && (
                          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-orange-600 mb-3 bg-orange-50 w-fit px-3 py-1.5 rounded-full">
                            {getIcon(item.type)}
                            {getTypeLabel(item.type)}
                          </div>
                        )}
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-1 text-lg">{item.title}</h3>
                        {item.subtitle && <p className="text-sm text-gray-500 line-clamp-2 mb-4 font-medium">{item.subtitle}</p>}
                        
                        <div className="mt-auto pt-5 flex justify-between items-center border-t border-gray-50">
                          <span className="text-sm font-bold text-gray-900">
                            {item.rating && <span className="text-orange-500 mr-2">★ {item.rating}</span>}
                            {item.price && <span className="text-emerald-600">{item.price}</span>}
                          </span>
                          <button 
                            onClick={() => removeFavorite(item.id)}
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="取消收藏"
                          >
                            <Trash2 className="w-5 h-5" />
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
