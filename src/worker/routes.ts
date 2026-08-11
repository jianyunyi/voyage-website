/**
 * VoyageX Routes API — 多方案路线聚合（驾车/高铁/飞机）
 *
 * 端点：GET /api/route?originId={id}&destId={id}
 * 数据源：当前为 mock（基于城市对的距离估算），驾车方案由高德前端实时计算。
 * 未来接入真实平台：替换为 12306/航司 API 聚合。
 */

export interface RouteOption {
  id: string;
  type: "driving" | "train" | "flight";
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
  source: "amap" | "estimate";
}

interface CityInfo {
  id: string;
  name: string;
  keyword: string;
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

export async function getRoutes(originId: string, destId: string): Promise<RouteOption[]> {
  const origin = CITIES[originId];
  const dest = CITIES[destId];
  if (!origin || !dest || originId === destId) {
    return [];
  }

  const distanceKm = haversineKm(CITY_COORDS[originId], CITY_COORDS[destId]);
  const roadFactor = 1.3; // 公路距离 ≈ 直线 × 1.3

  // 驾车（前端高德实时，此处给估算占位）
  const drivingHours = (distanceKm * roadFactor) / 90; // 均速 90km/h
  const drivingSec = drivingHours * 3600;

  // 高铁：均速 ~250km/h，价格 ~0.45 元/km
  const trainHours = distanceKm / 250;
  const trainSec = trainHours * 3600;
  const trainPrice = Math.round(distanceKm * 0.45 / 10) * 10;

  // 飞机：均速 ~700km/h，加 2 小时机场周转
  const flightHours = distanceKm / 700 + 2;
  const flightSec = flightHours * 3600;
  const flightPrice = Math.round(distanceKm * 0.8 / 10) * 10;

  const fmtDur = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`;
  };

  const options: RouteOption[] = [
    {
      id: "driving",
      type: "driving",
      label: "驾车",
      timeSec: drivingSec,
      timeLabel: fmtDur(drivingSec),
      distanceMeters: Math.round(distanceKm * roadFactor * 1000),
      distanceLabel: `${(distanceKm * roadFactor).toFixed(1)}公里`,
      tolls: distanceKm * roadFactor > 500 ? `约¥${Math.round(distanceKm * roadFactor * 0.4)}` : "免费",
      tag: "最自由",
      score: 8.5,
      source: "amap",
    },
    {
      id: "train",
      type: "train",
      label: "高铁",
      timeSec: trainSec,
      timeLabel: fmtDur(trainSec),
      distanceMeters: Math.round(distanceKm * 1000),
      distanceLabel: `${distanceKm.toFixed(1)}公里`,
      price: `¥${trainPrice}`,
      priceValue: trainPrice,
      tag: "性价比最高",
      score: 8.8,
      source: "estimate",
    },
    {
      id: "flight",
      type: "flight",
      label: "飞机",
      timeSec: flightSec,
      timeLabel: fmtDur(flightSec),
      distanceMeters: Math.round(distanceKm * 1000),
      distanceLabel: `${distanceKm.toFixed(1)}公里`,
      price: `¥${flightPrice}`,
      priceValue: flightPrice,
      tag: "最快捷",
      score: 9.2,
      source: "estimate",
    },
  ];

  // 模拟聚合延迟
  await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
  return options;
}
