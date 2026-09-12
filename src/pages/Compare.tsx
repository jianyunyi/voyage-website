import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building,
  Calendar,
  Car,
  Check,
  Info,
  Loader2,
  MapPin,
  Plane,
  Star,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { ActionButton } from "../components/ActionButton";

interface TransportItem {
  id: string;
  platform: string;
  price: string;
  type: string;
  time: string;
  features: string[];
  url: string;
}

interface HotelItem {
  id: string;
  platform: string;
  price: string;
  name: string;
  features: string[];
}

interface CarItem {
  id: string;
  platform: string;
  price: string;
  name: string;
  features: string[];
  url: string;
}

type CompareItem = TransportItem | HotelItem | CarItem;

const categories = [
  { id: "transport", name: "交通工具", icon: Plane },
  { id: "hotel", name: "酒店住宿", icon: Building },
  { id: "car", name: "租车服务", icon: Car },
];

const mockData: {
  transport: TransportItem[];
  hotel: HotelItem[];
  car: CarItem[];
} = {
  transport: [
    { id: "t1", platform: "携程旅行", price: "¥850", type: "飞机", time: "10:00 - 13:00", features: ["退改无忧", "含20kg托运"], url: "https://flights.ctrip.com/" },
    { id: "t2", platform: "飞猪旅行", price: "¥820", type: "飞机", time: "10:00 - 13:00", features: ["含20kg托运"], url: "https://fliggy.com/" },
    { id: "t3", platform: "去哪儿", price: "¥835", type: "飞机", time: "10:00 - 13:00", features: ["退改无忧", "含20kg托运"], url: "https://flight.qunar.com/" },
    { id: "t4", platform: "12306", price: "¥680", type: "高铁", time: "08:00 - 16:30", features: ["官方直营", "退改便捷"], url: "https://www.12306.cn/" },
  ],
  hotel: [
    { id: "hotel-1", platform: "携程旅行", price: "¥450/晚", name: "市中心豪华酒店", features: ["含双早", "免费取消"] },
    { id: "hotel-2", platform: "Booking.com", price: "¥480/晚", name: "市中心豪华酒店", features: ["含双早", "延迟退房"] },
    { id: "hotel-3", platform: "Agoda", price: "¥430/晚", name: "市中心豪华酒店", features: ["不可取消"] },
  ],
  car: [
    { id: "c1", platform: "神州租车", price: "¥150/天", name: "经济型轿车", features: ["免押金", "上门送取"], url: "https://www.zuche.com/" },
    { id: "c2", platform: "一嗨租车", price: "¥140/天", name: "经济型轿车", features: ["免押金"], url: "https://www.1hai.cn/" },
    { id: "c3", platform: "携程租车", price: "¥145/天", name: "经济型轿车", features: ["免押金", "全险"], url: "https://car.ctrip.com/" },
  ]
};

export default function Compare() {
  const [activeCategory, setActiveCategory] = useState("hotel");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    destination: "成都",
    checkIn: "2026-10-01",
    checkOut: "2026-10-07",
    adults: 2,
    origin: "北京",
  });
  const comparisonResults = useMemo(
    () =>
      [...mockData[activeCategory as keyof typeof mockData]].sort(
        (a, b) => Number(a.price.replace(/[^\d]/g, "")) - Number(b.price.replace(/[^\d]/g, ""))
      ),
    [activeCategory]
  );

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  const handleBook = (item: CompareItem) => {
    if (activeCategory === "hotel") {
      navigate(`/hotel/${item.id}`);
    } else if ('url' in item) {
      window.open(item.url, '_blank');
    }
  };

  return (
    <main className="voyage-content-page voyage-content-page--compare voyage-compare min-h-screen py-12">
      <div className="voyage-compare__frame max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="voyage-compare__intro text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">全网综合比价</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            一键对比各大平台价格，帮您找到最划算的预订方案。数据实时更新，确保价格准确。
          </p>
        </div>

        {/* Category Tabs */}
        <div className="voyage-compare__categories flex justify-center mb-12">
          <div className="bg-white p-1 rounded-2xl shadow-sm inline-flex">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`voyage-compare__category flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? "bg-gray-900 text-white shadow-md" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Form */}
        <div className="voyage-compare__parameters bg-white rounded-2xl p-6 shadow-sm mb-8 border border-gray-100">
          {activeCategory === "hotel" ? (
            <form onSubmit={handleSearch} className="voyage-compare__form flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-gray-500 mb-1">目的地</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    required 
                    value={searchParams.destination} 
                    onChange={e => setSearchParams({...searchParams, destination: e.target.value})} 
                    className="block w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500" 
                    placeholder="城市/区域/酒店名" 
                  />
                </div>
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-gray-500 mb-1">入住日期</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="date" 
                    required 
                    value={searchParams.checkIn} 
                    onChange={e => setSearchParams({...searchParams, checkIn: e.target.value})} 
                    className="block w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500" 
                  />
                </div>
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-gray-500 mb-1">退房日期</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="date" 
                    required 
                    value={searchParams.checkOut} 
                    onChange={e => setSearchParams({...searchParams, checkOut: e.target.value})} 
                    className="block w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500" 
                  />
                </div>
              </div>
              <div className="w-full lg:w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">成人</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="number" 
                    min="1" 
                    required 
                    value={searchParams.adults} 
                    onChange={e => setSearchParams({...searchParams, adults: parseInt(e.target.value)})} 
                    className="block w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500" 
                  />
                </div>
              </div>
              <ActionButton
                action="search-price"
                pending={isLoading}
                type="submit"
                className="w-full lg:w-auto bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:bg-orange-400"
              >
              </ActionButton>
            </form>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-between py-2">
              <div className="flex items-center gap-4 mb-4 md:mb-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">北京</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-gray-900">成都</span>
                </div>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="text-gray-600">10月1日 - 10月7日</span>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="text-gray-600">2成人</span>
              </div>
              <button onClick={() => setActiveCategory("hotel")} className="text-orange-600 font-medium hover:text-orange-700 text-sm">
                切换到酒店搜索
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-500">正在全网比价中，请稍候...</p>
          </div>
        ) : (
          <div className="voyage-compare__results space-y-4">
            {comparisonResults.map((item, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`voyage-compare__result bg-white rounded-2xl p-6 shadow-sm border transition-colors ${
                  index === 0 ? "border-orange-300 ring-1 ring-orange-100" : "border-gray-100 hover:border-gray-300"
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg text-gray-900">{item.platform}</span>
                      {index === 0 && (
                        <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
                          <Star className="w-3 h-3" /> 全网最低
                        </span>
                      )}
                    </div>
                    <div className="text-gray-600 mb-3">
                      {activeCategory === "hotel" && searchParams.destination
                        ? `[${searchParams.destination}] ${'name' in item ? item.name : item.type}`
                        : 'time' in item
                          ? `${item.type} | ${item.time}`
                          : item.name}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.features.map((feature, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                          <Check className="w-3 h-3" /> {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4">
                    <div className="text-3xl font-bold text-orange-600">{item.price}</div>
                    <button 
                      onClick={() => handleBook(item)}
                      className={`px-8 py-3 rounded-xl font-medium transition-colors ${
                      index === 0 
                        ? "bg-orange-600 hover:bg-orange-700 text-white shadow-md" 
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    }`}>
                      去预订
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        <div className="voyage-compare__disclaimer mt-8 text-center text-sm text-gray-500 flex items-center justify-center gap-1">
          <Info className="w-4 h-4" />
          价格每15分钟更新一次，最终价格以各平台实际显示为准。
        </div>
      </div>
    </main>
  );
}
