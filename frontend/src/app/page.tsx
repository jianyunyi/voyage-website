'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Map, ArrowRight, Star, Compass, ArrowLeftRight, Globe,
  ChevronLeft, ChevronRight, Sparkles, ThumbsUp, Navigation,
  MapPin, BookOpen, Utensils,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { usePreferences } from '@/lib/preferences';
import type { PublicFood, PublicGuide, FoodListResponse, GuideListResponse } from '@/lib/api';

// ── Carousel ────────────────────────────────────────────────────────────────

const carouselItems = [
  { image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=2000', title: '巴黎', subtitle: '浪漫之都，艺术与历史的交响' },
  { image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=2000', title: '地道美食', subtitle: '舌尖上的世界，品味各地风情' },
  { image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=2000', title: '东京', subtitle: '繁华与传统的完美交织' },
  { image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&q=80&w=2000', title: '特色小吃', subtitle: '寻味街头巷尾的烟火气' },
];

const regions = [
  { id: 'east', name: '东半球', icon: Globe, desc: '亚洲的古老韵味与大洋洲的自然奇观',
    dests: [
      { country: '中国', city: '北京', image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&q=80&w=800' },
      { country: '日本', city: '京都', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800' },
    ]},
  { id: 'west', name: '西半球', icon: Compass, desc: '美洲大陆的多元文化与壮丽山河',
    dests: [
      { country: '美国', city: '纽约', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=800' },
      { country: '法国', city: '巴黎', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=800' },
    ]},
];

const features = [
  { icon: BookOpen, title: '智能旅行攻略', desc: '基于AI的个性化行程推荐', color: 'bg-blue-50 text-blue-600', href: '/guides' },
  { icon: Utensils, title: '地道美食指南', desc: '发现各地隐藏的美食宝藏', color: 'bg-orange-50 text-orange-600', href: '/food' },
  { icon: Map, title: '互动路线规划', desc: '可视化地图路线规划工具', color: 'bg-green-50 text-green-600', href: '/planner' },
  { icon: ArrowLeftRight, title: '全网比价', desc: '多平台价格一键对比', color: 'bg-purple-50 text-purple-600', href: '/compare' },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { preferences } = usePreferences();
  const [guides, setGuides] = useState<PublicGuide[]>([]);
  const [foods, setFoods] = useState<PublicFood[]>([]);

  useEffect(() => {
    apiGet<GuideListResponse>('/api/guides').then(r => { if (r.success) setGuides(r.guides); }).catch(() => {});
    apiGet<FoodListResponse>('/api/foods').then(r => { if (r.success) setFoods(r.foods); }).catch(() => {});
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((s) => (s + 1) % carouselItems.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const topGuides = useMemo(() => guides.slice(0, 4), [guides]);
  const topFoods = useMemo(() => foods.slice(0, 6), [foods]);

  return (
    <div>
      {/* ── Hero Carousel ──────────────────────────────────────────────────── */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        {carouselItems.map((item, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${i === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            <div className="absolute bottom-20 left-8 md:left-16 z-20">
              <h2 className="text-5xl md:text-7xl font-serif font-bold text-white mb-3 drop-shadow-lg">{item.title}</h2>
              <p className="text-lg md:text-xl text-white/90 drop-shadow">{item.subtitle}</p>
            </div>
          </div>
        ))}
        <button onClick={() => setCurrentSlide((s) => (s - 1 + carouselItems.length) % carouselItems.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={() => setCurrentSlide((s) => (s + 1) % carouselItems.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition">
          <ChevronRight className="w-6 h-6" />
        </button>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {carouselItems.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentSlide ? 'bg-white w-8' : 'bg-white/50'}`} />
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-30 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f) => (
            <Link key={f.title} href={f.href}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Guides Section ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-20">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-serif font-bold text-gray-900">精选旅行攻略</h2>
            <p className="text-gray-500 mt-1">来自旅行者的真实经验分享</p>
          </div>
          <Link href="/guides" className="hidden sm:flex items-center gap-2 text-orange-600 font-bold hover:text-orange-700 transition-colors">
            查看全部 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {topGuides.map((guide) => (
            <Link key={guide.id} href={`/guides#${guide.id}`}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={guide.image} alt={guide.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors line-clamp-1">{guide.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{guide.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>📍 {guide.destination}</span>
                  <span>{guide.days}天</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Food Section ────────────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-serif font-bold text-gray-900">地道美食推荐</h2>
              <p className="text-gray-500 mt-1">舌尖上的美味，不可错过的地道体验</p>
            </div>
            <Link href="/food" className="hidden sm:flex items-center gap-2 text-orange-600 font-bold hover:text-orange-700 transition-colors">
              查看全部 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topFoods.map((food) => (
              <div key={food.id} className="group bg-[#fcfbf9] rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={food.image} alt={food.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{food.name}</h3>
                    <span className="text-sm font-bold text-orange-600">{food.price}</span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{food.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>📍 {food.city}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{food.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Regions ─────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2 text-center">探索世界</h2>
        <p className="text-gray-500 mb-12 text-center">从东方到西方，发现每一个目的地</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {regions.map((region) => (
            <div key={region.id} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                  <region.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{region.name}</h3>
                  <p className="text-sm text-gray-500">{region.desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {region.dests.map((dest) => (
                  <div key={dest.city} className="relative group rounded-2xl overflow-hidden aspect-[4/3]">
                    <img src={dest.image} alt={dest.city} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 text-white">
                      <p className="font-bold text-sm">{dest.city}</p>
                      <p className="text-xs text-white/80">{dest.country}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="bg-[#1a1918] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Sparkles className="w-12 h-12 text-orange-400 mx-auto mb-6" />
          <h2 className="text-4xl font-serif font-bold mb-4">开启你的旅程</h2>
          <p className="text-gray-400 mb-8 text-lg">使用 VoyageX 智能规划，让每一次旅行都成为难忘的回忆</p>
          <div className="flex justify-center gap-4">
            <Link href="/planner" className="px-8 py-4 bg-orange-600 text-white rounded-full font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/30">
              开始规划 <Navigation className="w-4 h-4 inline ml-1" />
            </Link>
            <Link href="/guides" className="px-8 py-4 bg-white/10 text-white rounded-full font-bold hover:bg-white/20 transition-colors backdrop-blur-sm">
              浏览攻略
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
