import { useState, useMemo, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Filter,
  Loader2,
  MapPin,
  PlusCircle,
  Search,
  ThumbsUp,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SubmissionModal from "../components/SubmissionModal";
import { usePreferences } from "../context/PreferencesContext";
import { fetchPublishedGuides, type TravelGuide } from "../lib/guideService";

export default function Guides() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [guides, setGuides] = useState<TravelGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { preferences } = usePreferences();

  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState("全部");
  const [selectedDays, setSelectedDays] = useState("全部");
  const [selectedBudget, setSelectedBudget] = useState("全部");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const loadGuides = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const data = await fetchPublishedGuides();
    if (data.length === 0) {
      setLoadError("暂无攻略数据，请确认 API 服务已启动");
    }
    setGuides(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  const uniqueDestinations = useMemo(() => {
    return Array.from(new Set(guides.map((g) => g.destination)));
  }, [guides]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    guides.forEach((g) => g.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [guides]);

  const filteredGuides = guides.filter((guide) => {
    const matchSearch =
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.destination.includes(searchQuery);

    const matchDestination =
      selectedDestination === "全部" || guide.destination === selectedDestination;

    let matchDays = true;
    if (selectedDays === "1-3天") matchDays = guide.days >= 1 && guide.days <= 3;
    else if (selectedDays === "4-7天") matchDays = guide.days >= 4 && guide.days <= 7;
    else if (selectedDays === "8天以上") matchDays = guide.days >= 8;

    let matchBudget = true;
    if (selectedBudget === "2000元以下") matchBudget = guide.budget <= 2000;
    else if (selectedBudget === "2000-5000元")
      matchBudget = guide.budget > 2000 && guide.budget <= 5000;
    else if (selectedBudget === "5000元以上") matchBudget = guide.budget > 5000;

    const matchTags =
      selectedTags.length === 0 || selectedTags.every((tag) => guide.tags.includes(tag));

    return matchSearch && matchDestination && matchDays && matchBudget && matchTags;
  }).sort((a, b) => {
    const aPrefDest = preferences.destinations.includes(a.destination);
    const bPrefDest = preferences.destinations.includes(b.destination);

    const aPrefType = preferences.travelTypes.some((t) => a.tags.includes(t));
    const bPrefType = preferences.travelTypes.some((t) => b.tags.includes(t));

    const aScore = (aPrefDest ? 2 : 0) + (aPrefType ? 1 : 0);
    const bScore = (bPrefDest ? 2 : 0) + (bPrefType ? 1 : 0);

    if (aScore !== bScore) return bScore - aScore;

    return b.likes - a.likes;
  });

  const hasActiveFilters =
    selectedDestination !== "全部" ||
    selectedDays !== "全部" ||
    selectedBudget !== "全部" ||
    selectedTags.length > 0;

  const clearFilters = () => {
    setSelectedDestination("全部");
    setSelectedDays("全部");
    setSelectedBudget("全部");
    setSelectedTags([]);
  };

  return (
    <main className="voyage-content-page voyage-guides">
      <div className="voyage-guides__intro bg-white border-b border-gray-200/50 py-16">
        <div className="voyage-guides__intro-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                精选旅行攻略
              </h1>
              <p className="text-lg text-gray-600 max-w-3xl font-medium">
                发现真实旅行者的足迹，获取详细的行程安排、预算规划和避坑指南。
              </p>
            </div>
            <button
              onClick={() => setIsSubmissionModalOpen(true)}
              className="voyage-guides__publish flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-full font-bold transition-all duration-300 shadow-lg shadow-orange-600/20 whitespace-nowrap hover:-translate-y-1"
            >
              <PlusCircle className="w-5 h-5" />
              发布攻略
            </button>
          </div>

          <div className="voyage-guides__search-rail mt-8 flex flex-col sm:flex-row gap-4">
            <div className="voyage-guides__search-field relative flex-grow max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-full leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all sm:text-sm"
                placeholder="搜索目的地、景点或攻略标题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`voyage-guides__filter-toggle flex items-center justify-center gap-2 px-6 py-3.5 border rounded-full transition-all duration-300 font-bold ${
                hasActiveFilters || isFilterExpanded
                  ? "bg-orange-50 border-orange-200 text-orange-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-5 h-5" />
              筛选{" "}
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-orange-500 ml-1"></span>
              )}
            </button>
          </div>

          <AnimatePresence>
            {isFilterExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="voyage-guides__filter-panel pt-6 mt-6 border-t border-gray-100 space-y-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-900">高级筛选</h3>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-sm text-gray-500 hover:text-orange-600 flex items-center gap-1"
                      >
                        <X className="w-4 h-4" /> 清空筛选
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">目的地</label>
                      <select
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white"
                        value={selectedDestination}
                        onChange={(e) => setSelectedDestination(e.target.value)}
                      >
                        <option value="全部">全部目的地</option>
                        {uniqueDestinations.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">游玩天数</label>
                      <select
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white"
                        value={selectedDays}
                        onChange={(e) => setSelectedDays(e.target.value)}
                      >
                        <option value="全部">全部天数</option>
                        <option value="1-3天">1-3天</option>
                        <option value="4-7天">4-7天</option>
                        <option value="8天以上">8天以上</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">人均预算</label>
                      <select
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white"
                        value={selectedBudget}
                        onChange={(e) => setSelectedBudget(e.target.value)}
                      >
                        <option value="全部">全部预算</option>
                        <option value="2000元以下">2000元以下</option>
                        <option value="2000-5000元">2000-5000元</option>
                        <option value="5000元以上">5000元以上</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">特色标签</label>
                    <div className="flex flex-wrap gap-2">
                      {uniqueTags.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              setSelectedTags((prev) =>
                                isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                              );
                            }}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-orange-100 text-orange-700 border-orange-200 border"
                                : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <section className="voyage-guides__index max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="voyage-guides__index-heading mb-8 flex justify-between items-end">
          <h2 className="text-2xl font-serif font-bold text-gray-900">全部攻略</h2>
          <span className="text-sm text-gray-500 font-medium">
            {preferences.destinations.length > 0 || preferences.travelTypes.length > 0
              ? "已根据您的偏好优先展示"
              : "按热度排序"}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>加载攻略中...</span>
          </div>
        ) : loadError && guides.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-4">{loadError}</p>
            <button
              onClick={loadGuides}
              className="text-orange-600 font-bold hover:text-orange-700"
            >
              重新加载
            </button>
          </div>
        ) : (
          <div className="voyage-guides__list grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredGuides.map((guide, index) => {
              const isPref =
                preferences.destinations.includes(guide.destination) ||
                preferences.travelTypes.some((t) => guide.tags.includes(t));
              return (
                <motion.div
                  key={guide.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="voyage-guide-card bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 group cursor-pointer flex flex-col relative hover:-translate-y-1"
                >
                  <div className="voyage-guide-card__image relative h-64 overflow-hidden">
                    <img
                      src={guide.image}
                      alt={guide.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      {guide.tags.slice(0, 2).map((tag, i) => (
                        <span
                          key={i}
                          className="bg-black/40 backdrop-blur-md text-white text-xs font-bold tracking-wide px-3 py-1.5 rounded-full border border-white/10"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {guide.source === "user" && (
                      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md text-gray-800 px-3 py-1 rounded-full text-xs font-bold">
                        旅行者投稿
                      </div>
                    )}
                    {isPref && (
                      <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm tracking-wide">
                        匹配偏好
                      </div>
                    )}
                  </div>

                  <div className="voyage-guide-card__body p-8 flex flex-col flex-grow">
                    <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4 line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {guide.title}
                    </h3>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 font-medium">
                      <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md">
                        <MapPin className="w-4 h-4" /> {guide.destination}
                      </span>
                      <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md">
                        <CalendarDays className="w-4 h-4" /> {guide.days}天
                      </span>
                      <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md">
                        ¥{guide.budget}
                      </span>
                    </div>

                    <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-bold">
                          {guide.author.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-gray-700">{guide.author}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400 text-sm font-bold group-hover:text-orange-500 transition-colors">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{guide.likes}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {!loading && filteredGuides.length === 0 && guides.length > 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">没有找到匹配的攻略，换个筛选条件试试吧</p>
          </div>
        )}
      </section>

      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        type="guide"
        onSuccess={loadGuides}
      />
    </main>
  );
}
