import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Map, ArrowRight, Star, Compass, ArrowLeftRight, Globe, Navigation, ChevronLeft, ChevronRight, MapPin, Flame, ThumbsUp, Utensils, Route } from "lucide-react";
import { travelGuides } from "../data/guides";
import { imgSrc, preloadImages } from "../lib/image";
import { foodRecommendations } from "../data/food";
import carousData from "../public/carousData.json"

const carouselItems = carousData

const regions = [
  {
    id: "east",
    name: "东半球 (东经)",
    icon: Globe,
    description: "亚洲的古老韵味与大洋洲的自然奇观",
    destinations: [
      { country: "中国", city: "北京", coords: "39°N, 116°E", image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&q=80&w=800" },
      { country: "日本", city: "京都", coords: "35°N, 135°E", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800" },
      { country: "澳大利亚", city: "悉尼", coords: "33°S, 151°E", image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&q=80&w=800" },
      { country: "泰国", city: "曼谷", coords: "13°N, 100°E", image: "https://images.unsplash.com/photo-1508009603885-247a531414a8?auto=format&fit=crop&q=80&w=800" },
    ]
  },
  {
    id: "west",
    name: "西半球 (西经)",
    icon: Compass,
    description: "美洲大陆的多元文化与壮丽山河",
    destinations: [
      { country: "美国", city: "纽约", coords: "40°N, 74°W", image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=800" },
      { country: "巴西", city: "里约热内卢", coords: "22°S, 43°W", image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&q=80&w=800" },
      { country: "加拿大", city: "温哥华", coords: "49°N, 123°W", image: "https://images.unsplash.com/photo-1559511260-66a654ae982a?auto=format&fit=crop&q=80&w=800" },
      { country: "秘鲁", city: "库斯科", coords: "13°S, 71°W", image: "https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&q=80&w=800" },
    ]
  },
  {
    id: "north",
    name: "北半球高纬 (北纬)",
    icon: Navigation,
    description: "极光、冰川与欧洲古典风情",
    destinations: [
      { country: "冰岛", city: "雷克雅未克", coords: "64°N, 21°W", image: "https://images.unsplash.com/photo-1476610286381-560640d2b973?auto=format&fit=crop&q=80&w=800" },
      { country: "挪威", city: "特罗姆瑟", coords: "69°N, 18°E", image: "https://images.unsplash.com/photo-1531366936336-62e0672eceab?auto=format&fit=crop&q=80&w=800" },
      { country: "英国", city: "伦敦", coords: "51°N, 0°W", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=800" },
      { country: "法国", city: "巴黎", coords: "48°N, 2°E", image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=800" },
    ]
  },
  {
    id: "south",
    name: "南半球 (南纬)",
    icon: Map,
    description: "狂野非洲与南美洲的神秘地带",
    destinations: [
      { country: "南非", city: "开普敦", coords: "33°S, 18°E", image: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&q=80&w=800" },
      { country: "新西兰", city: "皇后镇", coords: "45°S, 168°E", image: "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&q=80&w=800" },
      { country: "阿根廷", city: "布宜诺斯艾利斯", coords: "34°S, 58°W", image: "https://images.unsplash.com/photo-1612294037637-ec328d0e075e?auto=format&fit=crop&q=80&w=800" },
      { country: "智利", city: "百内国家公园", coords: "51°S, 73°W", image: "https://images.unsplash.com/photo-1534254608381-127c59e794ce?auto=format&fit=crop&q=80&w=800" },
    ]
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeRegion, setActiveRegion] = useState("east");
  // 热门数据（按热度排序取 top 3）
  const hotGuides = [...travelGuides].sort((a, b) => b.likes - a.likes).slice(0, 3);
  const hotFood = [...foodRecommendations].sort((a, b) => b.reviews - a.reviews).slice(0, 3);
  const hotRoutes = [
    { id: "r1", from: "北京", to: "成都", title: "北京→成都 高铁5日", tag: "人气 1.2w", image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&q=80&w=800" },
    { id: "r2", from: "上海", to: "三亚", title: "上海→三亚 海岛度假", tag: "人气 9.8k", image: "https://images.unsplash.com/photo-1540202404-b711c040d6b5?auto=format&fit=crop&q=80&w=800" },
    { id: "r3", from: "西安", to: "重庆", title: "西安→重庆 魔幻之旅", tag: "人气 8.6k", image: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&q=80&w=800" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // 预渲染：预加载下一张轮播图（切换零等待）
  useEffect(() => {
    const next = carouselItems[(currentSlide + 1) % carouselItems.length];
    if (next) preloadImages([imgSrc(next.image, 1280)]);
  }, [currentSlide]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);

  const activeRegionData = regions.find(r => r.id === activeRegion);

  return (
    <div className="flex flex-col">
      {/* Hero Section with Carousel */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 z-0"
          >
            <img
              src={imgSrc(carouselItems[currentSlide].image, 1280)}
              fetchPriority="high"
              alt={carouselItems[currentSlide].title}
              className="w-full h-full object-cover opacity-70"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          </motion.div>
        </AnimatePresence>
        
        {/* Carousel Controls */}
        <button onClick={prevSlide} aria-label="上一张" className="absolute left-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={nextSlide} aria-label="下一张" className="absolute right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all">
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-4 leading-tight drop-shadow-lg">
                {carouselItems[currentSlide].title}
              </h1>
              <p className="text-xl md:text-2xl text-gray-200 mb-10 drop-shadow-md font-light">
                {carouselItems[currentSlide].subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/planner" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-full font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30">
              <Map className="w-5 h-5" />
              开始规划路线
            </Link>
            <Link to="/guides" className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-full font-medium transition-colors flex items-center justify-center gap-2">
              <Compass className="w-5 h-5" />
              浏览热门攻略
            </Link>
          </motion.div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 z-20">
          {carouselItems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`第 ${idx + 1} 张图片`}
              className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentSlide ? "bg-white w-8" : "bg-white/50 hover:bg-white/80"}`}
            />
          ))}
        </div>
      </section>

      {/* 热门内容（上下平行：攻略 / 美食 / 路线 三区块同时展示） */}
      <section className="py-20 bg-white dark:bg-stone-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-stone-100 mb-2 flex items-center justify-center gap-3">
              <Flame className="w-8 h-8 text-orange-600" />
              热门推荐
            </h2>
            <p className="text-gray-600 dark:text-stone-400">热度最高的攻略、美食与路线，旅行灵感从这里开始</p>
          </div>

          {/* 热门攻略 */}
          <div className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-stone-100 flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-orange-600" /> 热门攻略
              </h3>
              <Link to="/guides" className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 transition-colors">
                查看全部 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {hotGuides.map(g => (
                <Link
                  key={g.id}
                  to={`/guide/${g.id}`}
                  className="group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-stone-800"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img src={imgSrc(g.image, 600)} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <span className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 text-orange-400" /> {(g.likes / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className="p-5">
                    <h4 className="font-bold text-gray-900 dark:text-stone-100 line-clamp-2 mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{g.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-stone-400 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" /> {g.destination} · {g.days}天
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 地道美食 */}
          <div className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-stone-100 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-600" /> 地道美食
              </h3>
              <Link to="/food" className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 transition-colors">
                查看全部 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {hotFood.map(f => (
                <Link
                  key={f.id}
                  to="/food"
                  className="group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-stone-800"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img src={imgSrc(f.image, 600)} alt={f.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <span className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {f.rating}
                    </span>
                  </div>
                  <div className="p-5">
                    <h4 className="font-bold text-gray-900 dark:text-stone-100 mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{f.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-stone-400 flex items-center justify-between">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {f.city} · {f.type}</span>
                      <span className="text-orange-600 font-medium">{f.price}</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 热门路线 */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-stone-100 flex items-center gap-2">
                <Route className="w-5 h-5 text-orange-600" /> 热门路线
              </h3>
              <Link to="/planner" className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 transition-colors">
                查看全部 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {hotRoutes.map(r => (
                <Link
                  key={r.id}
                  to="/planner"
                  className="group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-stone-800"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img src={imgSrc(r.image, 600)} alt={r.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <span className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md">{r.tag}</span>
                  </div>
                  <div className="p-5">
                    <h4 className="font-bold text-gray-900 dark:text-stone-100 mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{r.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-stone-400 flex items-center gap-2">
                      <Navigation className="w-3.5 h-3.5 text-orange-500" /> {r.from} → {r.to}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Explore by Coordinates (Secondary Routes Simulation) */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
              <Globe className="w-8 h-8 text-orange-600" />
              按经纬度探索世界
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">跨越赤道与本初子午线，发现不同半球的独特风景与人文。</p>
          </div>

          {/* Region Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {regions.map((region) => {
              const isActive = activeRegion === region.id;
              return (
                <button
                  key={region.id}
                  onClick={() => setActiveRegion(region.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all ${
                    isActive 
                      ? "bg-gray-900 text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  <region.icon className="w-4 h-4" />
                  {region.name}
                </button>
              );
            })}
          </div>

          {/* Region Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRegion}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center mb-10">
                <p className="text-xl text-orange-600 font-serif italic">{activeRegionData?.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {activeRegionData?.destinations.map((dest, idx) => (
                  <Link to="/guides" key={idx} className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 aspect-[3/4] block">
                    <img 
                      src={dest.image} 
                      alt={dest.city} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-center gap-1 text-orange-400 mb-2 text-xs font-mono bg-black/40 w-fit px-2 py-1 rounded backdrop-blur-sm">
                        <MapPin className="w-3 h-3" />
                        {dest.coords}
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-1">{dest.city}</h3>
                      <p className="text-gray-300 text-sm flex items-center justify-between">
                        {dest.country}
                        <ArrowRight className="w-4 h-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Primary Routes Features Section */}
      <section className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">一站式旅行服务</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">整合全网资源，为您提供最优质的旅行决策支持。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Link to="/guides" className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200 flex flex-col h-full">
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-orange-600 group-hover:scale-110 transition-all duration-300 shadow-inner">
                <Star className="w-8 h-8 text-orange-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-orange-600 transition-colors">深度攻略 & 美食</h3>
              <p className="text-gray-600 mb-8 leading-relaxed flex-grow">
                涵盖全球热门目的地的旅行攻略，以及基于真实用户评价星级排序的当地特色美食推荐，让您像本地人一样体验。
              </p>
              <div className="text-orange-600 font-medium flex items-center gap-2 group-hover:gap-3 transition-all mt-auto">
                探索攻略 <ArrowRight className="w-5 h-5" />
              </div>
            </Link>

            {/* Feature 2 */}
            <Link to="/planner" className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 flex flex-col h-full">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-300 shadow-inner">
                <Map className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">智能路线规划</h3>
              <p className="text-gray-600 mb-8 leading-relaxed flex-grow">
                在地图上直观选择目的地。系统根据起始地到目的地的距离，智能生成多种出行路线，并提供价格与性价比分析。
              </p>
              <div className="text-blue-600 font-medium flex items-center gap-2 group-hover:gap-3 transition-all mt-auto">
                规划路线 <ArrowRight className="w-5 h-5" />
              </div>
            </Link>

            {/* Feature 3 */}
            <Link to="/compare" className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-emerald-200 flex flex-col h-full">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-emerald-600 group-hover:scale-110 transition-all duration-300 shadow-inner">
                <ArrowLeftRight className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-emerald-600 transition-colors">全网综合比价</h3>
              <p className="text-gray-600 mb-8 leading-relaxed flex-grow">
                一键对比各大平台的机票、高铁、酒店及租车价格。告别繁琐的切换比价，轻松找到最划算的预订方案。
              </p>
              <div className="text-emerald-600 font-medium flex items-center gap-2 group-hover:gap-3 transition-all mt-auto">
                开始比价 <ArrowRight className="w-5 h-5" />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
