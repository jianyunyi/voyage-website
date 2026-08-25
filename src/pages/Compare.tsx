import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { subscribeAlertRemote } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Bell, Share2 } from "lucide-react";
import { Plane, Car, Building, ArrowRight, Check, Info, Search, MapPin, Calendar, Users, Loader2, Star } from "lucide-react";
import { motion } from "framer-motion";
import { fetchCompare, type CompareItem } from "../lib/api";

const categories = [
  { id: "transport", name: "交通工具", icon: Plane },
  { id: "hotel", name: "酒店住宿", icon: Building },
  { id: "car", name: "租车服务", icon: Car },
];



export default function Compare() {
  const { accessToken } = useAuth();
  const [subscribedIds, setSubscribedIds] = useState<string[]>([]);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("hotel");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const [shared, setShared] = useState(false);
  const [searchParams, setSearchParams] = useState({
    destination: "成都",
    checkIn: "2026-10-01",
    checkOut: "2026-10-07",
    adults: 2,
    origin: "北京",
  });

  const [results, setResults] = useState<CompareItem[]>([]);
  const [error, setError] = useState<string>("");

  // 分享链接：携带参数自动搜索
  useEffect(() => {
    const cat = urlParams.get("category");
    const dest = urlParams.get("destination");
    if (!cat || !dest) return;
    const initial = {
      destination: dest,
      checkIn: urlParams.get("checkIn") || "2026-10-01",
      checkOut: urlParams.get("checkOut") || "2026-10-07",
      adults: Number(urlParams.get("adults")) || 2,
      origin: urlParams.get("origin") || "北京",
    };
    setActiveCategory(cat);
    setSearchParams(initial);
    (async () => {
      setIsLoading(true);
      setError("");
      try {
        const items = await fetchCompare({
          category: cat as "transport" | "hotel" | "car",
          destination: initial.destination,
          origin: initial.origin,
          checkIn: initial.checkIn,
          checkOut: initial.checkOut,
        });
        setResults(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "比价服务暂时不可用");
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 分享：复制带参数的链接
  const handleShare = async () => {
    const params = new URLSearchParams({
      category: activeCategory,
      destination: searchParams.destination,
      origin: searchParams.origin,
      checkIn: searchParams.checkIn,
      checkOut: searchParams.checkOut,
      adults: String(searchParams.adults),
    });
    const url = `${window.location.origin}/compare?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      window.prompt("复制比价分享链接：", url);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const items = await fetchCompare({
        category: activeCategory as "transport" | "hotel" | "car",
        destination: searchParams.destination,
        origin: searchParams.origin,
        checkIn: searchParams.checkIn,
        checkOut: searchParams.checkOut,
      });
      setResults(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "比价服务暂时不可用");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBook = (item: any) => {
    if (activeCategory === "hotel") {
      navigate(`/hotel/${item.id}`);
    } else if (item.url) {
      window.open(item.url, '_blank');
    }
  };

  const handleSubscribe = async (item: { id: string; title: string; category: string; price: number }) => {
    if (subscribing) return;
    setSubscribing(item.id);
    try {
      const alerts = await subscribeAlertRemote({ itemId: item.id, title: item.title, category: item.category, subscribedPrice: item.price }, accessToken);
      setSubscribedIds(alerts.map(a => a.itemId));
    } catch (err) {
      console.error("订阅失败:", err);
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div className="page-shell min-h-screen py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-3xl">
          <p className="editorial-kicker mb-3">决策工具</p>
          <h1 className="editorial-title text-4xl md:text-5xl font-bold text-gray-900 dark:text-stone-100 mb-4">全网综合比价</h1>
          <p className="text-lg text-gray-600 dark:text-stone-300 max-w-2xl mx-auto">
            一键对比各大平台价格，帮您找到最划算的预订方案。数据实时更新，确保价格准确。
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center justify-center gap-3 mb-12 flex-wrap">
          <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-full font-medium transition-all ${
              shared ? "bg-emerald-100 text-emerald-700" : "bg-white dark:bg-stone-900 text-orange-600 border border-orange-200 hover:bg-orange-50"
            }`}
          >
            {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {shared ? "已复制" : "分享比价"}
          </button>
          <div className="bg-white dark:bg-stone-900 p-1 rounded-2xl shadow-sm inline-flex">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? "bg-gray-900 text-white shadow-md" 
                      : "text-gray-600 dark:text-stone-300 hover:text-gray-900 dark:text-stone-100 hover:bg-gray-100"
                  }`}
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Form */}
          <div className="surface mb-8 p-6">
          {activeCategory === "hotel" ? (
            <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-gray-500 dark:text-stone-400 mb-1">目的地</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-gray-400 dark:text-stone-500" />
                  </div>
                  <input 
                    type="text" 
                    required 
                    value={searchParams.destination} 
                    onChange={e => setSearchParams({...searchParams, destination: e.target.value})} 
                    className="block w-full pl-9 pr-3 py-3 border border-gray-300 dark:border-stone-600 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500" 
                    placeholder="城市/区域/酒店名" 
                  />
                </div>
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-gray-500 dark:text-stone-400 mb-1">入住日期</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-stone-500" />
                  </div>
                  <input 
                    type="date" 
                    required 
                    value={searchParams.checkIn} 
                    onChange={e => setSearchParams({...searchParams, checkIn: e.target.value})} 
                    className="block w-full pl-9 pr-3 py-3 border border-gray-300 dark:border-stone-600 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500" 
                  />
                </div>
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-gray-500 dark:text-stone-400 mb-1">退房日期</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-stone-500" />
                  </div>
                  <input 
                    type="date" 
                    required 
                    value={searchParams.checkOut} 
                    onChange={e => setSearchParams({...searchParams, checkOut: e.target.value})} 
                    className="block w-full pl-9 pr-3 py-3 border border-gray-300 dark:border-stone-600 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500" 
                  />
                </div>
              </div>
              <div className="w-full lg:w-32">
                <label className="block text-xs font-medium text-gray-500 dark:text-stone-400 mb-1">成人</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-4 w-4 text-gray-400 dark:text-stone-500" />
                  </div>
                  <input 
                    type="number" 
                    min="1" 
                    required 
                    value={searchParams.adults} 
                    onChange={e => setSearchParams({...searchParams, adults: parseInt(e.target.value)})} 
                    className="block w-full pl-9 pr-3 py-3 border border-gray-300 dark:border-stone-600 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500" 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full lg:w-auto bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:bg-orange-400"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                搜索
              </button>
            </form>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-between py-2">
              <div className="flex items-center gap-4 mb-4 md:mb-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-stone-400">北京</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 dark:text-stone-500" />
                  <span className="font-bold text-gray-900 dark:text-stone-100">成都</span>
                </div>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="text-gray-600 dark:text-stone-300">10月1日 - 10月7日</span>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="text-gray-600 dark:text-stone-300">2成人</span>
              </div>
              <button onClick={() => setActiveCategory("hotel")} className="text-orange-600 font-medium hover:text-orange-700 text-sm">
                切换到酒店搜索
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-red-500 mb-2">{error}</p>
            <button onClick={handleSearch} className="text-sm text-gray-500 dark:text-stone-400 underline">重试</button>
          </div>
        )}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-stone-400">正在全网比价中，请稍候...</p>
          </div>
        )}
        {!isLoading && !error && results.length > 0 && (
          <div className="space-y-4">
            {results.map((item, index) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border transition-colors ${
                  index === 0 ? "border-orange-300 ring-1 ring-orange-100" : "border-gray-100 dark:border-stone-800 hover:border-gray-300 dark:border-stone-600"
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg text-gray-900 dark:text-stone-100">{item.platform}</span>
                      {index === 0 && (
                        <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
                          <Star className="w-3 h-3" /> 全网最低
                        </span>
                      )}
                    </div>
                    <div className="text-gray-600 dark:text-stone-300 mb-3">
                      {item.type ? `${item.type} | ${item.time || ""}` : item.name}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.features.map((feature, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                          <Check className="w-3 h-3" /> {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4">
                    <div className="text-3xl font-bold text-orange-600 num">{item.price}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubscribe({ id: item.id, title: item.title, category: activeCategory, price: Number(item.priceValue ?? 0) })}
                        disabled={subscribing === item.id || subscribedIds.includes(item.id)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
                          subscribedIds.includes(item.id)
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-white dark:bg-stone-900 border border-orange-200 text-orange-600 hover:bg-orange-50"
                        }`}
                      >
                        <Bell className={`w-4 h-4 ${subscribedIds.includes(item.id) ? "fill-emerald-600" : ""}`} />
                        {subscribedIds.includes(item.id) ? "已订阅" : subscribing === item.id ? "订阅中..." : "订阅降价"}
                      </button>
                      <button 
                        onClick={() => handleBook(item)}
                        className={`px-8 py-3 rounded-xl font-medium transition-colors ${
                        index === 0 
                          ? "bg-orange-600 hover:bg-orange-700 text-white shadow-md" 
                          : "bg-gray-100 hover:bg-gray-200 text-gray-900 dark:text-stone-100"
                      }`}>
                        去预订
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {!isLoading && !error && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-gray-400 dark:text-stone-500">点击搜索开始比价</p>
          </div>
        )}
        
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-stone-400 flex items-center justify-center gap-1">
          <Info className="w-4 h-4" />
          价格每15分钟更新一次，最终价格以各平台实际显示为准。
        </div>
      </div>
    </div>
  );
}

