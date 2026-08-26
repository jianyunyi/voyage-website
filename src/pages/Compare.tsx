import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { subscribeAlertRemote } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Bell, Share2 } from "lucide-react";
import { Plane, Car, Building, ArrowRight, Check, Info, Search, MapPin, Calendar, Users, Loader2, Star, Hotel } from "lucide-react";
import { motion } from "framer-motion";
import { fetchCompare, type CompareItem } from "../lib/api";
import { handleHotelImageError, resolveHotelImage } from "../lib/hotel-images";

const categories = [
  { id: "transport", name: "交通工具", icon: Plane },
  { id: "hotel", name: "酒店住宿", icon: Building },
  { id: "car", name: "租车服务", icon: Car },
];

type HotelItem = CompareItem & {
  rating?: number;
  address?: string;
  location?: string;
  roomType?: string;
  cancellationPolicy?: string;
  breakfast?: string;
  unit?: string;
  source?: string;
  dataSource?: string;
};

export function isLiveResult(item: CompareItem): boolean {
  const hotel = item as HotelItem;
  return hotel.source === "mcp" || hotel.source === "live" || hotel.dataSource === "mcp";
}

export function getResultSourceLabel(item: CompareItem): string {
  return isLiveResult(item) ? "实时数据" : "参考数据";
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <div><dt className="text-xs text-stone-500 dark:text-stone-400">{label}</dt><dd className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-200">{value}</dd></div>;
}

function HotelCard({ item, index, onBook, onSubscribe, subscribed, subscribing }: {
  key?: string;
  item: HotelItem;
  index: number;
  onBook: (item: CompareItem) => void;
  onSubscribe: (item: CompareItem) => void;
  subscribed: boolean;
  subscribing: boolean;
}) {
  const title = item.name || "未命名酒店";
  const location = item.location || item.address;
  const roomType = item.roomType || item.time || "标准房型";
  const cancellation = item.cancellationPolicy || item.features.find(feature => feature.includes("取消"));
  const breakfast = item.breakfast || item.features.find(feature => feature.includes("早餐"));
  return <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.08 }} className={`surface surface-hover overflow-hidden ${index === 0 ? "border-orange-300 ring-1 ring-orange-100" : ""}`}>
    <div className="grid gap-0 lg:grid-cols-[minmax(280px,1.1fr)_minmax(260px,1fr)_180px]">
      <div className="hotel-image-overlay relative min-h-56 overflow-hidden bg-stone-200 lg:min-h-full"><img src={resolveHotelImage(item)} alt={title} loading="lazy" onError={handleHotelImageError} className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden="true" /><div className="absolute left-4 top-4 flex gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${isLiveResult(item) ? "bg-emerald-100 text-emerald-800" : "bg-stone-900/75 text-white"}`}>{getResultSourceLabel(item)}</span>{index === 0 && <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">全网最低</span>}</div><p className="absolute bottom-4 left-4 right-4 font-serif text-lg font-bold text-white drop-shadow">{title}</p></div>
      <div className="p-5 sm:p-6"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-600">{item.type || "酒店住宿"}</p><h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{title}</h2></div>{item.rating !== undefined && <span className="flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-sm font-bold text-orange-700"><Star className="h-4 w-4 fill-current" />{item.rating}</span>}</div>{location && <p className="mb-4 flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-300"><MapPin className="h-4 w-4 text-orange-600" />{location}</p>}<dl className="grid grid-cols-2 gap-x-4 gap-y-4"><Detail label="房型" value={roomType} /><Detail label="供应商" value={item.platform} /><Detail label="取消政策" value={cancellation} /><Detail label="早餐" value={breakfast} /></dl>{item.features.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{item.features.map((feature, featureIndex) => <span key={`${feature}-${featureIndex}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800"><Check className="h-3 w-3" />{feature}</span>)}</div>}</div>
      <div className="flex flex-col justify-between border-t border-stone-100 bg-stone-50/70 p-5 dark:border-stone-800 dark:bg-stone-950/40 sm:p-6 lg:border-l lg:border-t-0"><div><p className="text-xs text-stone-500 dark:text-stone-400">{item.platform}报价</p><p className="num mt-1 text-3xl font-bold text-orange-700 dark:text-orange-400">{item.price}</p><p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{item.unit || "每晚"} · 以平台最终价格为准</p></div><div className="mt-5 flex gap-2"><button onClick={() => onSubscribe(item)} disabled={subscribing || subscribed} className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-medium ${subscribed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-orange-200 bg-white text-orange-700 hover:bg-orange-50 dark:bg-stone-900"}`}><Bell className={`h-4 w-4 shrink-0 ${subscribed ? "fill-current" : ""}`} />{subscribed ? "已订阅" : subscribing ? "订阅中..." : "订阅降价"}</button><button onClick={() => onBook(item)} className="btn-primary min-w-0 flex-1 px-2 py-2.5 text-sm font-bold">去预订</button></div></div>
    </div>
  </motion.article>;
}

function ResultSkeleton() {
  return <div className="surface grid animate-pulse gap-5 overflow-hidden p-5 lg:grid-cols-[280px_1fr_170px]"><div className="h-48 rounded-xl bg-stone-200 dark:bg-stone-800" /><div className="space-y-4"><div className="h-4 w-24 rounded bg-stone-200 dark:bg-stone-800" /><div className="h-8 w-2/3 rounded bg-stone-200 dark:bg-stone-800" /><div className="h-4 w-full rounded bg-stone-200 dark:bg-stone-800" /><div className="h-4 w-1/2 rounded bg-stone-200 dark:bg-stone-800" /></div><div className="h-32 rounded-xl bg-stone-200 dark:bg-stone-800" /></div>;
}



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

  const handleSubscribe = async (item: CompareItem) => {
    if (subscribing) return;
    setSubscribing(item.id);
    try {
      const alerts = await subscribeAlertRemote({ itemId: item.id, title: item.name || item.type || item.platform, category: activeCategory, subscribedPrice: Number(item.priceValue ?? 0) }, accessToken);
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
          <div role="alert" className="surface mb-6 flex flex-wrap items-center justify-between gap-4 border-red-200 p-5 text-red-700">
            <span>{error}</span>
            <button onClick={() => void handleSearch(new Event("submit") as unknown as FormEvent)} className="rounded-lg underline">重试</button>
          </div>
        )}
        {isLoading && (
          <div className="space-y-4" aria-label="加载比价结果">
            {[0, 1, 2].map(index => <ResultSkeleton key={index} />)}
          </div>
        )}
        {!isLoading && !error && results.length > 0 && (
          activeCategory === "hotel" ? <div className="space-y-4">{results.map((item, index) => <HotelCard key={item.id} item={item as HotelItem} index={index} onBook={handleBook} onSubscribe={handleSubscribe} subscribed={subscribedIds.includes(item.id)} subscribing={subscribing === item.id} />)}</div> : <div className="space-y-4">{results.map((item, index) => <motion.div key={item.id} className="surface flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-3"><strong className="text-lg">{item.platform}</strong>{index === 0 && <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">全网最低</span>}</div><p className="mt-2 text-stone-600 dark:text-stone-300">{item.type ? `${item.type} · ${item.time || ""}` : item.name}</p><div className="mt-3 flex flex-wrap gap-2">{item.features.map(feature => <span key={feature} className="text-xs text-emerald-700">✓ {feature}</span>)}</div></div><div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end"><strong className="num text-2xl text-orange-700">{item.price}</strong><button onClick={() => handleBook(item)} className="btn-primary px-5 py-2 text-sm">去预订</button></div></motion.div>)}</div>
        )}
        {!isLoading && !error && results.length === 0 && (
          <div className="surface flex flex-col items-center justify-center px-6 py-16 text-center">
            <Hotel className="mb-4 h-10 w-10 text-orange-500" />
            <h2 className="font-serif text-2xl font-bold">还没有比价结果</h2>
            <p className="mt-2 text-sm text-stone-500">调整目的地或日期后，再试一次搜索。</p>
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

