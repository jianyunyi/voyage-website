/**
 * VoyageX Routes API — 多方案路线聚合（驾车/高铁/飞机）
 *
 * 端点：GET /api/route?originId={id}&destId={id}
 * 数据源：当前为 mock（基于城市对的距离估算），驾车方案由高德前端实时计算。
 * 未来接入真实平台：替换为 12306/航司 API 聚合。
 */

export interface RouteOption {
  id: string;
  type: "driving" | "train" | "flight" | "combined";
  label: string;
  timeSec: number;
  timeLabel: string;
  distanceMeters?: number;
  distanceLabel?: string;
  price?: string;
  priceValue?: number;
  tolls?: string;
  tag?: string;
  score: number;
  isBest?: boolean;
  bestReason?: string;
  legs?: string[];
  source: "amap" | "estimate";
}

interface CityInfo {
  id: string;
  name: string;
  keyword: string;
}

/** 用户搜索定位的起点/终点（经纬度） */
export interface PlacePoint {
  name: string;
  lng: number;
  lat: number;
}

// 城市坐标（近似，用于距离估算）
const CITY_COORDS: Record<string, [number, number]> = {
  "c1": [116.4074, 39.9042],  // 北京
  "c2": [121.4737, 31.2304],  // 上海
  "c3": [113.2644, 23.1291],  // 广州
  "c4": [104.0665, 30.5728],  // 成都
  "c5": [108.9398, 34.3416],  // 西安
  "c6": [106.5516, 29.5630],  // 重庆
  "c7": [118.0894, 24.4798],  // 厦门
  "c8": [118.6004, 24.9010],  // 泉州
};

const CITIES: Record<string, CityInfo> = {
  "c1": { id: "c1", name: "北京", keyword: "北京市" },
  "c2": { id: "c2", name: "上海", keyword: "上海市" },
  "c3": { id: "c3", name: "广州", keyword: "广州市" },
  "c4": { id: "c4", name: "成都", keyword: "成都市" },
  "c5": { id: "c5", name: "西安", keyword: "西安市" },
  "c6": { id: "c6", name: "重庆", keyword: "重庆市" },
  "c7": { id: "c7", name: "厦门", keyword: "厦门市" },
  "c8": { id: "c8", name: "泉州", keyword: "泉州市" },
};

/** 大圆距离（公里） */
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = (b[1] - a[1]) * Math.PI / 180;
  const dLon = (b[0] - a[0]) * Math.PI / 180;
  const lat1 = a[1] * Math.PI / 180;
  const lat2 = b[1] * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface RouteQuery {
  origin: string;
  dest: string;
  originPoint?: PlacePoint;
  destPoint?: PlacePoint;
}

/** 计算组合/动态评分后的多方案路线 */
export async function getRoutes(query: RouteQuery): Promise<RouteOption[]> {
  // 解析起点/终点：优先用户定位坐标，否则城市 ID 中心
  const originPoint = query.originPoint || pointFromCity(query.origin);
  const destPoint = query.destPoint || pointFromCity(query.dest);
  if (!originPoint || !destPoint || (query.origin === query.dest && !query.originPoint)) {
    return [];
  }

  const distanceKm = haversineKm([originPoint.lng, originPoint.lat], [destPoint.lng, destPoint.lat]);
  if (distanceKm < 2) return [];

  const roadFactor = 1.3; // 公路距离 ≈ 直线 × 1.3
  const destName = destPoint.name || query.dest;

  // ---- 各干线基础测算 ----
  const drivingSec = (distanceKm * roadFactor / 90) * 3600;         // 驾车均速 90km/h
  const trainSec = (distanceKm / 250) * 3600;                       // 高铁均速 250km/h
  const trainPrice = Math.round(distanceKm * 0.45 / 10) * 10;       // ~0.45 元/km
  const flightSec = (distanceKm / 700 + 2) * 3600;                  // 飞机 + 2h 机场周转
  const flightPrice = Math.round(distanceKm * 0.8 / 10) * 10;       // ~0.8 元/km
  const tolls = distanceKm * roadFactor > 500 ? Math.round(distanceKm * roadFactor * 0.4) : 0;

  const fmtDur = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`;
  };
  const fmtPrice = (v: number) => v > 0 ? `¥${v}` : undefined;

  // 市内接驳估算（起终点各 ~30 分钟）
  const feederSec = 2 * 30 * 60;

  // ---- 方案组（含组合）----
  const options: RouteOption[] = [];

  // 1. 驾车（最自由，含过路费）
  options.push({
    id: "driving",
    type: "driving",
    label: "驾车",
    timeSec: drivingSec,
    timeLabel: fmtDur(drivingSec),
    distanceMeters: Math.round(distanceKm * roadFactor * 1000),
    distanceLabel: `${(distanceKm * roadFactor).toFixed(1)}公里`,
    tolls: tolls > 0 ? `约¥${tolls}` : "免费",
    tag: "最自由",
    score: 0, // 占位，统一评分
    source: "estimate",
  });

  // 2. 高铁直达（含两端地铁接驳）
  options.push({
    id: "train",
    type: "train",
    label: "高铁",
    timeSec: trainSec + feederSec,
    timeLabel: fmtDur(trainSec + feederSec),
    distanceMeters: Math.round(distanceKm * 1000),
    distanceLabel: `${distanceKm.toFixed(1)}公里`,
    price: fmtPrice(trainPrice),
    priceValue: trainPrice,
    tag: "性价比最高",
    legs: ["地铁/公交 30分钟", `高铁 ${fmtDur(trainSec)}`, "地铁/公交 30分钟"],
    score: 0,
    source: "estimate",
  });

  // 3. 飞机（含机场快线接驳）
  options.push({
    id: "flight",
    type: "flight",
    label: "飞机",
    timeSec: flightSec + feederSec,
    timeLabel: fmtDur(flightSec + feederSec),
    distanceMeters: Math.round(distanceKm * 1000),
    distanceLabel: `${distanceKm.toFixed(1)}公里`,
    price: fmtPrice(flightPrice),
    priceValue: flightPrice,
    tag: "最快捷",
    legs: ["机场快线 30分钟", `航班 ${fmtDur(flightSec - 2 * 3600)}`, "机场快线 30分钟"],
    score: 0,
    source: "estimate",
  });

  // 4. 智能组合（干线选择 + 两端接驳；长距离优先飞机干线，短距离高铁）
  const useFlightTrunk = distanceKm > 900;
  const combinedSec = (useFlightTrunk ? flightSec : trainSec) + feederSec;
  const combinedPrice = useFlightTrunk ? flightPrice : trainPrice;
  options.push({
    id: "combined",
    type: "combined",
    label: "智能组合",
    timeSec: combinedSec,
    timeLabel: fmtDur(combinedSec),
    distanceMeters: Math.round(distanceKm * 1000),
    distanceLabel: `${distanceKm.toFixed(1)}公里`,
    price: fmtPrice(combinedPrice),
    priceValue: combinedPrice,
    tag: useFlightTrunk ? "长途最优" : "短途最优",
    legs: useFlightTrunk
      ? ["地铁 20分钟", `航班 ${fmtDur(flightSec - 2 * 3600)}`, `机场快线→${destName}`]
      : ["地铁 20分钟", `高铁 ${fmtDur(trainSec)}`, `地铁→${destName}`],
    score: 0,
    source: "estimate",
  });

  // ---- 动态评分：时间 50% + 价格 30% + 便捷 20%（分越低越好）----
  const maxTime = Math.max(...options.map(o => o.timeSec));
  const maxPrice = Math.max(...options.map(o => o.priceValue || 0));
  const comfort: Record<string, number> = { driving: 7, train: 8.5, flight: 7.5, combined: 9 };
  for (const o of options) {
    const timeNorm = o.timeSec / maxTime;
    const priceNorm = maxPrice > 0 ? (o.priceValue || 0) / maxPrice : 0;
    const comfortScore = comfort[o.type] || 8;
    o.score = Math.round((timeNorm * 0.5 + priceNorm * 0.3 + (10 - comfortScore) / 10 * 0.2) * 100) / 100;
  }

  // ---- 最佳标记 ----
  const best = options.reduce((a, b) => (b.score < a.score ? b : a));
  best.isBest = true;
  const bestType: Record<string, string> = {
    driving: "时间与费用均衡，自驾灵活",
    train: "综合性价比最高，准点率高",
    flight: "长途最快，时间成本最低",
    combined: "智能组合，接驳最省心",
  };
  best.bestReason = `${best.label}综合评分最优：${bestType[best.type] || "推荐方案"}`;

  return options;
}

/** 城市 ID → 坐标点 */
function pointFromCity(id: string): PlacePoint | null {
  const city = CITIES[id];
  const coord = CITY_COORDS[id];
  if (!city || !coord) return null;
  return { name: city.name, lng: coord[0], lat: coord[1] };
}

