import { useState, useEffect, useRef } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import { MapPin, Navigation, Clock, Star, ChevronRight } from "lucide-react";
import { fetchRoutes, type RouteOption } from "../lib/api";

// Mock data for cities
const cities = [
  { id: "c1", name: "北京", keyword: "北京市" },
  { id: "c2", name: "上海", keyword: "上海市" },
  { id: "c3", name: "广州", keyword: "广州市" },
  { id: "c4", name: "成都", keyword: "成都市" },
  { id: "c5", name: "西安", keyword: "西安市" },
  { id: "c6", name: "重庆", keyword: "重庆市" },
  { id: "c7", name: "厦门", keyword: "厦门市" },
  { id: "c8", name: "泉州", keyword: "泉州市" },
];

export default function MapPlanner() {
  const [origin, setOrigin] = useState<string>("c1");
  const [destination, setDestination] = useState<string>("c4");
  const [showRoutes, setShowRoutes] = useState(false);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [AMapObj, setAMapObj] = useState<any>(null);
  const drivingRef = useRef<any>(null);
  const poiMarkersRef = useRef<any[]>([]);
  const [poiType, setPoiType] = useState<"景点" | "美食" | "酒店">("景点");
  const [poiList, setPoiList] = useState<any[]>([]);
  const [poiLoading, setPoiLoading] = useState(false);

  useEffect(() => {
    // 高德地图密钥从环境变量注入（vite.config.ts define）
    const amapKey = process.env.VITE_AMAP_KEY;
    const amapSecurityCode = process.env.VITE_AMAP_SECURITY_CODE;

    if (!amapKey) {
      console.error("缺少 VITE_AMAP_KEY 环境变量，请在 .env.local 中配置高德地图密钥");
      return;
    }

    if (amapSecurityCode) {
      (window as any)._AMapSecurityConfig = {
        securityJsCode: amapSecurityCode,
      };
    }

    AMapLoader.load({
      key: amapKey,
      version: "2.0",
      plugins: ["AMap.Driving", "AMap.ToolBar", "AMap.Scale", "AMap.PlaceSearch", "AMap.InfoWindow"],
    })
      .then((AMap) => {
        setAMapObj(AMap);
        if (mapRef.current) {
          const map = new AMap.Map(mapRef.current, {
            zoom: 5,
            center: [104.1954, 35.8617], // 中国中心点附近
          });
          map.addControl(new AMap.ToolBar());
          map.addControl(new AMap.Scale());
          setMapInstance(map);
          
          // 初始化驾车路线规划插件
          const driving = new AMap.Driving({
            map: map,
            hideMarkers: false,
            showTraffic: true,
          });
          drivingRef.current = driving;
        }
      })
      .catch((e) => {
        console.error("高德地图加载失败", e);
      });

    return () => {
      if (mapInstance) {
        mapInstance.destroy();
      }
    };
  }, []);

  const originCity = cities.find(c => c.id === origin);
  const destCity = cities.find(c => c.id === destination);

  const poiKeywords: Record<string, string> = { "景点": "风景名胜", "美食": "美食", "酒店": "酒店" };
  const poiColors: Record<string, string> = { "景点": "#0891B2", "美食": "#EA580C", "酒店": "#7C3AED" };

  const searchPoi = () => {
    if (!mapInstance || !AMapObj || !destCity) return;
    setPoiLoading(true);
    const placeSearch = new AMapObj.PlaceSearch({
      pageSize: 6,
      city: destCity.name,
      extensions: "all",
    });
    placeSearch.search(poiKeywords[poiType], (status: string, result: any) => {
      // 清除旧 marker
      poiMarkersRef.current.forEach(m => m.setMap(null));
      poiMarkersRef.current = [];
      if (status === "complete" && result.poiList?.pois) {
        const pois = result.poiList.pois;
        setPoiList(pois);
        const markers = pois.map((poi: any) => {
          const marker = new AMapObj.Marker({
            position: [poi.location.lng, poi.location.lat],
            content: `<div style="background:${poiColors[poiType]};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.3);">${poiType[0]}</div>`,
            offset: new AMapObj.Pixel(-14, -14),
            title: poi.name,
          });
          marker.on("click", () => {
            const info = new AMapObj.InfoWindow({
              content: `<div style="padding:10px;max-width:220px;"><strong>${poi.name}</strong><br/><span style="color:#666;font-size:12px;">${poi.address || poi.district || ""}</span></div>`,
              offset: new AMapObj.Pixel(0, -30),
            });
            info.open(mapInstance, marker.getPosition());
          });
          marker.setMap(mapInstance);
          return marker;
        });
        poiMarkersRef.current = markers;
        if (markers.length > 0) mapInstance.setFitView(markers, false, [60, 60, 60, 60]);
      } else {
        setPoiList([]);
      }
      setPoiLoading(false);
    });
  };

  // 目的地/POI 类型变化时搜索周边 POI（地图就绪后）
  useEffect(() => {
    if (mapInstance && destCity) searchPoi();
  }, [mapInstance, destination, poiType]);

  const handleSearch = () => {
    if (origin && destination && origin !== destination && drivingRef.current) {
      setShowRoutes(true);
      setRouteInfo(null);
      
      drivingRef.current.clear();
      
      drivingRef.current.search(
        [{ keyword: originCity?.keyword, city: originCity?.name }],
        [{ keyword: destCity?.keyword, city: destCity?.name }],
        (status: string, result: any) => {
          if (status === 'complete') {
            if (result.routes && result.routes.length > 0) {
              const route = result.routes[0];
              // 将时间（秒）转换为小时和分钟
              const hours = Math.floor(route.time / 3600);
              const minutes = Math.floor((route.time % 3600) / 60);
              const timeStr = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
              
              // 将距离（米）转换为公里
              const distanceStr = (route.distance / 1000).toFixed(1) + '公里';
              
              setRouteInfo({
                time: timeStr,
                distance: distanceStr,
                tolls: route.tolls ? `¥${route.tolls}` : '免费',
                taxi_cost: route.taxi_cost ? `约 ¥${Math.round(route.taxi_cost)}` : '未知'
              });
            }
          } else {
            console.error('获取路线数据失败：', result);
          }
        }
      );
    }
  };

  // 路线方案：驾车由高德实时计算，高铁/飞机由后端聚合 API 提供
  const [apiRoutes, setApiRoutes] = useState<RouteOption[]>([]);

  // 选择变化时获取高铁/飞机方案
  useEffect(() => {
    if (origin && destination && origin !== destination) {
      fetchRoutes(origin, destination)
        .then(r => setApiRoutes(r.filter(r => r.type !== "driving")))
        .catch(() => setApiRoutes([]));
    } else {
      setApiRoutes([]);
    }
  }, [origin, destination]);

  const routes = [
    { 
      id: "r1", 
      type: "驾车 (高德实时)", 
      duration: routeInfo ? routeInfo.time : "计算中...", 
      price: routeInfo ? `过路费 ${routeInfo.tolls}` : "计算中...", 
      distance: routeInfo ? routeInfo.distance : "",
      score: 8.5, 
      tag: "最自由" 
    },
    ...apiRoutes.map(r => ({
      id: r.id,
      type: `${r.label} (${r.source === "estimate" ? "估算" : "实时"})`,
      duration: r.timeLabel,
      price: r.price || "价格未知",
      distance: r.distanceLabel || "",
      score: r.score,
      tag: r.tag || "",
    })),
  ];

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      {/* Left Panel - Controls */}
      <div className="w-full md:w-96 bg-white dark:bg-stone-900 border-r border-gray-200 dark:border-stone-700 flex flex-col shadow-lg z-10">
        <div className="p-6 border-b border-gray-200 dark:border-stone-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-stone-100 mb-6">路线规划</h2>

          {/* POI 聚合 */}
          <div className="mb-6 p-4 rounded-xl bg-orange-50/60 border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold text-gray-800">周边 POI（{destCity?.name}）</span>
            </div>
            <div className="flex gap-2 mb-3">
              {(["景点", "美食", "酒店"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setPoiType(t)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                    poiType === t
                      ? "bg-orange-600 text-white"
                      : "bg-white dark:bg-stone-900 text-gray-600 dark:text-stone-300 border border-gray-200 dark:border-stone-700 hover:border-orange-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {poiLoading ? (
              <p className="text-xs text-gray-400 dark:text-stone-500">搜索中...</p>
            ) : poiList.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {poiList.map((poi, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span
                      className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5"
                      style={{ background: poiColors[poiType] }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-medium text-gray-800">{poi.name}</div>
                      <div className="text-gray-400 dark:text-stone-500">{poi.address || poi.district || ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-stone-500">点击上方分类查看周边 POI</p>
            )}
          </div>
          
          <div className="space-y-4 relative">
            {/* Connection Line */}
            <div className="absolute left-5 top-10 bottom-10 w-0.5 bg-gray-200 z-0"></div>
            
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-grow">
                <label className="block text-xs font-medium text-gray-500 dark:text-stone-400 mb-1">出发地</label>
                <select 
                  className="w-full border-gray-300 dark:border-stone-600 rounded-lg shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
                  value={origin}
                  onChange={(e) => { setOrigin(e.target.value); setShowRoutes(false); }}
                >
                  <option value="">选择出发地</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-grow">
                <label className="block text-xs font-medium text-gray-500 dark:text-stone-400 mb-1">目的地</label>
                <select 
                  className="w-full border-gray-300 dark:border-stone-600 rounded-lg shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
                  value={destination}
                  onChange={(e) => { setDestination(e.target.value); setShowRoutes(false); }}
                >
                  <option value="">选择目的地</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id} disabled={city.id === origin}>{city.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSearch}
            disabled={!origin || !destination || origin === destination || !AMapObj}
            className="mt-6 w-full bg-gray-900 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {AMapObj ? "搜索路线" : "地图加载中..."}
          </button>
        </div>

        {/* Routes Results */}
        <div className="flex-grow overflow-y-auto bg-gray-50 dark:bg-stone-950 p-4">
          {showRoutes ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">推荐路线方案</h3>
              {routes.map((route, index) => (
                <div key={route.id} className="bg-white dark:bg-stone-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-stone-700 hover:border-orange-300 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-gray-900 dark:text-stone-100">{route.type}</span>
                      {route.tag && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          index === 0 ? "bg-cyan-100 text-cyan-700" : 
                          index === 1 ? "bg-orange-100 text-orange-700" : 
                          "bg-gray-100 text-gray-700 dark:text-stone-200"
                        }`}>
                          {route.tag}
                        </span>
                      )}
                    </div>
                    <span className="text-xl font-bold text-orange-600">{route.price}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-stone-300 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400 dark:text-stone-500" />
                      {route.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      性价比 {route.score}/10
                    </div>
                    {route.distance && (
                      <div className="flex items-center gap-1 col-span-2 mt-1 text-xs text-gray-500 dark:text-stone-400">
                        总里程: {route.distance}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm font-medium text-gray-900 dark:text-stone-100 group-hover:text-orange-600 transition-colors border-t border-gray-100 dark:border-stone-800 pt-3">
                    查看详情
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-stone-500 space-y-4">
              <Navigation className="w-12 h-12 text-gray-300" />
              <p className="text-center">请选择出发地和目的地<br/>以查看路线方案</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Map */}
      <div className="flex-grow h-[50vh] md:h-auto relative z-0">
        <div ref={mapRef} className="w-full h-full"></div>
      </div>
    </div>
  );
}
