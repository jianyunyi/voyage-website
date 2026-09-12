/**
 * VoyageX Hotels API — 酒店详情（mock 数据 + 标准化）
 *
 * 端点：GET /api/hotel/:id
 * 数据源：当前为 mock，结构已标准化（含图片/设施/房型/评论）。
 * 未来接入真实平台：替换 HOTEL_DB 为聚合查询（见 aggregator 的 aggregateReal 模式）。
 */

export interface HotelRoom {
  id: string;
  name: string;
  size: string;
  bed: string;
  price: string;
  priceValue: number;
  features: string[];
}

export interface HotelReview {
  id: number;
  user: string;
  rating: number;
  date: string;
  content: string;
}

export interface HotelDetail {
  id: string;
  name: string;
  platform: string;
  rating: number;
  reviewsCount: number;
  address: string;
  phone: string;
  description: string;
  images: string[];
  amenities: string[];
  rooms: HotelRoom[];
  reviews: HotelReview[];
  dataSource?: "mock" | "provider";
  isLive?: boolean;
}

const HOTEL_DB: Record<string, HotelDetail> = {
  "hotel-1": {
    id: "hotel-1",
    name: "市中心豪华酒店",
    platform: "携程旅行",
    rating: 4.8,
    reviewsCount: 1284,
    address: "成都市锦江区春熙路步行街1号",
    phone: "+86 28 1234 5678",
    description: "位于成都市中心繁华地段，步行可达春熙路、太古里等核心商圈。酒店提供豪华舒适的客房，配备高品质床上用品和智能客控系统。顶楼设有全景餐厅和无边泳池，让您尽享城市美景。",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=1000",
    ],
    amenities: ["免费高速WiFi", "自助早餐", "健身中心", "免费停车"],
    rooms: [
      { id: "r1", name: "豪华大床房", size: "45㎡", bed: "1张特大床", price: "¥450", priceValue: 450, features: ["含双早", "免费取消", "城市景观"] },
      { id: "r2", name: "行政双床房", size: "55㎡", bed: "2张单人床", price: "¥680", priceValue: 680, features: ["含双早", "行政酒廊权益", "高楼层"] },
      { id: "r3", name: "全景套房", size: "85㎡", bed: "1张特大床", price: "¥1280", priceValue: 1280, features: ["含双早", "独立起居室", "270度全景"] },
    ],
    reviews: [
      { id: 1, user: "张**", rating: 5, date: "2026-03-15", content: "位置非常好，下楼就是春熙路，逛街吃饭都很方便。房间很干净，床品舒适，早餐种类也很丰富。" },
      { id: 2, user: "李**", rating: 4, date: "2026-03-10", content: "整体服务不错，前台小姐姐很热情。就是节假日人比较多，等电梯需要一点时间。" },
    ],
  },
  "hotel-2": {
    id: "hotel-2",
    name: "锦江国际酒店",
    platform: "Booking.com",
    rating: 4.6,
    reviewsCount: 986,
    address: "成都市锦江区人民南路二段80号",
    phone: "+86 28 8765 4321",
    description: "毗邻天府广场与春熙路商圈，交通便利。酒店拥有现代简约风格的客房，配备国际品牌床垫与智能家居系统。顶层行政酒廊提供下午茶与鸡尾酒服务。",
    images: [
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1000",
    ],
    amenities: ["免费高速WiFi", "自助早餐", "行政酒廊", "24小时前台"],
    rooms: [
      { id: "r1", name: "高级大床房", size: "38㎡", bed: "1张大床", price: "¥480", priceValue: 480, features: ["含双早", "延迟退房"] },
      { id: "r2", name: "豪华景观房", size: "50㎡", bed: "1张特大床", price: "¥720", priceValue: 720, features: ["含双早", "城市景观"] },
    ],
    reviews: [
      { id: 1, user: "王**", rating: 5, date: "2026-02-28", content: "房间视野很好，能直接看到天府广场。早餐很丰富，中西式都有。" },
    ],
  },
  "hotel-3": {
    id: "hotel-3",
    name: "精品设计酒店",
    platform: "Agoda",
    rating: 4.4,
    reviewsCount: 653,
    address: "成都市武侯区桐梓林路188号",
    phone: "+86 28 6688 9966",
    description: "由知名设计师打造的精品酒店，以极简工业风为主题。酒店位于桐梓林商圈，周边咖啡馆与独立书店林立，深受年轻旅行者喜爱。",
    images: [
      "https://images.unsplash.com/photo-1587985064135-0366536eab42?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=1000",
    ],
    amenities: ["免费高速WiFi", "咖啡吧", "自行车租赁", "行李寄存"],
    rooms: [
      { id: "r1", name: "工业风大床房", size: "32㎡", bed: "1张大床", price: "¥430", priceValue: 430, features: ["免费取消"] },
    ],
    reviews: [
      { id: 1, user: "赵**", rating: 4, date: "2026-02-14", content: "设计感很强，拍照很出片。位置在桐梓林，周边小店很多。" },
      { id: 2, user: "孙**", rating: 4, date: "2026-02-08", content: "性价比高，房间干净。就是隔音一般，靠街的房间有点吵。" },
    ],
  },
};

export async function getHotelDetail(id: string): Promise<HotelDetail | null> {
  // 模拟查询延迟
  await new Promise(r => setTimeout(r, 80 + Math.random() * 120));
  const hotel = HOTEL_DB[id];
  return hotel ? { ...hotel, dataSource: "mock", isLive: false } : null;
}

export { HOTEL_DB };
