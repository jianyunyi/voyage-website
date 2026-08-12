import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock, DollarSign, MapPin, Route as RouteIcon, Star, CheckCircle2, ChevronRight, Train, Plane, Car, Zap } from "lucide-react";
import { fetchRoutes, type RouteOption } from "../lib/api";

const typeMeta: Record<string, { icon: ReactNode; color: string; bg: string }> = {
  driving: { icon: <Car className="w-6 h-6" />, color: "text-cyan-600", bg: "bg-cyan-100" },
  train: { icon: <Train className="w-6 h-6" />, color: "text-orange-600", bg: "bg-orange-100" },
  flight: { icon: <Plane className="w-6 h-6" />, color: "text-violet-600", bg: "bg-violet-100" },
  combined: { icon: <Zap className="w-6 h-6" />, color: "text-emerald-600", bg: "bg-emerald-100" },
};

export default function RouteDetail() {
  const { id } = useParams<{ id: string }>();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const originId = sp.get("originId") || "";
  const destId = sp.get("destId") || "";
  const originLngLat = sp.get("originLngLat") || "";
  const destLngLat = sp.get("destLngLat") || "";
  const originName = sp.get("originName") || "";
  const destName = sp.get("destName") || "";

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!originLngLat && !originId) { setError("缺少路线参数"); setLoading(false); return; }
    const originPoint = originLngLat ? { name: originName || "起点", lng: Number(originLngLat.split(",")[0]), lat: Number(originLngLat.split(",")[1]) } : undefined;
    const destPoint = destLngLat ? { name: destName || "终点", lng: Number(destLngLat.split(",")[0]), lat: Number(destLngLat.split(",")[1]) } : undefined;
    fetchRoutes(originId, destId, originPoint, destPoint)
      .then(r => { setRoutes(r); setLoading(false); })
      .catch(() => { setError("加载方案失败"); setLoading(false); });
  }, [originId, destId, originLngLat, destLngLat, originName, destName]);

  const route = routes.find(r => r.id === id);
  const others = routes.filter(r => r.id !== id).sort((a, b) => a.score - b.score);
  const meta = typeMeta[route?.type || "combined"] || typeMeta.combined;

  const tipsByType: Record<string, string[]> = {
  driving: ["建议提前检查车况与油量", "节假日高速免费/拥堵注意错峰", "长途驾驶每 2 小时休息一次"],
  train: ["建议提前 30 分钟到达车站", "取票进站需携带身份证", "高铁二等座性价比最高，商务座空间更佳"],
  flight: ["建议提前 2 小时到达机场", "托运行李限重留意航司规则", "值机选座可通过航司 App 提前办理"],
  combined: ["分段换乘注意预留 20-30 分钟接驳时间", "购票建议分段购买，退改灵活", "市内接驳优先地铁，避开高峰期打车"],
};

const scoreExplains = [
    { label: "时间成本", weight: "50%", value: route ? Math.round(route.timeSec / 60) : 0, unit: "分钟" },
    { label: "费用成本", weight: "30%", value: route?.priceValue || 0, unit: "元" },
    { label: "接驳便捷", weight: "20%", value: "—", unit: "" },
  ];

  const priceDetail = route ? (() => {
    const pv = route.priceValue || 0;
    switch (route.type) {
      case "train": return [
        { label: "二等座", price: `¥${pv}` },
        { label: "一等座", price: `约 ¥${Math.round(pv * 1.6 / 10) * 10}` },
        { label: "商务座", price: `约 ¥${Math.round(pv * 2.6 / 10) * 10}` },
      ];
      case "flight": return [
        { label: "经济舱", price: `¥${pv}` },
        { label: "超级经济舱", price: `约 ¥${Math.round(pv * 1.3 / 10) * 10}` },
        { label: "公务舱", price: `约 ¥${Math.round(pv * 2.8 / 10) * 10}` },
      ];
      default: return [
        { label: "参考费用", price: `¥${pv}` },
        { label: "费用构成", price: "油费 + 过路费 + 车辆损耗" },
        { label: "拼车均摊", price: "多人出行人均更低" },
      ];
    }
  })() : [];

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          aria-label="返回路线规划"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 dark:text-stone-400 hover:text-orange-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 返回路线规划
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-stone-500">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            方案加载中…
          </div>
        ) : error ? (
          <div className="py-24 text-center text-gray-500 dark:text-stone-400">{error}</div>
        ) : !route ? (
          <div className="py-24 text-center text-gray-500 dark:text-stone-400">方案不存在</div>
        ) : (
          <>
            {/* 方案 Hero */}
            <div className="bg-gray-50 dark:bg-stone-900 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-stone-800 mb-6">
              <div className="flex items-center gap-4 mb-5">
                <span className={`w-14 h-14 rounded-2xl ${meta.bg} ${meta.color} flex items-center justify-center`}>
                  {meta.icon}
                </span>
                <div>
                  <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-stone-100 flex items-center gap-2">
                    {route.label}方案
                    {route.isBest && (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">⭐ 最佳推荐</span>
                    )}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-stone-400 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {originName || "起点"} → {destName || "终点"}
                  </p>
                </div>
              </div>

              {route.bestReason && (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl px-4 py-3 text-sm mb-5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {route.bestReason}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-stone-800 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-stone-500 mb-1"><Clock className="w-3.5 h-3.5" /> 总耗时</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-stone-100">{route.timeLabel}</div>
                </div>
                <div className="bg-white dark:bg-stone-800 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-stone-500 mb-1"><DollarSign className="w-3.5 h-3.5" /> 参考费用</div>
                  <div className="text-xl font-bold text-orange-600">{route.price || "—"}</div>
                </div>
                <div className="bg-white dark:bg-stone-800 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-stone-500 mb-1"><RouteIcon className="w-3.5 h-3.5" /> 总里程</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-stone-100">{route.distanceLabel || "—"}</div>
                </div>
                <div className="bg-white dark:bg-stone-800 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-stone-500 mb-1"><Star className="w-3.5 h-3.5" /> 综合评分</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-stone-100">{route.score} <span className="text-xs text-gray-400">分</span></div>
                </div>
              </div>
              {route.tolls && (
                <p className="text-xs text-gray-400 dark:text-stone-500 mt-3">高速费：{route.tolls}</p>
              )}
            </div>

            {/* 分段时间轴 */}
            {route.legs && route.legs.length > 0 && (
              <div className="bg-gray-50 dark:bg-stone-900 rounded-2xl p-6 border border-gray-100 dark:border-stone-800 mb-6">
                <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-stone-100 mb-4">行程分段</h2>
                <div className="space-y-0">
                  {route.legs.map((leg, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`w-4 h-4 rounded-full border-2 ${i === 0 ? "bg-emerald-500 border-emerald-500" : i === route.legs!.length - 1 ? "bg-red-500 border-red-500" : "bg-white dark:bg-stone-800 border-orange-400"}`}></span>
                        {i < route.legs!.length - 1 && <span className="w-0.5 flex-grow min-h-8 bg-gray-200 dark:bg-stone-700"></span>}
                      </div>
                      <div className="pb-6 pt-0.5">
                        <span className="text-sm font-medium text-gray-800 dark:text-stone-200">{leg}</span>
                        {i === 0 && <span className="ml-2 text-xs text-emerald-600">起点</span>}
                        {i === route.legs!.length - 1 && <span className="ml-2 text-xs text-red-500">终点</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 费用明细 */}
            {route.type !== "combined" && priceDetail.length > 0 && (
              <div className="bg-gray-50 dark:bg-stone-900 rounded-2xl p-6 border border-gray-100 dark:border-stone-800 mb-6">
                <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-stone-100 mb-4">费用明细</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {priceDetail.map(d => (
                    <div key={d.label} className="bg-white dark:bg-stone-800 rounded-xl p-4">
                      <div className="text-sm font-medium text-gray-700 dark:text-stone-300 mb-1">{d.label}</div>
                      <div className="text-lg font-bold text-orange-600">{d.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 出行小贴士 */}
            <div className="bg-gray-50 dark:bg-stone-900 rounded-2xl p-6 border border-gray-100 dark:border-stone-800 mb-6">
              <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-stone-100 mb-4">出行小贴士</h2>
              <ul className="space-y-2.5">
                {(tipsByType[route.type] || tipsByType.combined).map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-stone-300">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* 评分构成 */}
            <div className="bg-gray-50 dark:bg-stone-900 rounded-2xl p-6 border border-gray-100 dark:border-stone-800 mb-6">
              <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-stone-100 mb-4">评分构成</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {scoreExplains.map(s => (
                  <div key={s.label} className="bg-white dark:bg-stone-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-stone-300">{s.label}</div>
                      <div className="text-xs text-gray-400 dark:text-stone-500">权重 {s.weight}</div>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-stone-100">{s.value}{s.unit}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-stone-500 mt-4">综合评分 = 时间 50% + 费用 30% + 接驳便捷 20%（分越低越优）</p>
            </div>

            {/* 其他方案对比 */}
            {others.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-stone-100 mb-4">其他方案</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {others.map(o => {
                    const om = typeMeta[o.type] || typeMeta.combined;
                    return (
                      <button
                        key={o.id}
                        onClick={() => navigate(`/plan/${o.id}?${sp.toString()}`)}
                        className="text-left bg-white dark:bg-stone-900 rounded-xl p-4 border border-gray-100 dark:border-stone-800 hover:border-orange-300 transition-colors group"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-8 h-8 rounded-lg ${om.bg} ${om.color} flex items-center justify-center`}>{om.icon}</span>
                          <span className="font-medium text-sm text-gray-900 dark:text-stone-100">{o.label}</span>
                          {o.isBest && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">⭐</span>}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-stone-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {o.timeLabel}</span>
                          <span className="text-orange-600 font-semibold">{o.price}</span>
                        </div>
                        <div className="flex items-center justify-end text-xs text-gray-400 group-hover:text-orange-600 mt-2">
                          查看 <ChevronRight className="w-3 h-3" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
