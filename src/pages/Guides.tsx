import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, MapPin, Calendar, ThumbsUp, PlusCircle } from "lucide-react";
import { toggleLikeRemote, fetchLikesRemote, fetchPublicGuides, type PublicGuide } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import SubmissionModal from "../components/SubmissionModal";

import { travelGuides } from "../data/guides";
import { imgSrc } from "../lib/image";

export default function Guides() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const { accessToken } = useAuth();
  const [likesMap, setLikesMap] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [publishedGuides, setPublishedGuides] = useState<PublicGuide[]>([]);

  useEffect(() => {
    fetchPublicGuides().then(setPublishedGuides).catch(() => undefined);
  }, []);

  // 加载点赞状态
  useEffect(() => {
    if (!accessToken) return;
    fetchLikesRemote(travelGuides.map(g => g.id), accessToken)
      .then(setLikesMap)
      .catch(() => undefined);
  }, [accessToken]);

  const handleLike = async (guideId: string) => {
    if (!accessToken) return;
    try {
      const res = await toggleLikeRemote(guideId, accessToken);
      setLikesMap(prev => ({ ...prev, [guideId]: { count: res.count, liked: res.liked } }));
    } catch {
      // 忽略
    }
  };

  const allGuides = [...publishedGuides, ...travelGuides.filter(guide => !publishedGuides.some(item => item.id === guide.id))];
  const filteredGuides = allGuides.filter(guide =>
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    guide.destination.includes(searchQuery)
  );

  // 搜索词高亮
  const highlight = (text: string) => {
    if (!searchQuery.trim()) return text;
    const q = searchQuery.trim();
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-orange-100 text-orange-700 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div className="page-shell pb-20">
      {/* Header */}
      <div className="border-b border-[#e2e7e4] bg-white/70 py-14 dark:border-stone-800 dark:bg-stone-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
            <div>
              <p className="editorial-kicker mb-3">旅行编辑部</p>
              <h1 className="editorial-title text-4xl md:text-5xl font-bold text-gray-900 dark:text-stone-100 mb-4">精选旅行攻略</h1>
              <p className="text-lg text-gray-600 dark:text-stone-300 max-w-3xl">发现真实旅行者的足迹，获取详细的行程安排、预算规划和避坑指南。</p>
            </div>
            <button 
              onClick={() => setIsSubmissionModalOpen(true)}
              className="btn-primary flex items-center gap-2 px-6 py-3 font-semibold whitespace-nowrap"
            >
              <PlusCircle className="w-5 h-5" />
              发布攻略
            </button>
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 dark:text-stone-500" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-stone-600 rounded-xl leading-5 bg-white dark:bg-stone-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="搜索目的地、景点或攻略标题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
              <button className="flex items-center justify-center gap-2 rounded-xl border border-[#e2e7e4] bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:border-[#d95f32] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">
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
              className="surface surface-hover group cursor-pointer overflow-hidden flex flex-col"
              onClick={() => navigate(`/guide/${guide.id}`)}
            >
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={imgSrc(guide.image, 600)} 
                  alt={guide.title} 
                  loading="lazy"
                  decoding="async"
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-stone-100 mb-3 line-clamp-2 group-hover:text-orange-600 transition-colors">
                  {highlight(guide.title)}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-stone-400 mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {highlight(guide.destination)}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {guide.days}天</span>
                  <span className="flex items-center gap-1">¥{guide.budget}</span>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                      {guide.author.charAt(0)}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-stone-300">{guide.author}</span>
                  </div>
                  <button
                    onClick={() => handleLike(guide.id)}
                    className={`flex items-center gap-1 text-sm transition-colors ${
                      likesMap[guide.id]?.liked ? "text-orange-600" : "text-gray-400 dark:text-stone-500 hover:text-orange-500"
                    }`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${likesMap[guide.id]?.liked ? "fill-orange-600" : ""}`} />
                    <span>{(likesMap[guide.id]?.count ?? guide.likes).toLocaleString()}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {filteredGuides.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-stone-400 text-lg">没有找到匹配的攻略，换个关键词试试吧</p>
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
