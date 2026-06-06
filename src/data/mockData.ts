export const travelGuides = [
  {
    id: "g1",
    title: "成都5日深度游：从大熊猫到宽窄巷子，吃喝玩乐全攻略",
    author: "旅行达人小王",
    destination: "成都",
    days: 5,
    budget: 3500,
    likes: 1250,
    image: "https://images.unsplash.com/photo-1557425955-df376b5903c8?auto=format&fit=crop&q=80&w=1000",
    tags: ["深度游", "美食", "文化"]
  },
  {
    id: "g2",
    title: "重庆3D魔幻城市3日打卡路线，不走回头路",
    author: "山城探索者",
    destination: "重庆",
    days: 3,
    budget: 2000,
    likes: 3420,
    image: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&q=80&w=1000",
    tags: ["打卡", "摄影", "周末游"]
  },
  {
    id: "g3",
    title: "西安4日历史文化之旅：兵马俑、大雁塔、回民街",
    author: "历史爱好者",
    destination: "西安",
    days: 4,
    budget: 2800,
    likes: 890,
    image: "https://images.unsplash.com/photo-1599008633840-052c7f756385?auto=format&fit=crop&q=80&w=1000",
    tags: ["历史", "古迹", "亲子游"]
  },
  {
    id: "g4",
    title: "三亚5日度假指南：阳光、沙滩与海鲜大餐",
    author: "海岛控",
    destination: "三亚",
    days: 5,
    budget: 5000,
    likes: 2100,
    image: "https://images.unsplash.com/photo-1540202404-b711142289ba?auto=format&fit=crop&q=80&w=1000",
    tags: ["海岛", "度假", "休闲"]
  },
  {
    id: "g5",
    title: "大西北环线7日游：青海湖、茶卡盐湖、敦煌莫高窟",
    author: "远方来信",
    destination: "青海/甘肃",
    days: 7,
    budget: 4500,
    likes: 5600,
    image: "https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?auto=format&fit=crop&q=80&w=1000",
    tags: ["大西北", "自驾游", "风光"]
  },
  {
    id: "g6",
    title: "杭州周末2日游：西湖泛舟，龙井问茶",
    author: "江南烟雨",
    destination: "杭州",
    days: 2,
    budget: 1500,
    likes: 1850,
    image: "https://images.unsplash.com/photo-1562916669-e0dfee19cbea?auto=format&fit=crop&q=80&w=1000",
    tags: ["周末游", "自然", "情侣"]
  },
  {
    id: "g7",
    title: "云南大理8日慢生活体验：苍山洱海，风花雪月",
    author: "游牧者",
    destination: "大理",
    days: 8,
    budget: 6000,
    likes: 1800,
    image: "https://images.unsplash.com/photo-1540202404-b711c040d6b5?auto=format&fit=crop&q=80&w=1000",
    tags: ["深度游", "度假", "摄影"]
  }
];

export const foodRecommendations = [
  {
    id: 1, name: "宽窄巷子老火锅", province: "四川", city: "成都", address: "成都市青羊区宽巷子8号",
    rating: 4.9, reviews: 12500, type: "火锅", image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800", price: "¥120/人",
    description: "地道川味火锅，环境古色古香，位于著名景点宽窄巷子内，是体验成都慢生活的绝佳去处。",
    tags: ["麻辣", "香辣", "重口味"],
    reviewsList: [
      { id: 1, user: "张**", rating: 5, date: "2026-03-15", content: "味道非常正宗，牛油锅底越吃越香！环境也很好，很有成都特色。" },
      { id: 2, user: "王**", rating: 4, date: "2026-03-10", content: "排队人挺多的，建议提前取号。毛肚和鹅肠必点，非常新鲜。" }
    ]
  },
  {
    id: 2, name: "陈麻婆豆腐 (总店)", province: "四川", city: "成都", address: "成都市青羊区西玉龙街197号",
    rating: 4.8, reviews: 8900, type: "川菜", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800", price: "¥60/人",
    description: "始于清朝同治年间的中华老字号，麻婆豆腐的发源地，麻、辣、烫、香、酥、嫩、鲜、活。",
    tags: ["麻辣", "下饭", "老字号"],
    reviewsList: [
      { id: 1, user: "李**", rating: 5, date: "2026-03-12", content: "名不虚传！麻婆豆腐太下饭了，一个人能吃三大碗米饭。" },
      { id: 2, user: "赵**", rating: 5, date: "2026-03-08", content: "除了麻婆豆腐，宫保鸡丁也很好吃，价格亲民，性价比极高。" }
    ]
  },
  {
    id: 3, name: "洞子老火锅", province: "重庆", city: "重庆", address: "重庆市渝中区中山三路153号",
    rating: 4.9, reviews: 15600, type: "火锅", image: "https://images.unsplash.com/photo-1626804475297-41609ea0af49?auto=format&fit=crop&q=80&w=800", price: "¥110/人",
    description: "开在防空洞里的特色火锅，体验重庆独特的防空洞文化，锅底醇厚，辣而不燥。",
    tags: ["麻辣", "火锅", "特色"],
    reviewsList: [
      { id: 1, user: "刘**", rating: 5, date: "2026-03-14", content: "防空洞里吃火锅太有感觉了！夏天去里面还很凉快，火锅味道也是一绝。" },
      { id: 2, user: "陈**", rating: 4, date: "2026-03-05", content: "微辣也挺辣的，不能吃辣的朋友慎重。鸭血和酥肉很好吃。" }
    ]
  },
  {
    id: 4, name: "全聚德烤鸭店 (前门店)", province: "北京", city: "北京", address: "北京市东城区前门大街30号",
    rating: 4.7, reviews: 32000, type: "北京菜", image: "https://images.unsplash.com/photo-1544378730-8b56f84cc8aa?auto=format&fit=crop&q=80&w=800", price: "¥180/人",
    description: "闻名中外的中华老字号，以挂炉烤鸭著称，皮酥肉嫩，肥而不腻。",
    tags: ["烤鸭", "鲜甜", "老字号", "不辣"],
    reviewsList: [
      { id: 1, user: "林**", rating: 5, date: "2026-03-16", content: "来北京必吃全聚德，烤鸭师傅当面片鸭子，仪式感满满。鸭皮蘸白糖入口即化。" },
      { id: 2, user: "张**", rating: 4, date: "2026-03-02", content: "价格偏贵，但烤鸭确实好吃。服务也很好，环境气派。" }
    ]
  },
  {
    id: 5, name: "陶陶居酒家 (第十甫路总店)", province: "广东", city: "广州", address: "广州市荔湾区第十甫路20号",
    rating: 4.8, reviews: 18500, type: "粤菜", image: "https://images.unsplash.com/photo-1562916669-e0dfee19cbea?auto=format&fit=crop&q=80&w=800", price: "¥100/人",
    description: "广州最著名的老字号茶楼之一，虾饺、烧卖、凤爪等传统早茶点心精致美味。",
    tags: ["清淡", "早茶", "鲜甜", "不辣"],
    reviewsList: [
      { id: 1, user: "吴**", rating: 5, date: "2026-03-18", content: "老广的味道！虾饺皇皮薄馅大，里面全是虾仁。凤爪软糯脱骨，太赞了。" },
      { id: 2, user: "周**", rating: 5, date: "2026-03-11", content: "喝早茶的好去处，环境很有岭南特色。排队人多，建议早点去去。" }
    ]
  },
  {
    id: 6, name: "文和友老长沙龙虾馆", province: "湖南", city: "长沙", address: "长沙市天心区湘江中路二段海信广场",
    rating: 4.7, reviews: 25000, type: "湘菜", image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=800", price: "¥150/人",
    description: "重现80年代老长沙街景的超级餐饮地标，招牌口味虾鲜香麻辣，让人欲罢不能。",
    tags: ["香辣", "麻辣", "重口味", "网红"],
    reviewsList: [
      { id: 1, user: "朱**", rating: 5, date: "2026-03-17", content: "里面的装修太有年代感了，拍照超级出片！口味虾很入味，辣得很爽。" },
      { id: 2, user: "胡**", rating: 4, date: "2026-03-12", content: "简直是一个巨大的迷宫，里面什么都有。臭豆腐和糖油粑粑也不错。" }
    ]
  }
];
