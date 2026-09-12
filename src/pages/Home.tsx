import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Map, ArrowRight, Star, Compass, ArrowLeftRight, Globe, Navigation, ChevronLeft, ChevronRight, MapPin, Sparkles,ThumbsUp } from "lucide-react";
import { usePreferences } from "../context/PreferencesContext";
import { fetchPublishedGuides, type TravelGuide } from "../lib/guideService";
import { fetchPublishedFoods, type FoodItem } from "../lib/foodService";
import { getSceneForPath, type SceneDefinition } from "../lib/experience/sceneCatalog";

const carouselItems = [
  { 
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=2000", 
    title: "巴黎", 
    subtitle: "浪漫之都，艺术与历史的交响" 
  },
  { 
    image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=2000", 
    title: "地道美食", 
    subtitle: "舌尖上的世界，品味各地风情" 
  },
  { 
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=2000", 
    title: "东京", 
    subtitle: "繁华与传统的完美交织" 
  },
  { 
    image: "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&q=80&w=2000", 
    title: "特色小吃", 
    subtitle: "寻味街头巷尾的烟火气" 
  }
];

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

export function HomeHeroMedia({ scene }: { scene: SceneDefinition }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden">
      <img
        src={scene.posterSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-55"
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        poster={scene.posterSrc}
      >
        <source src={scene.videoSrc} type="video/mp4" />
      </video>
    </div>
  );
}

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeRegion, setActiveRegion] = useState("east");
  const [guides, setGuides] = useState<TravelGuide[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const { preferences } = usePreferences();

  useEffect(() => {
    fetchPublishedGuides().then(setGuides);
    fetchPublishedFoods().then(setFoods);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);

  const activeRegionData = regions.find(r => r.id === activeRegion);

  const hasPreferences = preferences.destinations.length > 0 || preferences.travelTypes.length > 0;

  const getRecommendedGuides = () => {
    let result = [...guides];
    if (hasPreferences) {
      result.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (preferences.destinations.some(d => a.destination.includes(d) || d.includes(a.destination))) scoreA += 10;
        if (preferences.destinations.some(d => b.destination.includes(d) || d.includes(b.destination))) scoreB += 10;
        scoreA += a.tags.filter(t => preferences.travelTypes.includes(t)).length * 2;
        scoreB += b.tags.filter(t => preferences.travelTypes.includes(t)).length * 2;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.likes - a.likes;
      });
    } else {
      result.sort((a, b) => b.likes - a.likes);
    }
    return result.slice(0, 3);
  };

  const getRecommendedFood = () => {
    let result = [...foods];
    if (preferences.destinations.length > 0 || preferences.foodFlavors.length > 0 || preferences.foodSpiciness !== '不限') {
      result.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (preferences.destinations.includes(a.city) || preferences.destinations.includes(a.province)) scoreA += 10;
        if (preferences.destinations.includes(b.city) || preferences.destinations.includes(b.province)) scoreB += 10;
        
        if (preferences.foodSpiciness === '不吃辣' && a.tags.includes('不辣')) scoreA += 5;
        if (preferences.foodSpiciness === '微辣' && a.tags.some(t => t.includes('辣'))) scoreA += 2;
        if (preferences.foodSpiciness === '无辣不欢' && (a.tags.includes('麻辣') || a.tags.includes('香辣'))) scoreA += 5;

        if (preferences.foodSpiciness === '不吃辣' && b.tags.includes('不辣')) scoreB += 5;
        if (preferences.foodSpiciness === '微辣' && b.tags.some(t => t.includes('辣'))) scoreB += 2;
        if (preferences.foodSpiciness === '无辣不欢' && (b.tags.includes('麻辣') || b.tags.includes('香辣'))) scoreB += 5;

        scoreA += a.tags.filter(t => preferences.foodFlavors.includes(t)).length * 3;
        scoreB += b.tags.filter(t => preferences.foodFlavors.includes(t)).length * 3;
        
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.rating - a.rating;
      });
    } else {
      result.sort((a, b) => b.rating - a.rating);
    }
    return result.slice(0, 3);
  };

  const recommendedGuides = useMemo(getRecommendedGuides, [preferences, hasPreferences, guides]);
  const recommendedFood = useMemo(getRecommendedFood, [preferences, foods]);

  return (
    <div className="voyage-content-page flex flex-col">
      {/* Hero Section with Carousel */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-black">
        <HomeHeroMedia scene={getSceneForPath("/")} />
        
        {/* Carousel Controls */}
        <button
          onClick={prevSlide}
          aria-label={`查看上一站：${carouselItems[(currentSlide - 1 + carouselItems.length) % carouselItems.length].title}`}
          className="absolute left-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          aria-label={`查看下一站：${carouselItems[(currentSlide + 1) % carouselItems.length].title}`}
          className="absolute right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto mt-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-[12vw] md:text-[8vw] font-serif font-bold text-white mb-2 leading-[0.85] tracking-tight drop-shadow-2xl uppercase">
                {carouselItems[currentSlide].title}
              </h1>
              <p className="text-lg md:text-2xl text-white/90 mb-12 drop-shadow-md font-medium tracking-wide uppercase">
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
            <Link to="/planner" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-orange-600/30 hover:-translate-y-1">
              <Map className="w-5 h-5" />
              开始规划路线
            </Link>
            <Link to="/guides" className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-1">
              <Compass className="w-5 h-5" />
              浏览热门攻略
            </Link>
          </motion.div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 z-20">
          {carouselItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`切换至${item.title}`}
              className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentSlide ? "bg-white w-8" : "bg-white/50 hover:bg-white/80"}`}
            />
          ))}
        </div>
      </section>

      {/* Personalized Recommendations Section */}
      <section className="py-16 bg-orange-50/50 border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{hasPreferences ? "为你推荐" : "热门精选"}</h2>
              <p className="text-sm text-gray-600">
                {hasPreferences 
                  ? `根据您的偏好为您精选 (包含 ${preferences.destinations.join(', ')} 等)`
                  : "发现最受欢迎的旅行目的地与地道美食"
                }
              </p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Compass className="w-5 h-5 text-orange-500" />
              精选攻略
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendedGuides.map((guide, idx) => (
                <Link to={`/guides`} key={`guide-${idx}`} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={guide.image} alt={guide.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate" title={guide.title}>{guide.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{guide.destination}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <ThumbsUp className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{guide.likes}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          <div>
             <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-500" />
              热门美食
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendedFood.map((food, idx) => (
                <Link to={`/food`} key={`food-${idx}`} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={food.image} alt={food.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate" title={food.name}>{food.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-3 h-3 text-orange-400 fill-current" />
                      <span className="text-xs font-bold text-gray-700">{food.rating}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 truncate">{food.city} · {food.type}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors flex-shrink-0" />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {activeRegionData?.destinations.map((dest, idx) => (
                  <Link to="/guides" key={idx} className="group relative rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 aspect-[3/4] block border border-gray-100">
                    <img 
                      src={dest.image} 
                      alt={dest.city} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1918]/90 via-[#1a1918]/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <div className="flex items-center gap-1 text-orange-400 mb-3 text-[10px] font-mono uppercase tracking-widest bg-black/40 w-fit px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                        <MapPin className="w-3 h-3" />
                        {dest.coords}
                      </div>
                      <h3 className="text-3xl font-serif font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">{dest.city}</h3>
                      <p className="text-gray-300 text-sm flex items-center justify-between font-medium tracking-wide">
                        {dest.country}
                        <ArrowRight className="w-5 h-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 text-orange-400" />
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
      <section className="py-32 bg-[#fcfbf9] border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-6">一站式旅行服务</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">整合全网资源，为您提供最优质的旅行决策支持。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Link to="/guides" className="group bg-white rounded-[32px] p-10 shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-orange-200 flex flex-col h-full hover:-translate-y-2">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-8 group-hover:bg-orange-600 group-hover:scale-110 transition-all duration-500 shadow-inner">
                <Star className="w-10 h-10 text-orange-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4 group-hover:text-orange-600 transition-colors">深度攻略 & 美食</h3>
              <p className="text-gray-600 mb-8 leading-relaxed flex-grow text-base">
                涵盖全球热门目的地的旅行攻略，以及基于真实用户评价星级排序的当地特色美食推荐，让您像本地人一样体验。
              </p>
              <div className="text-orange-600 font-bold flex items-center gap-2 group-hover:gap-4 transition-all mt-auto uppercase tracking-wider text-sm">
                探索攻略 <ArrowRight className="w-5 h-5" />
              </div>
            </Link>

            {/* Feature 2 */}
            <Link to="/planner" className="group bg-white rounded-[32px] p-10 shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-blue-200 flex flex-col h-full hover:-translate-y-2">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-500 shadow-inner">
                <Map className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">智能路线规划</h3>
              <p className="text-gray-600 mb-8 leading-relaxed flex-grow text-base">
                在地图上直观选择目的地。系统根据起始地到目的地的距离，智能生成多种出行路线，并提供价格与性价比分析。
              </p>
              <div className="text-blue-600 font-bold flex items-center gap-2 group-hover:gap-4 transition-all mt-auto uppercase tracking-wider text-sm">
                规划路线 <ArrowRight className="w-5 h-5" />
              </div>
            </Link>

            {/* Feature 3 */}
            <Link to="/compare" className="group bg-white rounded-[32px] p-10 shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-emerald-200 flex flex-col h-full hover:-translate-y-2">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-8 group-hover:bg-emerald-600 group-hover:scale-110 transition-all duration-500 shadow-inner">
                <ArrowLeftRight className="w-10 h-10 text-emerald-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4 group-hover:text-emerald-600 transition-colors">全网综合比价</h3>
              <p className="text-gray-600 mb-8 leading-relaxed flex-grow text-base">
                一键对比各大平台的机票、高铁、酒店及租车价格。告别繁琐的切换比价，轻松找到最划算的预订方案。
              </p>
              <div className="text-emerald-600 font-bold flex items-center gap-2 group-hover:gap-4 transition-all mt-auto uppercase tracking-wider text-sm">
                开始比价 <ArrowRight className="w-5 h-5" />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
