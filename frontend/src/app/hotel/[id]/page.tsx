'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, MapPin, Phone, Globe, Clock, ChevronLeft, ThumbsUp, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useFavorites } from '@/lib/favorites';

const mockHotel = {
  id: 'h1',
  name: '成都市中心豪华酒店',
  rating: 4.8,
  reviews: 328,
  address: '成都市锦江区红星路三段1号',
  phone: '028-8888-8888',
  website: 'https://example-hotel.com',
  price: '¥450/晚',
  description: '位于成都市中心地段，步行可达太古里、春熙路等热门商圈。酒店拥有现代化设施，提供优质服务。',
  images: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=1200',
  ],
  features: ['免费WiFi', '含双早', '游泳池', '健身房', '停车场', '24小时前台'],
};

export default function HotelDetailPage() {
  const params = useParams();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [selectedImage, setSelectedImage] = useState(0);

  const hotel = mockHotel;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Back */}
      <Link href="/compare" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ChevronLeft className="w-5 h-5" /> 返回比价
      </Link>

      {/* Image Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2 aspect-[16/9] rounded-2xl overflow-hidden">
          <img src={hotel.images[selectedImage]} alt={hotel.name} className="w-full h-full object-cover" />
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
          {hotel.images.map((img, i) => (
            <button key={i} onClick={() => setSelectedImage(i)}
              className={`aspect-[16/9] lg:aspect-[16/5] rounded-xl overflow-hidden border-2 transition-all ${
                i === selectedImage ? 'border-orange-500' : 'border-transparent hover:border-gray-300'
              }`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Hotel Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">{hotel.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{hotel.address}</span>
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />{hotel.rating}</span>
                <span>({hotel.reviews} 条评价)</span>
              </div>
            </div>
            <button onClick={() => toggleFavorite({ id: hotel.id, type: 'hotel', title: hotel.name, image: hotel.images[0], rating: hotel.rating, price: hotel.price })}
              className="p-3 rounded-full hover:bg-gray-100 transition-colors">
              <ThumbsUp className={`w-5 h-5 ${isFavorite(hotel.id) ? 'text-orange-600 fill-orange-600' : 'text-gray-400'}`} />
            </button>
          </div>

          <p className="text-gray-600 leading-relaxed mb-8">{hotel.description}</p>

          {/* Features */}
          <h3 className="font-bold text-gray-900 mb-3">酒店设施</h3>
          <div className="flex flex-wrap gap-2 mb-8">
            {hotel.features.map((f) => (
              <span key={f} className="px-4 py-2 bg-gray-50 text-gray-600 rounded-full text-sm font-medium">{f}</span>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
            <p className="text-3xl font-bold text-orange-600 mb-1">{hotel.price}</p>
            <p className="text-sm text-gray-500 mb-6">含税及服务费</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" /> 入住 15:00 · 退房 12:00
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" /> {hotel.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Globe className="w-4 h-4 text-gray-400" /> {hotel.website}
              </div>
            </div>

            <button className="w-full py-3.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20">
              立即预订
            </button>
            <button className="w-full py-3 mt-2 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors flex items-center justify-center gap-1">
              <Share2 className="w-4 h-4" /> 分享
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
