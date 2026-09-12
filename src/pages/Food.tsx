import { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  ChevronDown,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Navigation,
  PlusCircle,
  Search,
  Star,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFavorites } from "../context/FavoritesContext";
import { usePreferences } from "../context/PreferencesContext";
import SubmissionModal from "../components/SubmissionModal";
import { fetchPublishedFoods, type FoodItem } from "../lib/foodService";

// Provinces
const provinces = ["全部", "北京", "上海", "广东", "四川", "浙江", "江苏", "陕西", "湖南", "福建", "山东", "云南", "海南", "重庆", "湖北", "广西", "新疆", "西藏"];

export default function Food() {
  const [activeProvince, setActiveProvince] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { preferences } = usePreferences();

  const loadFoods = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const data = await fetchPublishedFoods();
    if (data.length === 0) {
      setLoadError("暂无美食数据，请确认 API 服务已启动");
    }
    setFoods(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFoods();
  }, [loadFoods]);

  const filteredFood = foods
    .filter(food => (activeProvince === "全部" || food.province === activeProvince))
    .filter(food => food.name.toLowerCase().includes(searchQuery.toLowerCase()) || food.type.includes(searchQuery))
    .filter(food => food.rating >= minRating)
    .sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Destination 
      if (preferences.destinations.includes(a.city) || preferences.destinations.includes(a.province)) scoreA += 10;
      if (preferences.destinations.includes(b.city) || preferences.destinations.includes(b.province)) scoreB += 10;

      // Spiciness matches roughly inside tags
      if (preferences.foodSpiciness === '不吃辣' && a.tags.includes('不辣')) scoreA += 5;
      if (preferences.foodSpiciness === '微辣' && a.tags.some(t => t.includes('辣'))) scoreA += 2;
      if (preferences.foodSpiciness === '无辣不欢' && (a.tags.includes('麻辣') || a.tags.includes('香辣'))) scoreA += 5;

      if (preferences.foodSpiciness === '不吃辣' && b.tags.includes('不辣')) scoreB += 5;
      if (preferences.foodSpiciness === '微辣' && b.tags.some(t => t.includes('辣'))) scoreB += 2;
      if (preferences.foodSpiciness === '无辣不欢' && (b.tags.includes('麻辣') || b.tags.includes('香辣'))) scoreB += 5;

      // Flavors
      const aFlavorMatches = a.tags.filter(t => preferences.foodFlavors.includes(t)).length;
      const bFlavorMatches = b.tags.filter(t => preferences.foodFlavors.includes(t)).length;

      scoreA += aFlavorMatches * 3;
      scoreB += bFlavorMatches * 3;
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // Then sort by rating
      return b.rating - a.rating;
    });

  return (
    <main className="voyage-content-page voyage-food">
      {/* Header */}
      <div className="voyage-food__intro bg-white border-b border-gray-200/50 py-16">
        <div className="voyage-food__intro-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">探索地道美食</h1>
              <p className="text-lg text-gray-600 max-w-3xl font-medium">发现全国各地最地道的美食，基于真实用户评价星级排序，绝不踩雷。</p>
            </div>
            <button 
              onClick={() => setIsSubmissionModalOpen(true)}
              className="voyage-food__submit flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-full font-bold transition-all duration-300 shadow-lg shadow-orange-600/20 whitespace-nowrap hover:-translate-y-1"
            >
              <PlusCircle className="w-5 h-5" />
              推荐美食
            </button>
          </div>
          
          <div className="voyage-food__search-rail mt-8 flex flex-col sm:flex-row gap-4">
            <div className="voyage-food__search-field relative flex-grow max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-full leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all sm:text-sm"
                placeholder="搜索餐厅、菜系..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="voyage-food__rating-select relative w-full sm:w-48">
              <select
                className="block w-full px-4 py-3.5 border border-gray-200 rounded-full leading-5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all sm:text-sm appearance-none cursor-pointer"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
              >
                <option value={0}>全部星级</option>
                <option value={4.0}>4.0 星以上</option>
                <option value={4.5}>4.5 星以上</option>
                <option value={4.8}>4.8 星以上</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="voyage-food__listing max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {/* Province Filter */}
        <div className="voyage-food__province-rail flex overflow-x-auto pb-4 mb-10 gap-3 hide-scrollbar">
          {provinces.map(province => (
            <button
              key={province}
              onClick={() => setActiveProvince(province)}
              className={`flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                activeProvince === province ? "bg-[#1a1918] text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {province}
            </button>
          ))}
        </div>

        {/* Food List */}
        <div className="voyage-food__listing-heading mb-8 flex justify-between items-end">
          <h2 className="text-2xl font-serif font-bold text-gray-900">高分美食推荐</h2>
          <span className="text-sm text-gray-500 font-medium">
            {preferences.destinations.length > 0 ? "已根据您的偏好优先展示" : "按星级评分排序"}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>加载美食中...</span>
          </div>
        ) : loadError && foods.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-4">{loadError}</p>
            <button
              onClick={loadFoods}
              className="text-orange-600 font-bold hover:text-orange-700"
            >
              重新加载
            </button>
          </div>
        ) : (
        <div className="voyage-food__grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredFood.map((food, index) => {
            const foodId = `food-${food.id}`;
            const isFav = isFavorite(foodId);
            const isPref = preferences.destinations.includes(food.city) || preferences.destinations.includes(food.province);
            return (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="voyage-food-card bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 relative group cursor-pointer hover:-translate-y-1"
                onClick={() => setSelectedFood(food)}
              >
                <div className="voyage-food-card__image relative h-56">
                  <img src={food.image} alt={food.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                    <span className="font-bold text-gray-900 text-sm">{food.rating}</span>
                  </div>
                  {food.source === "user" && (
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md text-gray-800 px-3 py-1 rounded-full text-xs font-bold">
                      用户推荐
                    </div>
                  )}
                  {isPref && (
                    <div className="absolute top-4 left-16 bg-emerald-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm tracking-wide">
                      匹配偏好
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite({
                        id: foodId,
                        type: 'food',
                        title: food.name,
                        subtitle: `${food.city} · ${food.type}`,
                        image: food.image,
                        rating: food.rating,
                        price: food.price
                      });
                    }}
                    className="absolute top-4 left-4 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform"
                  >
                    <Heart className={`w-5 h-5 transition-colors ${isFav ? 'text-orange-600 fill-orange-600' : 'text-gray-400'}`} />
                  </button>
                </div>
                <div className="voyage-food-card__body p-8">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-2xl font-serif font-bold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">{food.name}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 font-medium">
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md"><MapPin className="w-4 h-4" /> {food.city}</span>
                    <span className="bg-gray-50 px-2.5 py-1 rounded-md">{food.type}</span>
                    <span className="bg-gray-50 px-2.5 py-1 rounded-md">{food.price}</span>
                  </div>
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
                    <span className="text-sm text-gray-400 font-medium">{food.reviews.toLocaleString()} 条评价</span>
                    <button className="text-orange-600 font-bold text-sm hover:text-orange-700 flex items-center gap-1 group-hover:gap-2 transition-all">查看详情 <ArrowRight className="w-4 h-4" /></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        )}

        {!loading && filteredFood.length === 0 && foods.length > 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">没有找到匹配的美食推荐</p>
          </div>
        )}
      </section>

      {/* Food Detail Modal */}
      <AnimatePresence>
        {selectedFood && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="voyage-food-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => setSelectedFood(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="voyage-food-modal__panel bg-white overflow-hidden shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
            >
              <div className="voyage-food-modal__image relative h-72 flex-shrink-0">
                <img src={selectedFood.image} alt={selectedFood.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  onClick={() => setSelectedFood(null)}
                  className="absolute top-6 right-6 p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="voyage-food-modal__image-caption absolute bottom-0 left-0 right-0 p-8">
                  <h2 className="text-4xl font-serif font-bold text-white mb-3">{selectedFood.name}</h2>
                  <div className="flex items-center gap-4 text-white/90 text-sm font-medium">
                    <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> {selectedFood.rating}</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">{selectedFood.type}</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">{selectedFood.price}</span>
                  </div>
                </div>
              </div>

              <div className="voyage-food-modal__content p-8 overflow-y-auto flex-grow">
                <div className="voyage-food-modal__address flex items-start gap-4 mb-8 p-5">
                  <MapPin className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-gray-900 mb-1 text-lg">{selectedFood.address}</div>
                    <div className="text-sm text-gray-500 font-medium">{selectedFood.province} · {selectedFood.city}</div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`正在为您开启导航至：${selectedFood.address}`);
                    }}
                    className="ml-auto flex items-center gap-1.5 text-sm text-white font-bold bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-full transition-colors shadow-sm"
                  >
                    <Navigation className="w-4 h-4" /> 导航
                  </button>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">餐厅简介</h3>
                  <p className="text-gray-600 leading-relaxed">{selectedFood.description}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-gray-900" />
                    <h3 className="text-lg font-bold text-gray-900">精选评价 ({selectedFood.reviews.toLocaleString()})</h3>
                  </div>
                  <div className="space-y-4">
                    {selectedFood.reviewsList.length > 0 ? selectedFood.reviewsList.map((review) => (
                      <div key={review._id || `${review.user}-${review.date}`} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-900">{review.user}</span>
                          <span className="text-sm text-gray-400">{review.date}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        <p className="text-gray-600 text-sm">{review.content}</p>
                      </div>
                    )) : (
                      <p className="text-gray-500 text-sm">暂无评价，快来成为第一个分享体验的人吧！</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        type="food"
        onSuccess={loadFoods}
      />
    </main>
  );
}
