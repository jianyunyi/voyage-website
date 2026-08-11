import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Coffee, Building, Plane, Calendar, Sparkles, Loader2, Plus, X, Clock } from "lucide-react";
import { generateItineraryRemote, saveItineraryRemote, type ItineraryDay } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Bookmark } from "lucide-react";

const CITIES = ["北京", "上海", "广州", "成都", "西安", "重庆", "厦门", "泉州"];

const BUDGETS = [
  { id: "budget", name: "经济", desc: "连锁酒店·特色小吃" },
  { id: "moderate", name: "舒适", desc: "舒适酒店·口碑餐厅" },
  { id: "luxury", name: "豪华", desc: "五星酒店·高端餐厅" },
] as const;

const PACES = [
  { id: "fastest", name: "紧凑", desc: "多景点打卡" },
  { id: "balanced", name: "均衡", desc: "张弛有度" },
  { id: "relaxed", name: "轻松", desc: "深度慢游" },
] as const;

const INTERESTS = ["美食", "历史", "自然", "购物", "摄影", "夜生活"];

// 步骤类型 → 图标
const typeIcon = (type: string) => {
  switch (type) {
    case "food": return <Coffee className="w-4 h-4 text-orange-500" />;
    case "hotel": return <Building className="w-4 h-4 text-blue-500" />;
    case "transport": return <Plane className="w-4 h-4 text-cyan-600" />;
    default: return <MapPin className="w-4 h-4 text-emerald-500" />;
  }
};

const typeLabel: Record<string, string> = {
  food: "美食", hotel: "住宿", transport: "交通", sightseeing: "游览",
};

export default function Itinerary() {
  const { accessToken } = useAuth();
  const [origin, setOrigin] = useState("北京");
  const [destinations, setDestinations] = useState<string[]>(["成都"]);
  const [destInput, setDestInput] = useState("");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-10-03");
  const [budget, setBudget] = useState<"budget" | "moderate" | "luxury">("moderate");
  const [pace, setPace] = useState<"fastest" | "balanced" | "relaxed">("balanced");
  const [interests, setInterests] = useState<string[]>([]);
  const [days, setDays] = useState<ItineraryDay[] | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const addDestination = () => {
    const city = destInput.trim();
    if (city && !destinations.includes(city) && CITIES.includes(city)) {
      setDestinations([...destinations, city]);
    }
    setDestInput("");
  };

  const removeDestination = (city: string) => {
    setDestinations(destinations.filter(d => d !== city));
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (destinations.length === 0) {
      setError("请至少选择一个目的地");
      return;
    }
    if (startDate > endDate) {
      setError("结束日期不能早于开始日期");
      return;
    }
    setLoading(true);
    setError("");
    setDays(null);
    try {
      const result = await generateItineraryRemote({
        origin,
        destinations,
        dates: { start: startDate, end: endDate },
        preferences: { budget, travel_mode: pace, interests: interests.length ? interests : undefined },
      });
      setDays(result.days);
      setSources(result.sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成行程失败");
    } finally {
      setLoading(false);
    }
  };

  const isAi = sources.includes("deepseek");

  const handleSave = async () => {
    if (!days || saving) return;
    setSaving(true);
    try {
      await saveItineraryRemote({
        title: `${destinations.join("、")} ${days.length}日行程`,
        destination: destinations.join("、"),
        days: days.length,
        startDate: startDate,
        endDate: endDate,
        budget: BUDGETS.find(b => b.id === budget)?.name,
        dayData: days.map(d => ({ day: d.day, date: d.date, steps: d.steps })),
      }, accessToken);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-stone-950 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-stone-100 mb-4">AI 智能行程</h1>
          <p className="text-lg text-gray-600 dark:text-stone-300 max-w-2xl mx-auto">
            告诉我去哪、玩几天、什么预算——AI 为你生成专属旅行计划。
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleGenerate} className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-stone-800 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 出发地 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-stone-400 mb-1">出发地</label>
              <select
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                className="w-full border-gray-300 dark:border-stone-600 rounded-lg shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
              >
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* 目的地（多选） */}
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-stone-400 mb-1">目的地（可多个）</label>
              <div className="flex gap-1">
                <select
                  value={destInput}
                  onChange={e => setDestInput(e.target.value)}
                  className="flex-1 border-gray-300 dark:border-stone-600 rounded-lg shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
                >
                  <option value="">选择城市</option>
                  {CITIES.filter(c => !destinations.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  type="button"
                  onClick={addDestination}
                  className="px-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {destinations.map(city => (
                  <span key={city} className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-md">
                    {city}
                    <button type="button" onClick={() => removeDestination(city)} className="hover:text-orange-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 日期 */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-stone-400 mb-1">出行日期</label>
              <div className="flex gap-2 items-center">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 border-gray-300 dark:border-stone-600 rounded-lg shadow-sm focus:border-orange-500 sm:text-sm p-2 border" />
                <span className="text-gray-400 dark:text-stone-500 text-sm">至</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 border-gray-300 dark:border-stone-600 rounded-lg shadow-sm focus:border-orange-500 sm:text-sm p-2 border" />
              </div>
            </div>

            {/* 预算 */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-stone-400 mb-1">预算</label>
              <div className="grid grid-cols-3 gap-2">
                {BUDGETS.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBudget(b.id)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      budget === b.id ? "border-orange-500 bg-orange-50" : "border-gray-200 dark:border-stone-700 hover:border-gray-300 dark:border-stone-600"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-stone-100">{b.name}</div>
                    <div className="text-xs text-gray-500 dark:text-stone-400">{b.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 节奏 */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-stone-400 mb-1">旅行节奏</label>
              <div className="grid grid-cols-3 gap-2">
                {PACES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPace(p.id)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      pace === p.id ? "border-orange-500 bg-orange-50" : "border-gray-200 dark:border-stone-700 hover:border-gray-300 dark:border-stone-600"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-stone-100">{p.name}</div>
                    <div className="text-xs text-gray-500 dark:text-stone-400">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 兴趣 */}
            <div className="lg:col-span-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-stone-400 mb-1">兴趣偏好（可多选）</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleInterest(i)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                      interests.includes(i)
                        ? "bg-orange-600 text-white border-orange-600"
                        : "bg-white dark:bg-stone-900 text-gray-600 dark:text-stone-300 border-gray-200 dark:border-stone-700 hover:border-orange-300"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> AI 正在规划行程...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> 生成我的行程
              </>
            )}
          </button>
        </form>

        {/* 结果 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-stone-400">AI 正在为你规划最优行程...</p>
          </div>
        )}

        {!loading && days && (
          <div>
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-stone-100">我的行程</h2>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`ml-auto flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium transition-all ${
                  saved ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-emerald-600" : ""}`} />
                {saved ? "已保存" : saving ? "保存中..." : "保存行程"}
              </button>
              {isAi ? (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  <Sparkles className="w-3 h-3" /> AI 生成
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:text-stone-300 font-medium">
                  模板生成
                </span>
              )}
            </div>

            <AnimatePresence>
              <div className="space-y-6">
                {days.map((day) => (
                  <motion.div
                    key={day.day}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-stone-800"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-stone-100">第 {day.day} 天</div>
                        <div className="text-sm text-gray-500 dark:text-stone-400">{day.date}</div>
                      </div>
                    </div>

                    <div className="relative pl-6">
                      {/* 时间轴竖线 */}
                      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
                      <div className="space-y-4">
                        {day.steps.map((step, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white dark:bg-stone-900 border-2 border-orange-400 flex items-center justify-center" />
                            <div className="flex items-start gap-3">
                              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-stone-400 w-14 flex-shrink-0">
                                <Clock className="w-3.5 h-3.5" />
                                {step.time}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {typeIcon(step.type)}
                                  <span className="font-medium text-gray-900 dark:text-stone-100">{step.title}</span>
                                  <span className="text-xs text-gray-400 dark:text-stone-500">{typeLabel[step.type] || step.type}</span>
                                </div>
                                {step.description && (
                                  <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">{step.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
