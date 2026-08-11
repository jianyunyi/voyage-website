import { useState } from "react";
import { Star, MapPin, Search, Filter, Heart, X, MessageSquare, Navigation, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFavorites } from "../context/FavoritesContext";
import SubmissionModal from "../components/SubmissionModal";

// Provinces
const provinces = ["全部", "北京", "上海", "广东", "四川", "浙江", "江苏", "陕西", "湖南", "福建", "山东", "云南", "海南", "重庆", "湖北", "广西", "新疆", "西藏"];

// Food Data
const foodRecommendations = [
  {
    id: 1, name: "宽窄巷子老火锅", province: "四川", city: "成都", address: "成都市青羊区宽巷子8号",
    rating: 4.9, reviews: 12500, type: "火锅", image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800", price: "¥120/人",
    description: "地道川味火锅，环境古色古香，位于著名景点宽窄巷子内，是体验成都慢生活的绝佳去处。",
    reviewsList: [
      { id: 1, user: "张**", rating: 5, date: "2026-03-15", content: "味道非常正宗，牛油锅底越吃越香！环境也很好，很有成都特色。" },
      { id: 2, user: "王**", rating: 4, date: "2026-03-10", content: "排队人挺多的，建议提前取号。毛肚和鹅肠必点，非常新鲜。" }
    ]
  },
  {
    id: 2, name: "陈麻婆豆腐 (总店)", province: "四川", city: "成都", address: "成都市青羊区西玉龙街197号",
    rating: 4.8, reviews: 8900, type: "川菜", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800", price: "¥60/人",
    description: "始于清朝同治年间的中华老字号，麻婆豆腐的发源地，麻、辣、烫、香、酥、嫩、鲜、活。",
    reviewsList: [
      { id: 1, user: "李**", rating: 5, date: "2026-03-12", content: "名不虚传！麻婆豆腐太下饭了，一个人能吃三大碗米饭。" },
      { id: 2, user: "赵**", rating: 5, date: "2026-03-08", content: "除了麻婆豆腐，宫保鸡丁也很好吃，价格亲民，性价比极高。" }
    ]
  },
  {
    id: 3, name: "洞子老火锅", province: "重庆", city: "重庆", address: "重庆市渝中区中山三路153号",
    rating: 4.9, reviews: 15600, type: "火锅", image: "https://images.unsplash.com/photo-1626804475297-41609ea0af49?auto=format&fit=crop&q=80&w=800", price: "¥110/人",
    description: "开在防空洞里的特色火锅，体验重庆独特的防空洞文化，锅底醇厚，辣而不燥。",
    reviewsList: [
      { id: 1, user: "刘**", rating: 5, date: "2026-03-14", content: "防空洞里吃火锅太有感觉了！夏天去里面还很凉快，火锅味道也是一绝。" },
      { id: 2, user: "陈**", rating: 4, date: "2026-03-05", content: "微辣也挺辣的，不能吃辣的朋友慎重。鸭血和酥肉很好吃。" }
    ]
  },
  {
    id: 4, name: "回民街老孙家羊肉泡馍", province: "陕西", city: "西安", address: "西安市莲湖区回民街北院门",
    rating: 4.7, reviews: 6700, type: "小吃", image: "https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&q=80&w=800", price: "¥45/人",
    description: "西安著名的特色小吃，肉烂汤浓，香气四溢。自己动手掰馍也是一种独特的体验。",
    reviewsList: [
      { id: 1, user: "周**", rating: 5, date: "2026-03-11", content: "掰馍掰了半小时，吃起来格外香！羊肉很烂糊，汤头浓郁。" },
      { id: 2, user: "吴**", rating: 4, date: "2026-03-02", content: "人很多，环境比较嘈杂，但是味道确实地道，配上糖蒜绝了。" }
    ]
  },
  {
    id: 5, name: "点都德 (大茶楼)", province: "广东", city: "广州", address: "广州市越秀区惠福东路470号",
    rating: 4.8, reviews: 21000, type: "早茶", image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800", price: "¥90/人",
    description: "广州老字号茶楼，全天候供应传统广式点心。虾饺皇、红米肠是必点招牌。",
    reviewsList: [
      { id: 1, user: "郑**", rating: 5, date: "2026-03-16", content: "金莎海虾红米肠太好吃了！外软内脆，虾肉Q弹。虾饺皇也很大颗。" },
      { id: 2, user: "黄**", rating: 5, date: "2026-03-09", content: "喝早茶的好去处，点心种类繁多，盲点都不踩雷，服务也很好。" }
    ]
  },
  {
    id: 6, name: "陶陶居", province: "广东", city: "广州", address: "广州市天河区天河路228号正佳广场6楼",
    rating: 4.6, reviews: 18000, type: "粤菜", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800", price: "¥150/人",
    description: "百年老字号粤菜馆，环境优雅，出品精致。烧鹅、冰镇咕噜肉是其特色名菜。",
    reviewsList: [
      { id: 1, user: "林**", rating: 5, date: "2026-03-13", content: "百年烧鹅皮脆肉嫩，肥而不腻。冰镇咕噜肉外酥里嫩，酸甜可口。" },
      { id: 2, user: "何**", rating: 4, date: "2026-03-06", content: "环境很好，适合宴请。菜品精致，就是分量稍微有点小。" }
    ]
  },
  {
    id: 7, name: "四季民福烤鸭店", province: "北京", city: "北京", address: "北京市东城区南池子大街11号",
    rating: 4.9, reviews: 25000, type: "北京菜", image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800", price: "¥180/人",
    description: "北京人气极高的烤鸭店，鸭皮酥脆入口即化。故宫店还可以边吃烤鸭边赏故宫美景。",
    reviewsList: [
      { id: 1, user: "孙**", rating: 5, date: "2026-03-18", content: "烤鸭绝了！鸭皮蘸白糖入口即化，鸭肉很嫩。贝勒爷烤肉也很好吃。" },
      { id: 2, user: "马**", rating: 4, date: "2026-03-10", content: "排队太恐怖了，等了三个小时。但是吃到烤鸭的那一刻觉得值了。" }
    ]
  },
  {
    id: 8, name: "文和友", province: "湖南", city: "长沙", address: "长沙市天心区湘江中路海信广场",
    rating: 4.7, reviews: 32000, type: "湘菜/小吃", image: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&q=80&w=800", price: "¥100/人",
    description: "沉浸式复古市井文化体验地，汇聚了长沙各种地道小吃，小龙虾是必点。",
    reviewsList: [
      { id: 1, user: "朱**", rating: 5, date: "2026-03-17", content: "里面的装修太有年代感了，拍照超级出片！口味虾很入味，辣得很爽。" },
      { id: 2, user: "胡**", rating: 4, date: "2026-03-12", content: "简直是一个巨大的迷宫，里面什么都有。臭豆腐和糖油粑粑也不错。" }
    ]
  }
];

export default function Food() {
  const [activeProvince, setActiveProvince] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [selectedFood, setSelectedFood] = useState<any | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  const filteredFood = foodRecommendations
    .filter(food => (activeProvince === "全部" || food.province === activeProvince))
    .filter(food => food.name.toLowerCase().includes(searchQuery.toLowerCase()) || food.type.includes(searchQuery))
    .filter(food => food.rating >= minRating)
    .sort((a, b) => b.rating - a.rating);

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
            <div>
              <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">探索地道美食</h1>
              <p className="text-lg text-gray-600 max-w-3xl">发现全国各地最地道的美食，基于真实用户评价星级排序，绝不踩雷。</p>
            </div>
            <button 
              onClick={() => setIsSubmissionModalOpen(true)}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              <PlusCircle className="w-5 h-5" />
              推荐美食
            </button>
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="搜索餐厅、菜系..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative w-full sm:w-48">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                className="block w-full pl-10 pr-8 py-3 border border-gray-300 rounded-xl leading-5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm appearance-none cursor-pointer"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
              >
                <option value={0}>全部星级</option>
                <option value={4.0}>4.0 星以上</option>
                <option value={4.5}>4.5 星以上</option>
                <option value={4.8}>4.8 星以上</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {/* Province Filter */}
        <div className="flex overflow-x-auto pb-4 mb-8 gap-3 hide-scrollbar">
          {provinces.map(province => (
            <button
              key={province}
              onClick={() => setActiveProvince(province)}
              className={`flex-shrink-0 px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeProvince === province ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {province}
            </button>
          ))}
        </div>

        {/* Food List */}
        <div className="mb-8 flex justify-between items-end">
          <h2 className="text-2xl font-bold text-gray-900">高分美食推荐</h2>
          <span className="text-sm text-gray-500">按星级评分排序</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredFood.map((food, index) => {
            const foodId = `food-${food.id}`;
            const isFav = isFavorite(foodId);
            return (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 relative group cursor-pointer"
                onClick={() => setSelectedFood(food)}
              >
                <div className="relative h-48">
                  <img src={food.image} alt={food.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                    <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                    <span className="font-bold text-gray-900">{food.rating}</span>
                  </div>
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
                    className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform"
                  >
                    <Heart className={`w-5 h-5 transition-colors ${isFav ? 'text-orange-600 fill-orange-600' : 'text-gray-400'}`} />
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{food.name}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {food.city}</span>
                    <span>{food.type}</span>
                    <span>{food.price}</span>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-500">{food.reviews.toLocaleString()} 条评价</span>
                    <button className="text-orange-600 font-medium text-sm hover:text-orange-700">查看详情</button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {filteredFood.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">没有找到匹配的美食推荐</p>
          </div>
        )}
      </div>

      {/* Food Detail Modal */}
      <AnimatePresence>
        {selectedFood && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedFood(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
            >
              <div className="relative h-64 flex-shrink-0">
                <img src={selectedFood.image} alt={selectedFood.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  onClick={() => setSelectedFood(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedFood.name}</h2>
                  <div className="flex items-center gap-4 text-white/90 text-sm">
                    <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> {selectedFood.rating}</span>
                    <span>{selectedFood.type}</span>
                    <span>{selectedFood.price}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-grow">
                <div className="flex items-start gap-3 mb-6 bg-gray-50 p-4 rounded-xl">
                  <MapPin className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900 mb-1">{selectedFood.address}</div>
                    <div className="text-sm text-gray-500">{selectedFood.province} · {selectedFood.city}</div>
                  </div>
                  <button className="ml-auto flex items-center gap-1 text-sm text-orange-600 font-medium hover:text-orange-700 bg-orange-100 px-3 py-1.5 rounded-lg">
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
                    {selectedFood.reviewsList.map((review: any) => (
                      <div key={review.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
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
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submission Modal */}
      <SubmissionModal 
        isOpen={isSubmissionModalOpen} 
        onClose={() => setIsSubmissionModalOpen(false)} 
        type="food" 
      />
    </div>
  );
}
