import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Phone, Star, Wifi, Coffee, Dumbbell, Car, ArrowLeft, Check, ExternalLink, type LucideIcon } from "lucide-react";

interface Amenity {
  icon: LucideIcon;
  name: string;
}

interface Room {
  id: string;
  name: string;
  size: string;
  bed: string;
  price: string;
  features: string[];
}

interface Review {
  id: number;
  user: string;
  rating: number;
  date: string;
  content: string;
}

interface HotelDetailData {
  name: string;
  rating: number;
  reviewsCount: number;
  address: string;
  phone: string;
  description: string;
  images: string[];
  amenities: Amenity[];
  rooms: Room[];
  reviews: Review[];
}

// Mock data for hotel details
const hotelDetails: Record<string, HotelDetailData> = {
  "hotel-1": {
    name: "市中心豪华酒店",
    rating: 4.8,
    reviewsCount: 1284,
    address: "成都市锦江区春熙路步行街1号",
    phone: "+86 28 1234 5678",
    description: "位于成都市中心繁华地段，步行可达春熙路、太古里等核心商圈。酒店提供豪华舒适的客房，配备高品质床上用品和智能客控系统。顶楼设有全景餐厅和无边泳池，让您尽享城市美景。",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=1000"
    ],
    amenities: [
      { icon: Wifi, name: "免费高速WiFi" },
      { icon: Coffee, name: "自助早餐" },
      { icon: Dumbbell, name: "健身中心" },
      { icon: Car, name: "免费停车" }
    ],
    rooms: [
      { id: "r1", name: "豪华大床房", size: "45㎡", bed: "1张特大床", price: "¥450", features: ["含双早", "免费取消", "城市景观"] },
      { id: "r2", name: "行政双床房", size: "55㎡", bed: "2张单人床", price: "¥680", features: ["含双早", "行政酒廊权益", "高楼层"] },
      { id: "r3", name: "全景套房", size: "85㎡", bed: "1张特大床", price: "¥1280", features: ["含双早", "独立起居室", "270度全景"] }
    ],
    reviews: [
      { id: 1, user: "张**", rating: 5, date: "2026-03-15", content: "位置非常好，下楼就是春熙路，逛街吃饭都很方便。房间很干净，床品舒适，早餐种类也很丰富。" },
      { id: 2, user: "李**", rating: 4, date: "2026-03-10", content: "整体服务不错，前台小姐姐很热情。就是节假日人比较多，等电梯需要一点时间。" }
    ]
  }
};

export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Use mock data or fallback to a default if id is not found
  const hotel = hotelDetails[id as string] || hotelDetails["hotel-1"];

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header / Images */}
      <div className="relative h-[40vh] md:h-[50vh] bg-gray-900">
        <img 
          src={hotel.images[0]} 
          alt={hotel.name} 
          className="w-full h-full object-cover opacity-80"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="text-white">
              <h1 className="text-3xl md:text-5xl font-bold mb-2">{hotel.name}</h1>
              <div className="flex items-center gap-4 text-sm md:text-base opacity-90">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  {hotel.rating} ({hotel.reviewsCount}条评价)
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {hotel.address}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">酒店介绍</h2>
              <p className="text-gray-600 leading-relaxed">{hotel.description}</p>
              
              <div className="mt-6 flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <span>联系电话：{hotel.phone}</span>
              </div>
            </section>

            {/* Amenities */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">热门设施</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {hotel.amenities.map((amenity: Amenity, index: number) => (
                  <div key={index} className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl">
                    <amenity.icon className="w-6 h-6 text-orange-600 mb-2" />
                    <span className="text-sm font-medium text-gray-700">{amenity.name}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Room Types */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">房型与价格</h2>
              <div className="space-y-4">
                {hotel.rooms.map((room: Room) => (
                  <div key={room.id} className="border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4 hover:border-orange-200 transition-colors">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{room.name}</h3>
                      <div className="text-sm text-gray-500 mb-3">
                        {room.size} · {room.bed}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {room.features.map((feature: string, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                            <Check className="w-3 h-3" /> {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                      <div className="text-2xl font-bold text-orange-600 mb-2">{room.price}<span className="text-sm font-normal text-gray-500">/晚</span></div>
                      <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        选择
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Reviews */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">用户评价</h2>
              <div className="space-y-6">
                {hotel.reviews.map((review: Review) => (
                  <div key={review.id} className="border-b border-gray-50 last:border-0 pb-6 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{review.user}</span>
                      <span className="text-sm text-gray-400">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{review.content}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar / Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <div className="text-sm text-gray-500 mb-1">全网最低价</div>
              <div className="text-3xl font-bold text-orange-600 mb-6">¥450<span className="text-base font-normal text-gray-500">/晚起</span></div>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">携程旅行</span>
                  <span className="font-medium text-gray-900">¥450</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Booking.com</span>
                  <span className="font-medium text-gray-900">¥480</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Agoda</span>
                  <span className="font-medium text-gray-900">¥430 (不可取消)</span>
                </div>
              </div>

              <button 
                onClick={() => window.open('https://www.ctrip.com', '_blank')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                立即预订 <ExternalLink className="w-4 h-4" />
              </button>
              <p className="text-xs text-center text-gray-400 mt-3">将跳转至携程旅行完成预订</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
