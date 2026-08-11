import { useState } from "react";
import { Search, Filter, MapPin, Calendar, Clock, ThumbsUp, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import SubmissionModal from "../components/SubmissionModal";

// Mock data for travel guides
const travelGuides = [
  {
    id: "g1",
    title: "成都5日深度游：从大熊猫到宽窄巷子，吃喝玩乐全攻略",
    author: "旅行达人小王",
    destination: "成都",
    days: 5,
    budget: 3500,
    likes: 1250,
    image: "https://images.unsplash.com/photo-1557425955-df376b5903c8?auto=format&fit=crop&q=80&w=1000",
    tags: ["深度游", "美食", "文化"]
  },
  {
    id: "g2",
    title: "重庆3D魔幻城市3日打卡路线，不走回头路",
    author: "山城探索者",
    destination: "重庆",
    days: 3,
    budget: 2000,
    likes: 3420,
    image: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&q=80&w=1000",
    tags: ["打卡", "摄影", "周末游"]
  },
  {
    id: "g3",
    title: "西安4日历史文化之旅：兵马俑、大雁塔、回民街",
    author: "历史爱好者",
    destination: "西安",
    days: 4,
    budget: 2800,
    likes: 890,
    image: "https://images.unsplash.com/photo-1599008633840-052c7f756385?auto=format&fit=crop&q=80&w=1000",
    tags: ["历史", "古迹", "亲子游"]
  },
  {
    id: "g4",
    title: "广州吃货3日游，从早茶到夜宵的终极指南",
    author: "老广食客",
    destination: "广州",
    days: 3,
    budget: 2500,
    likes: 2100,
    image: "https://images.unsplash.com/photo-1583248369069-9d91f1640fe6?auto=format&fit=crop&q=80&w=1000",
    tags: ["美食", "休闲", "周末游"]
  },
  {
    id: "g5",
    title: "云南大理丽江7日浪漫双城记",
    author: "流浪的云",
    destination: "云南",
    days: 7,
    budget: 5000,
    likes: 4500,
    image: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&q=80&w=1000",
    tags: ["浪漫", "风景", "长线游"]
  },
  {
    id: "g6",
    title: "三亚5日度假指南：阳光、沙滩与海鲜",
    author: "海岛控",
    destination: "三亚",
    days: 5,
    budget: 6000,
    likes: 1800,
    image: "https://images.unsplash.com/photo-1540202404-b711c040d6b5?auto=format&fit=crop&q=80&w=1000",
    tags: ["海岛", "度假", "亲子游"]
  }
];

export default function Guides() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  const filteredGuides = travelGuides.filter(guide => 
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    guide.destination.includes(searchQuery)
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
            <div>
              <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">精选旅行攻略</h1>
              <p className="text-lg text-gray-600 max-w-3xl">发现真实旅行者的足迹，获取详细的行程安排、预算规划和避坑指南。</p>
            </div>
            <button 
              onClick={() => setIsSubmissionModalOpen(true)}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              <PlusCircle className="w-5 h-5" />
              发布攻略
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
                placeholder="搜索目的地、景点或攻略标题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-xl bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium">
              <Filter className="w-5 h-5" />
              筛选
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredGuides.map((guide, index) => (
            <motion.div
              key={guide.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 group cursor-pointer flex flex-col"
            >
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={guide.image} 
                  alt={guide.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  {guide.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} className="bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-orange-600 transition-colors">
                  {guide.title}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {guide.destination}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {guide.days}天</span>
                  <span className="flex items-center gap-1">¥{guide.budget}</span>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                      {guide.author.charAt(0)}
                    </div>
                    <span className="text-sm text-gray-600">{guide.author}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{guide.likes}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {filteredGuides.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">没有找到匹配的攻略，换个关键词试试吧</p>
          </div>
        )}
      </div>

      {/* Submission Modal */}
      <SubmissionModal 
        isOpen={isSubmissionModalOpen} 
        onClose={() => setIsSubmissionModalOpen(false)} 
        type="guide" 
      />
    </div>
  );
}
