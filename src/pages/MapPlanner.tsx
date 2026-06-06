import { useState, useEffect, useRef } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import { MapPin, Navigation, Clock, Star, ChevronRight, Info } from "lucide-react";

// Initial mock data for cities with coordinates
const initialCities = [
  { id: "c1", name: "北京", keyword: "北京市", lnglat: [116.397428, 39.90923] },
  { id: "c2", name: "上海", keyword: "上海市", lnglat: [121.473701, 31.230416] },
  { id: "c3", name: "广州", keyword: "广州市", lnglat: [113.280637, 23.125178] },
  { id: "c4", name: "成都", keyword: "成都市", lnglat: [104.065735, 30.659462] },
  { id: "c5", name: "西安", keyword: "西安市", lnglat: [108.940174, 34.341568] },
];

export default function MapPlanner() {
  const [availableCities, setAvailableCities] = useState(initialCities);
  const [origin, setOrigin] = useState<string>("c1");
  const [destination, setDestination] = useState<string>("c4");
  const [showRoutes, setShowRoutes] = useState(false);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [selectingType, setSelectingType] = useState<'origin' | 'destination'>('origin');
  
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [AMapObj, setAMapObj] = useState<any>(null);
  const drivingRef = useRef<any>(null);
  const originMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);

  // State refs to access latest state in map event listeners
  const stateRef = useRef({ selectingType, origin, destination });
  useEffect(() => {
    stateRef.current = { selectingType, origin, destination };
  }, [selectingType, origin, destination]);

  useEffect(() => {
    // 设置高德地图安全密钥
    (window as any)._AMapSecurityConfig = {
      securityJsCode: "4bd80c274fc23b7c05e1b73b9983b11a",
    };

    AMapLoader.load({
      key: "7fe6235b4b574842aa01cad91457149a",
      version: "2.0",
      plugins: ["AMap.Driving", "AMap.ToolBar", "AMap.Scale", "AMap.Geocoder"],
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

          // 地图点击事件：双向绑定
          map.on('click', (e: any) => {
            const lnglat = [e.lnglat.getLng(), e.lnglat.getLat()];
            
            const geocoder = new AMap.Geocoder({ city: "全国", radius: 1000 });
            geocoder.getAddress(lnglat, (status: string, result: any) => {
              if (status === 'complete' && result.info === 'OK') {
                const addressComponent = result.regeocode.addressComponent;
                let cityName = addressComponent.city;
                if (!cityName || cityName.length === 0) {
                  cityName = addressComponent.province;
                }
                
                if (cityName) {
                  const cleanName = cityName.replace(/市$/, '').replace(/省$/, '');
                  
                  setAvailableCities(prev => {
                    let cityObj = prev.find(c => c.name === cleanName || c.keyword === cityName);
                    const newCityId = cityObj ? cityObj.id : `c_${Date.now()}`;
                    
                    if (!cityObj) {
                      cityObj = {
                        id: newCityId,
                        name: cleanName,
                        keyword: cityName,
                        lnglat: lnglat
                      };
                      
                      // Update selection state
                      setTimeout(() => updateSelection(newCityId), 0);
                      return [...prev, cityObj];
                    } else {
                      // Update selection state
                      setTimeout(() => updateSelection(cityObj.id), 0);
                      return prev;
                    }
                  });
                }
              }
            });
          });
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

  const updateSelection = (cityId: string) => {
    const currentType = stateRef.current.selectingType;
    if (currentType === 'origin') {
      setOrigin(cityId);
      setSelectingType('destination');
    } else {
      setDestination(cityId);
      setSelectingType('origin');
    }
    setShowRoutes(false);
    if (drivingRef.current) {
      drivingRef.current.clear();
    }
  };

  // 监听 origin 和 destination 变化，在地图上绘制标记
  useEffect(() => {
    if (!mapInstance || !AMapObj) return;

    // 清除旧标记
    if (originMarkerRef.current) {
      mapInstance.remove(originMarkerRef.current);
      originMarkerRef.current = null;
    }
    if (destMarkerRef.current) {
      mapInstance.remove(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    // 如果正在展示路线，AMap.Driving 会自己画标记，我们就不画了
    if (showRoutes) return;

    const originCity = availableCities.find(c => c.id === origin);
    const destCity = availableCities.find(c => c.id === destination);
    const markers: any[] = [];

    if (originCity && originCity.lnglat) {
      const marker = new AMapObj.Marker({
        position: new AMapObj.LngLat(originCity.lnglat[0], originCity.lnglat[1]),
        title: `出发地: ${originCity.name}`,
        label: {
          content: `<div style="background-color: #2563eb; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 1px solid white;">起: ${originCity.name}</div>`,
          direction: 'top'
        }
      });
      mapInstance.add(marker);
      originMarkerRef.current = marker;
      markers.push(marker);
    }

    if (destCity && destCity.lnglat) {
      const marker = new AMapObj.Marker({
        position: new AMapObj.LngLat(destCity.lnglat[0], destCity.lnglat[1]),
        title: `目的地: ${destCity.name}`,
        label: {
          content: `<div style="background-color: #ea580c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 1px solid white;">终: ${destCity.name}</div>`,
          direction: 'top'
        }
      });
      mapInstance.add(marker);
      destMarkerRef.current = marker;
      markers.push(marker);
    }

    if (markers.length > 0) {
      mapInstance.setFitView(markers, false, [100, 100, 100, 100]);
    }

  }, [origin, destination, availableCities, mapInstance, AMapObj, showRoutes]);

  const originCity = availableCities.find(c => c.id === origin);
  const destCity = availableCities.find(c => c.id === destination);

  const handleSearch = () => {
    if (origin && destination && origin !== destination && drivingRef.current) {
      setShowRoutes(true);
      setRouteInfo(null);
      
      // 清除我们自定义的标记，让路线规划插件接管
      if (originMarkerRef.current) mapInstance.remove(originMarkerRef.current);
      if (destMarkerRef.current) mapInstance.remove(destMarkerRef.current);
      
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

  // Mock routes data mixed with real data if available
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
    { id: "r2", type: "高铁 (预估)", duration: "8.5小时", price: "¥680", score: 8.8, tag: "性价比最高" },
    { id: "r3", type: "飞机 (预估)", duration: "3小时", price: "¥850", score: 9.2, tag: "最快捷" },
  ];

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      {/* Left Panel - Controls */}
      <div className="w-full md:w-[420px] bg-[#fcfbf9] border-r border-gray-200/50 flex flex-col shadow-2xl z-10">
        <div className="p-8 border-b border-gray-200/50 bg-white">
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">路线规划</h2>
          
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-8 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <p className="font-medium leading-relaxed">
              请在下拉框选择，或直接在地图上点击选择
              <span className="font-bold text-blue-700 mx-1 px-2 py-0.5 bg-blue-100 rounded-md">
                {selectingType === 'origin' ? '出发地' : '目的地'}
              </span>
            </p>
          </div>
          
          <div className="space-y-6 relative">
            {/* Connection Line */}
            <div className="absolute left-6 top-12 bottom-12 w-0.5 bg-gray-100 z-0"></div>
            
            <div className="relative z-10 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${selectingType === 'origin' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-grow">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">出发地</label>
                <select 
                  className={`w-full rounded-xl shadow-sm sm:text-sm p-3 border transition-all outline-none font-medium appearance-none cursor-pointer ${selectingType === 'origin' ? 'border-blue-500 ring-4 ring-blue-50 bg-white' : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'}`}
                  value={origin}
                  onClick={() => setSelectingType('origin')}
                  onChange={(e) => { 
                    setOrigin(e.target.value); 
                    setShowRoutes(false); 
                    setSelectingType('destination');
                    if (drivingRef.current) drivingRef.current.clear();
                  }}
                >
                  <option value="">选择出发地</option>
                  {availableCities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${selectingType === 'destination' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20 scale-110' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-grow">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">目的地</label>
                <select 
                  className={`w-full rounded-xl shadow-sm sm:text-sm p-3 border transition-all outline-none font-medium appearance-none cursor-pointer ${selectingType === 'destination' ? 'border-orange-500 ring-4 ring-orange-50 bg-white' : 'border-gray-200 bg-gray-50 focus:border-orange-500 focus:bg-white'}`}
                  value={destination}
                  onClick={() => setSelectingType('destination')}
                  onChange={(e) => { 
                    setDestination(e.target.value); 
                    setShowRoutes(false); 
                    setSelectingType('origin');
                    if (drivingRef.current) drivingRef.current.clear();
                  }}
                >
                  <option value="">选择目的地</option>
                  {availableCities.map(city => (
                    <option key={city.id} value={city.id} disabled={city.id === origin}>{city.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSearch}
            disabled={!origin || !destination || origin === destination || !AMapObj}
            className="mt-8 w-full bg-[#1a1918] text-white py-4 px-4 rounded-full font-bold hover:bg-black focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-black/10"
          >
            {AMapObj ? "搜索路线" : "地图加载中..."}
          </button>
        </div>

        {/* Routes Results */}
        <div className="flex-grow overflow-y-auto p-6">
          {showRoutes ? (
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">推荐路线方案</h3>
              {routes.map((route, index) => (
                <div key={route.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-2">
                      <span className="font-serif font-bold text-xl text-gray-900 group-hover:text-orange-600 transition-colors">{route.type}</span>
                      {route.tag && (
                        <span className={`text-xs px-3 py-1 rounded-full font-bold w-fit ${
                          index === 0 ? "bg-blue-50 text-blue-600 border border-blue-100" : 
                          index === 1 ? "bg-orange-50 text-orange-600 border border-orange-100" : 
                          "bg-gray-50 text-gray-600 border border-gray-200"
                        }`}>
                          {route.tag}
                        </span>
                      )}
                    </div>
                    <span className="text-xl font-bold text-gray-900">{route.price}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-500 mb-6 font-medium">
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {route.duration}
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      性价比 {route.score}
                    </div>
                    {route.distance && (
                      <div className="flex items-center gap-1.5 col-span-2 mt-1 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">
                        总里程: {route.distance}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors border-t border-gray-100 pt-4">
                    查看详情
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-6">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                <Navigation className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-center font-medium">请选择出发地和目的地<br/>以查看路线方案</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Map */}
      <div className="flex-grow h-[50vh] md:h-auto relative z-0">
        <div ref={mapRef} className="w-full h-full"></div>
        
        {/* Map Type Controls */}
        {showRoutes && AMapObj && mapInstance && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md rounded-xl p-1.5 shadow-lg border border-gray-200/50 flex gap-1 z-10 transition-all">
            <button 
              onClick={() => {
                mapInstance.setLayers([new AMapObj.TileLayer()]);
                mapInstance.setPitch(0);
                mapInstance.setRotation(0);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              标准
            </button>
            <button 
              onClick={() => {
                mapInstance.setLayers([new AMapObj.TileLayer.Satellite(), new AMapObj.TileLayer.RoadNet()]);
                mapInstance.setPitch(0);
                mapInstance.setRotation(0);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              卫星
            </button>
            <button 
              onClick={() => {
                mapInstance.setLayers([new AMapObj.TileLayer()]);
                mapInstance.setPitch(60);
                mapInstance.setRotation(45);
                // Fallback nicely if Buildings is not loaded
                if (AMapObj.Buildings) {
                  mapInstance.add(new AMapObj.Buildings());
                }
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              3D
            </button>
          </div>
        )}
      </div>
    </div>
  );
}