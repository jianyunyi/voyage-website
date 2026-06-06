import { useState, useMemo } from "react";
import { useFavorites } from "../context/FavoritesContext";
import { usePreferences } from "../context/PreferencesContext";
import { useAuth } from "../context/AuthContext";
import { Heart, Trash2, Map, BookOpen, Coffee, Building, User, Filter, ArrowUpDown, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Profile() {
  const { favorites, removeFavorite } = useFavorites();
  const { preferences, updatePreferences } = usePreferences();
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('time_desc');

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
            <p className="text-gray-600 font-medium">管理您的旅行收藏与偏好</p>
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
