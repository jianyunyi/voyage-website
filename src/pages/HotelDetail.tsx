import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Phone, Star, ArrowLeft, Check, ExternalLink, Loader2 } from "lucide-react";
import { fetchHotelDetail, type HotelDetail as HotelDetailType } from "../lib/api";
import { imgSrc } from "../lib/image";



export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<HotelDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchHotelDetail(id)
      .then(h => { setHotel(h); setError(""); })
      .catch(e => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-stone-950">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
        <p className="text-gray-500 dark:text-stone-400">加载酒店详情...</p>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-stone-950">
        <p className="text-red-500 mb-4">{error || "酒店不存在"}</p>
        <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-stone-400 underline">返回</button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-stone-950 min-h-screen pb-20">
      {/* Header / Images */}
      <div className="relative h-[40vh] md:h-[50vh] bg-gray-900">
        <img 
          src={imgSrc(hotel.images[0], 1280)} 
          alt={hotel.name} 
          fetchPriority="high"
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
            <section className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-stone-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-stone-100 mb-4">酒店介绍</h2>
              <p className="text-gray-600 dark:text-stone-300 leading-relaxed">{hotel.description}</p>
              
              <div className="mt-6 flex items-center gap-2 text-gray-600 dark:text-stone-300">
                <Phone className="w-4 h-4" />
                <span>联系电话：{hotel.phone}</span>
              </div>
            </section>

            {/* Amenities */}
            <section className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-stone-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-stone-100 mb-4">热门设施</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {hotel.amenities.map((amenity, index) => (
                  <div key={index} className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-stone-950 rounded-xl">
                    <Check className="w-6 h-6 text-orange-600 mb-2" />
                    <span className="text-sm font-medium text-gray-700 dark:text-stone-200">{amenity}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Room Types */}
            <section className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-stone-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-stone-100 mb-4">房型与价格</h2>
              <div className="space-y-4">
                {hotel.rooms.map((room: any) => (
                  <div key={room.id} className="border border-gray-100 dark:border-stone-800 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4 hover:border-orange-200 transition-colors">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-stone-100 mb-1">{room.name}</h3>
                      <div className="text-sm text-gray-500 dark:text-stone-400 mb-3">
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
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-gray-100 dark:border-stone-800 pt-4 md:pt-0 md:pl-6">
                      <div className="text-2xl font-bold text-orange-600 mb-2">{room.price}<span className="text-sm font-normal text-gray-500 dark:text-stone-400">/晚</span></div>
                      <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        选择
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Reviews */}
            <section className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-stone-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-stone-100 mb-4">用户评价</h2>
              <div className="space-y-6">
                {hotel.reviews.map((review: any) => (
                  <div key={review.id} className="border-b border-gray-50 last:border-0 pb-6 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-stone-100">{review.user}</span>
                      <span className="text-sm text-gray-400 dark:text-stone-500">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <p className="text-gray-600 dark:text-stone-300 text-sm leading-relaxed">{review.content}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar / Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-stone-800 sticky top-24">
              <div className="text-sm text-gray-500 dark:text-stone-400 mb-1">全网最低价</div>
              <div className="text-3xl font-bold text-orange-600 mb-6">¥450<span className="text-base font-normal text-gray-500 dark:text-stone-400">/晚起</span></div>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-stone-300">携程旅行</span>
                  <span className="font-medium text-gray-900 dark:text-stone-100">¥450</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-stone-300">Booking.com</span>
                  <span className="font-medium text-gray-900 dark:text-stone-100">¥480</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-stone-300">Agoda</span>
                  <span className="font-medium text-gray-900 dark:text-stone-100">¥430 (不可取消)</span>
                </div>
              </div>

              <button 
                onClick={() => window.open('https://www.ctrip.com', '_blank')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                立即预订 <ExternalLink className="w-4 h-4" />
              </button>
              <p className="text-xs text-center text-gray-400 dark:text-stone-500 mt-3">将跳转至携程旅行完成预订</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
