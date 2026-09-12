'use client';

import { useState } from 'react';
import { Plane, Train, Car, Building, Search, MapPin, ExternalLink, ArrowRight, Star, Check } from 'lucide-react';

interface TransportItem {
  id: string; platform: string; price: string; type: string; time: string; features: string[]; url: string;
}
interface HotelItem {
  id: string; platform: string; price: string; name: string; features: string[];
}
interface CarItem {
  id: string; platform: string; price: string; name: string; features: string[]; url: string;
}

type CompareItem = TransportItem | HotelItem | CarItem;

const categories = [
  { id: 'transport', name: '交通工具', icon: Plane },
  { id: 'hotel', name: '酒店住宿', icon: Building },
  { id: 'car', name: '租车服务', icon: Car },
];

const mockData = {
  transport: [
    { id: 't1', platform: '携程旅行', price: '¥850', type: '飞机', time: '10:00 - 13:00', features: ['退改无忧', '含20kg托运'], url: '#' },
    { id: 't2', platform: '飞猪旅行', price: '¥820', type: '飞机', time: '10:00 - 13:00', features: ['含20kg托运'], url: '#' },
    { id: 't3', platform: '去哪儿', price: '¥835', type: '飞机', time: '10:00 - 13:00', features: ['退改无忧', '含20kg托运'], url: '#' },
    { id: 't4', platform: '12306', price: '¥680', type: '高铁', time: '08:00 - 16:30', features: ['官方直营', '退改便捷'], url: '#' },
  ],
  hotel: [
    { id: 'h1', platform: '携程旅行', price: '¥450/晚', name: '市中心豪华酒店', features: ['含双早', '免费取消'] },
    { id: 'h2', platform: 'Booking.com', price: '¥480/晚', name: '市中心豪华酒店', features: ['含双早', '延迟退房'] },
    { id: 'h3', platform: 'Agoda', price: '¥430/晚', name: '市中心豪华酒店', features: ['不可取消'] },
  ],
  car: [
    { id: 'c1', platform: '神州租车', price: '¥150/天', name: '经济型轿车', features: ['免押金', '上门送取'], url: '#' },
    { id: 'c2', platform: '一嗨租车', price: '¥140/天', name: '经济型轿车', features: ['免押金'], url: '#' },
    { id: 'c3', platform: '携程租车', price: '¥145/天', name: '经济型轿车', features: ['免押金', '全险'], url: '#' },
  ],
};

export default function ComparePage() {
  const [activeCategory, setActiveCategory] = useState('hotel');
  const [destination, setDestination] = useState('成都');

  const list = mockData[activeCategory as keyof typeof mockData] as CompareItem[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">全网比价</h1>
        <p className="text-gray-500">一站式对比各大平台价格</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">目的地</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all" />
            </div>
          </div>
          <button className="w-full sm:w-auto px-8 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors flex items-center gap-2 justify-center">
            <Search className="w-5 h-5" /> 搜索比价
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-8">
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeCategory === cat.id
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600'
            }`}>
            <cat.icon className="w-5 h-5" />
            {cat.name}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Price Anchor — show the cheapest first */}
        {[...list].sort((a: CompareItem, b: CompareItem) => {
          const priceA = parseInt(a.price.replace(/[^0-9]/g, ''));
          const priceB = parseInt(b.price.replace(/[^0-9]/g, ''));
          return priceA - priceB;
        }).map((item: CompareItem, idx) => (
          <div key={item.id} className={`bg-white rounded-2xl p-6 shadow-sm border transition-all hover:shadow-md ${
            idx === 0 ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-100'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {idx === 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded-full">
                    <Star className="w-3 h-3 fill-orange-600" /> 最低价
                  </div>
                )}
                <div>
                  <p className="font-bold text-gray-900">{item.platform}</p>
                  <p className="text-sm text-gray-500">
                    {'type' in item ? `${item.type} · ${item.time}` : item.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-600">{item.price}</p>
                  {'type' in item && <p className="text-xs text-gray-400">{item.type}</p>}
                </div>
                <a href={item.url || '#'} target="_blank" rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-[#1a1918] text-white rounded-xl font-bold text-sm hover:bg-black transition-colors flex items-center gap-1.5">
                  查看 <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {item.features.map((f: string) => (
                <span key={f} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full">
                  <Check className="w-3 h-3" /> {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400 mt-8">
        * 以上为模拟数据，实际比价功能需对接各平台 API
      </p>
    </div>
  );
}
