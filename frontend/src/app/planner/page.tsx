'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, Star, ChevronRight, Info, Compass } from 'lucide-react';

const initialCities = [
  { id: 'c1', name: '北京', keyword: '北京市', lnglat: [116.397428, 39.90923] as [number, number] },
  { id: 'c2', name: '上海', keyword: '上海市', lnglat: [121.473701, 31.230416] as [number, number] },
  { id: 'c3', name: '广州', keyword: '广州市', lnglat: [113.280637, 23.125178] as [number, number] },
  { id: 'c4', name: '成都', keyword: '成都市', lnglat: [104.065735, 30.659462] as [number, number] },
  { id: 'c5', name: '西安', keyword: '西安市', lnglat: [108.940174, 34.341568] as [number, number] },
];

// Simple distance calculation (Haversine)
function haversineKm(c1: [number, number], c2: [number, number]): number {
  const R = 6371;
  const dLat = ((c2[1] - c1[1]) * Math.PI) / 180;
  const dLng = ((c2[0] - c1[0]) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((c1[1] * Math.PI) / 180) * Math.cos((c2[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function PlannerPage() {
  const [cities] = useState(initialCities);
  const [origin, setOrigin] = useState('c1');
  const [destination, setDestination] = useState('c4');
  const [showRoute, setShowRoute] = useState(false);

  const originCity = cities.find((c) => c.id === origin);
  const destCity = cities.find((c) => c.id === destination);
  const distance = originCity && destCity ? haversineKm(originCity.lnglat, destCity.lnglat) : 0;

  const handleSearch = () => {
    if (origin && destination && origin !== destination) {
      setShowRoute(true);
    }
  };

  const routes = showRoute
    ? [
        { id: 'r1', type: '驾车 (模拟)', duration: `${Math.round(distance / 80)}小时`, price: `过路费 ¥${Math.round(distance * 0.5)}`, distance: `${distance.toFixed(0)}公里`, score: 8.5, tag: '最自由' },
        { id: 'r2', type: '高铁 (模拟)', duration: `${Math.round(distance / 250)}小时`, price: `¥${Math.round(distance * 0.8)}`, score: 8.8, tag: '性价比最高' },
        { id: 'r3', type: '飞机 (模拟)', duration: `${Math.round(distance / 800)}小时`, price: `¥${Math.round(distance * 1.5)}`, score: 9.2, tag: '最快捷' },
      ]
    : [];

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-5rem)]">
      {/* Left Panel */}
      <div className="w-full md:w-[420px] bg-[#fcfbf9] border-r border-gray-200/50 flex flex-col shadow-2xl z-10 overflow-y-auto">
        <div className="p-8 border-b border-gray-200/50 bg-white">
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">路线规划</h2>

          <div className="flex items-center gap-3 text-sm text-gray-600 mb-8 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <p className="font-medium leading-relaxed">选择出发地和目的地，查看路线方案</p>
          </div>

          <div className="space-y-6 relative">
            <div className="absolute left-6 top-12 bottom-12 w-0.5 bg-gray-100 z-0"></div>

            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-grow">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">出发地</label>
                <select value={origin} onChange={(e) => { setOrigin(e.target.value); setShowRoute(false); }}
                  className="w-full rounded-xl shadow-sm sm:text-sm p-3 border border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none font-medium appearance-none cursor-pointer">
                  {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                </select>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/20">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-grow">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">目的地</label>
                <select value={destination} onChange={(e) => { setDestination(e.target.value); setShowRoute(false); }}
                  className="w-full rounded-xl shadow-sm sm:text-sm p-3 border border-gray-200 bg-gray-50 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none font-medium appearance-none cursor-pointer">
                  {cities.filter((c) => c.id !== origin).map((city) => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button onClick={handleSearch}
            disabled={!origin || !destination || origin === destination}
            className="mt-8 w-full bg-[#1a1918] text-white py-4 px-4 rounded-full font-bold hover:bg-black focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-black/10">
            搜索路线
          </button>
        </div>

        {/* Route Results */}
        <div className="flex-grow p-6">
          {showRoute ? (
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">推荐路线方案</h3>
              {routes.map((route, idx) => (
                <div key={route.id}
                  className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="font-serif font-bold text-xl text-gray-900 group-hover:text-orange-600 transition-colors">{route.type}</span>
                      <span className={`ml-2 text-xs px-3 py-1 rounded-full font-bold ${
                        idx === 0 ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        idx === 1 ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                        'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}>{route.tag}</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">{route.price}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-500 mb-6 font-medium">
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Clock className="w-4 h-4 text-gray-400" /> {route.duration}
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> 评分 {route.score}
                    </div>
                    {route.distance && (
                      <div className="flex items-center gap-1.5 col-span-2 mt-1 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">
                        总里程: {route.distance}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors border-t border-gray-100 pt-4">
                    查看详情 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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

      {/* Right Panel — Map Placeholder */}
      <div className="flex-grow h-[50vh] md:h-auto relative bg-gray-100">
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Compass className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">地图组件</p>
            <p className="text-sm">需要接入高德地图 / Leaflet / Mapbox</p>
          </div>
        </div>

        {/* Map Controls */}
        {showRoute && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md rounded-xl p-1.5 shadow-lg border border-gray-200/50 flex gap-1 z-10">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">标准</button>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">卫星</button>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">3D</button>
          </div>
        )}
      </div>
    </div>
  );
}
