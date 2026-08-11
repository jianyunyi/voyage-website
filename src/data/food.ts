/**
 * 地道美食数据（Food 列表 + Home 热门美食共用）
 */

export interface FoodItem {
  id: number;
  name: string;
  province: string;
  city: string;
  address: string;
  rating: number;
  reviews: number;
  type: string;
  image: string;
  price: string;
  description: string;
  reviewsList: Array<{ id: number; user: string; rating: number; date: string; content: string }>;
}

export const foodRecommendations: FoodItem[] = // Food Data
[
  {
    id: 1, name: "宽窄巷子老火锅", province: "四川", city: "成都", address: "成都市青羊区宽巷子8号",
    rating: 4.9, reviews: 12500, type: "火锅", image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800", price: "¥120/人",
    description: "地道川味火锅，环境古色古香，位于著名景点宽窄巷子内，是体验成都慢生活的绝佳去处。",
    reviewsList: [
      { id: 1, user: "张**", rating: 5, date: "2026-03-15", content: "味道非常正宗，牛油锅底越吃越香！环境也很好，很有成都特色。" },
      { id: 2, user: "王**", rating: 4, date: "2026-03-10", content: "排队人挺多的，建议提前取号。毛肚和鹅肠必点，非常新鲜。" }
    ]
  },
  {
    id: 2, name: "陈麻婆豆腐 (总店)", province: "四川", city: "成都", address: "成都市青羊区西玉龙街197号",
    rating: 4.8, reviews: 8900, type: "川菜", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800", price: "¥60/人",
    description: "始于清朝同治年间的中华老字号，麻婆豆腐的发源地，麻、辣、烫、香、酥、嫩、鲜、活。",
    reviewsList: [
      { id: 1, user: "李**", rating: 5, date: "2026-03-12", content: "名不虚传！麻婆豆腐太下饭了，一个人能吃三大碗米饭。" },
      { id: 2, user: "赵**", rating: 5, date: "2026-03-08", content: "除了麻婆豆腐，宫保鸡丁也很好吃，价格亲民，性价比极高。" }
    ]
  },
  {
    id: 3, name: "洞子老火锅", province: "重庆", city: "重庆", address: "重庆市渝中区中山三路153号",
    rating: 4.9, reviews: 15600, type: "火锅", image: "https://images.unsplash.com/photo-1626804475297-41609ea0af49?auto=format&fit=crop&q=80&w=800", price: "¥110/人",
    description: "开在防空洞里的特色火锅，体验重庆独特的防空洞文化，锅底醇厚，辣而不燥。",
    reviewsList: [
      { id: 1, user: "刘**", rating: 5, date: "2026-03-14", content: "防空洞里吃火锅太有感觉了！夏天去里面还很凉快，火锅味道也是一绝。" },
      { id: 2, user: "陈**", rating: 4, date: "2026-03-05", content: "微辣也挺辣的，不能吃辣的朋友慎重。鸭血和酥肉很好吃。" }
    ]
  },
  {
    id: 4, name: "回民街老孙家羊肉泡馍", province: "陕西", city: "西安", address: "西安市莲湖区回民街北院门",
    rating: 4.7, reviews: 6700, type: "小吃", image: "https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&q=80&w=800", price: "¥45/人",
    description: "西安著名的特色小吃，肉烂汤浓，香气四溢。自己动手掰馍也是一种独特的体验。",
    reviewsList: [
      { id: 1, user: "周**", rating: 5, date: "2026-03-11", content: "掰馍掰了半小时，吃起来格外香！羊肉很烂糊，汤头浓郁。" },
      { id: 2, user: "吴**", rating: 4, date: "2026-03-02", content: "人很多，环境比较嘈杂，但是味道确实地道，配上糖蒜绝了。" }
    ]
  },
  {
    id: 5, name: "点都德 (大茶楼)", province: "广东", city: "广州", address: "广州市越秀区惠福东路470号",
    rating: 4.8, reviews: 21000, type: "早茶", image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800", price: "¥90/人",
    description: "广州老字号茶楼，全天候供应传统广式点心。虾饺皇、红米肠是必点招牌。",
    reviewsList: [
      { id: 1, user: "郑**", rating: 5, date: "2026-03-16", content: "金莎海虾红米肠太好吃了！外软内脆，虾肉Q弹。虾饺皇也很大颗。" },
      { id: 2, user: "黄**", rating: 5, date: "2026-03-09", content: "喝早茶的好去处，点心种类繁多，盲点都不踩雷，服务也很好。" }
    ]
  },
  {
    id: 6, name: "陶陶居", province: "广东", city: "广州", address: "广州市天河区天河路228号正佳广场6楼",
    rating: 4.6, reviews: 18000, type: "粤菜", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800", price: "¥150/人",
    description: "百年老字号粤菜馆，环境优雅，出品精致。烧鹅、冰镇咕噜肉是其特色名菜。",
    reviewsList: [
      { id: 1, user: "林**", rating: 5, date: "2026-03-13", content: "百年烧鹅皮脆肉嫩，肥而不腻。冰镇咕噜肉外酥里嫩，酸甜可口。" },
      { id: 2, user: "何**", rating: 4, date: "2026-03-06", content: "环境很好，适合宴请。菜品精致，就是分量稍微有点小。" }
    ]
  },
  {
    id: 7, name: "四季民福烤鸭店", province: "北京", city: "北京", address: "北京市东城区南池子大街11号",
    rating: 4.9, reviews: 25000, type: "北京菜", image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800", price: "¥180/人",
    description: "北京人气极高的烤鸭店，鸭皮酥脆入口即化。故宫店还可以边吃烤鸭边赏故宫美景。",
    reviewsList: [
      { id: 1, user: "孙**", rating: 5, date: "2026-03-18", content: "烤鸭绝了！鸭皮蘸白糖入口即化，鸭肉很嫩。贝勒爷烤肉也很好吃。" },
      { id: 2, user: "马**", rating: 4, date: "2026-03-10", content: "排队太恐怖了，等了三个小时。但是吃到烤鸭的那一刻觉得值了。" }
    ]
  },
  {
    id: 8, name: "文和友", province: "湖南", city: "长沙", address: "长沙市天心区湘江中路海信广场",
    rating: 4.7, reviews: 32000, type: "湘菜/小吃", image: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&q=80&w=800", price: "¥100/人",
    description: "沉浸式复古市井文化体验地，汇聚了长沙各种地道小吃，小龙虾是必点。",
    reviewsList: [
      { id: 1, user: "朱**", rating: 5, date: "2026-03-17", content: "里面的装修太有年代感了，拍照超级出片！口味虾很入味，辣得很爽。" },
      { id: 2, user: "胡**", rating: 4, date: "2026-03-12", content: "简直是一个巨大的迷宫，里面什么都有。臭豆腐和糖油粑粑也不错。" }
    ]
  }
];;
