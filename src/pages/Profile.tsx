import { useState, useMemo } from "react";
import { useFavorites } from "../context/FavoritesContext";
import { Heart, Trash2, Map, BookOpen, Coffee, Building, User, Filter, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Profile() {
  const { favorites, removeFavorite } = useFavorites();
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">个人中心</h1>
          <p className="text-gray-600">管理您的旅行收藏与偏好</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-orange-600 fill-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">我的收藏 ({favorites.length})</h2>
          </div>

          {favorites.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex items-center">
                <Filter className="w-4 h-4 text-gray-400 absolute left-3" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none cursor-pointer"
                >
                  <option value="all">全部类型</option>
                  <option value="guide">攻略</option>
                  <option value="food">美食</option>
                  <option value="hotel">酒店</option>
                  <option value="route">路线</option>
                </select>
              </div>

              <div className="relative flex items-center">
                <ArrowUpDown className="w-4 h-4 text-gray-400 absolute left-3" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none cursor-pointer"
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
              <p className="text-gray-500 text-lg">您还没有收藏任何内容</p>
              <p className="text-gray-400 text-sm mt-2">在浏览攻略、美食或比价时，点击心形图标即可收藏</p>
            </div>
          ) : filteredAndSortedFavorites.length === 0 ? (
            <div className="text-center py-16">
              <Filter className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">没有找到符合条件的收藏</p>
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
                    className="flex flex-col rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow bg-white"
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
                      <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{item.title}</h3>
                      {item.subtitle && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.subtitle}</p>}
                      
                      <div className="mt-auto pt-4 flex justify-between items-center border-t border-gray-50">
                        <span className="text-sm font-medium text-gray-900">
                          {item.rating && <span className="text-orange-500 mr-2">★ {item.rating}</span>}
                          {item.price && <span className="text-emerald-600">{item.price}</span>}
                        </span>
                        <button 
                          onClick={() => removeFavorite(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
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
  );
}
