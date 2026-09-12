/**
 * 旅行攻略数据（Guides 列表 + GuideDetail 详情共用）
 */

export interface TravelGuide {
  id: string;
  title: string;
  author: string;
  destination: string;
  days: number;
  budget: number;
  likes: number;
  image: string;
  tags: string[];
  content: string[];
  highlights: string[];
  comments: Array<{ id: number; user: string; date: string; content: string; rating: number }>;
}

export const travelGuides: TravelGuide[] = [
  {
    id: "g1", title: "成都5日深度游：从大熊猫到宽窄巷子，吃喝玩乐全攻略",
    author: "旅行达人小王", destination: "成都", days: 5, budget: 3500, likes: 1250,
    image: "https://images.unsplash.com/photo-1557425955-df376b5903c8?auto=format&fit=crop&q=80&w=1000",
    tags: ["深度游", "美食", "文化"],
    content: [
      "成都是一个来了就不想走的城市。5天的行程我建议住在春熙路或宽窄巷子附近，交通便利、美食密集，白天逛景点晚上吃火锅，节奏刚刚好。",
      "第一天留给大熊猫繁育研究基地，记得早上7点半前到，能看到熊猫最活跃的进食时间。下午去宽窄巷子感受老成都的市井气息，晚上在奎星楼街吃串串。",
      "第二天到武侯祠和锦里，体验三国文化与川西民俗。第三天去都江堰看两千年的水利工程，顺便在青城山脚下吃农家菜。第四天留给人民公园的鹤鸣茶社，喝盖碗茶看掏耳朵，感受成都人的慢生活。",
      "最后一天可以逛逛太古里和 IFS，买点伴手礼。成都的火锅、串串、担担面、钟水饺都值得一试，人均预算控制在700元/天就能吃得非常好。",
    ],
    highlights: ["大熊猫基地看滚滚", "宽窄巷子喝盖碗茶", "都江堰千年水利", "奎星楼街串串香"],
    comments: [{"id": 1, "user": "熊猫控小美", "date": "2026-05-18", "rating": 5, "content": "按这个攻略走了全程，大熊猫基地一定要早去！第3天都江堰的农家菜绝了。"}, {"id": 2, "user": "旅行青蛙", "date": "2026-05-02", "rating": 5, "content": "宽窄巷子晚上比白天更有味道，奎星楼街的串串排队40分钟也值。"}, {"id": 3, "user": "阿汤", "date": "2026-04-25", "rating": 4, "content": "预算估算很准，700/天真的能吃很好，鹤鸣茶社的盖碗茶太安逸了。"}],
  },
  {
    id: "g2", title: "重庆3D魔幻城市3日打卡路线，不走回头路",
    author: "山城探索者", destination: "重庆", days: 3, budget: 2000, likes: 3420,
    image: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&q=80&w=1000",
    tags: ["打卡", "摄影", "周末游"],
    content: [
      "重庆是一座建在山上的城市，导航在这里经常失灵，但迷路本身就是一种乐趣。建议住在解放碑附近，轨道交通+步行就能玩遍核心区。",
      "第一天：解放碑-洪崖洞-千厮门大桥，傍晚的洪崖洞夜景是重庆的名片。第二天：李子坝轻轨穿楼-鹅岭二厂-长江索道，感受3D魔幻地形。第三天：磁器口古镇-南山一棵树观景台，俯瞰两江交汇。",
      "重庆小面、火锅、酸辣粉、江湖菜都是必吃。这里没有鸳鸯锅的将就，微辣就是外地人的底线。",
    ],
    highlights: ["洪崖洞夜景", "李子坝轻轨穿楼", "长江索道跨江", "南山一棵树全景"],
    comments: [{"id": 1, "user": "魔幻山城", "date": "2026-05-15", "rating": 5, "content": "洪崖洞夜景名不虚传，导航真的会失灵，建议直接问本地人！"}, {"id": 2, "user": "小笼包", "date": "2026-04-30", "rating": 4, "content": "李子坝轻轨穿楼机位已找到，长江索道排队要早去。"}],
  },
  {
    id: "g3", title: "西安4日历史文化之旅：兵马俑、大雁塔、回民街",
    author: "历史爱好者", destination: "西安", days: 4, budget: 2800, likes: 890,
    image: "https://images.unsplash.com/photo-1599008633840-052c7f756385?auto=format&fit=crop&q=80&w=1000",
    tags: ["历史", "古迹", "亲子游"],
    content: [
      "西安是十三朝古都，每一块城砖都有故事。建议住在钟楼附近，地铁四通八达，回民街就在步行范围内。",
      "第一天留给兵马俑和华清宫，火车站有直达大巴。第二天上古城墙骑行一圈（14公里），下午去碑林博物馆看书法名碑。第三天大雁塔+大唐不夜城，晚上的不夜城灯光秀非常震撼。",
      "回民街的肉夹馍、凉皮、羊肉泡馍、甑糕都要尝。biangbiang面记得点宽的。",
    ],
    highlights: ["兵马俑震撼军阵", "古城墙骑行", "大唐不夜城夜景", "回民街美食"],
    comments: [{"id": 1, "user": "兵马俑迷", "date": "2026-05-20", "rating": 5, "content": "城墙骑行14公里很爽，大唐不夜城的灯光秀一定别错过！"}, {"id": 2, "user": "历史课代表", "date": "2026-04-28", "rating": 5, "content": "biangbiang面记得点宽的！回民街的甑糕也很好吃。"}],
  },
  {
    id: "g4", title: "广州吃货3日游，从早茶到夜宵的终极指南",
    author: "老广食客", destination: "广州", days: 3, budget: 2500, likes: 2100,
    image: "https://images.unsplash.com/photo-1583248369069-9d91f1640fe6?auto=format&fit=crop&q=80&w=1000",
    tags: ["美食", "休闲", "周末游"],
    content: [
      "广州的清晨从一盅两件开始。陶陶居、广州酒家、点都德都是老字号，虾饺、凤爪、烧麦、肠粉一样都不能少。",
      "白天逛沙面岛的老建筑、陈家祠的岭南工艺，傍晚去珠江夜游。晚上十点后的宝业路大排档是真正的广州夜生活，烧鹅、艇仔粥、炒牛河。",
      "建议住在北京路或上下九附近，美食密度极高，一天五顿不是梦。",
    ],
    highlights: ["老字号早茶", "沙面岛欧陆风情", "珠江夜游", "宝业路大排档"],
    comments: [{"id": 1, "user": "早茶爱好者", "date": "2026-05-12", "rating": 5, "content": "一天五顿不是梦！虾饺和凤爪必点，晚上十点的大排档才是真广州。"}, {"id": 2, "user": "老广", "date": "2026-05-01", "rating": 4, "content": "沙面岛拍照很好看，珠江夜游建议选晚上8点那班。"}],
  },
  {
    id: "g5", title: "云南大理丽江7日浪漫双城记",
    author: "流浪的云", destination: "云南", days: 7, budget: 5000, likes: 4500,
    image: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&q=80&w=1000",
    tags: ["浪漫", "风景", "长线游"],
    content: [
      "大理的风花雪月、丽江的古城的柔软时光，7天刚好把两座城的节奏都放慢下来。建议先到大理，环洱海骑行一周。",
      "大理：洱海-双廊-喜洲古镇，白族民居和扎染值得停留。然后坐动车去丽江，大研古城-束河古镇-玉龙雪山，蓝月谷的水是真正的Tiffany蓝。",
      "云南菜酸辣开胃，过桥米线、汽锅鸡、烤乳扇、鲜花饼都要尝。丽江晚上找家民谣酒吧，听一曲《丽江小倩》。",
    ],
    highlights: ["环洱海骑行", "喜洲白族民居", "玉龙雪山蓝月谷", "丽江古城夜生活"],
    comments: [{"id": 1, "user": "洱海的风", "date": "2026-05-22", "rating": 5, "content": "环洱海骑行一周是最正确的决定，喜洲的扎染值得停留。"}, {"id": 2, "user": "雪山之约", "date": "2026-05-10", "rating": 5, "content": "蓝月谷的水真的像Tiffany蓝！丽江晚上民谣酒吧氛围拉满。"}, {"id": 3, "user": "慢生活", "date": "2026-04-20", "rating": 4, "content": "7天刚好把节奏放慢，大理比丽江更安静，都很好。"}],
  },
  {
    id: "g6", title: "三亚5日度假指南：阳光、沙滩与海鲜",
    author: "海岛控", destination: "三亚", days: 5, budget: 6000, likes: 1800,
    image: "https://images.unsplash.com/photo-1540202404-b711c040d6b5?auto=format&fit=crop&q=80&w=1000",
    tags: ["海岛", "度假", "亲子游"],
    content: [
      "三亚是国内度假首选。建议住在亚龙湾或海棠湾，沙滩质量最好、酒店设施完善。五天纯度假模式：睡到自然醒、海边散步、泳池泡水。",
      "亚龙湾热带天堂森林公园（《非诚勿扰》取景地）、蜈支洲岛潜水、南山文化旅游区看108米海上观音。三亚湾的日落大道是免费的浪漫。",
      "海鲜市场买海鲜找加工店代加工，和乐蟹、基围虾、石斑鱼都新鲜。椰子鸡和清补凉是消暑神器。",
    ],
    highlights: ["亚龙湾白沙滩", "蜈支洲岛潜水", "南山海上观音", "第一市场海鲜"],
    comments: [{"id": 1, "user": "海岛控", "date": "2026-05-16", "rating": 5, "content": "亚龙湾的沙滩质量真的顶，蜈支洲岛潜水一定要体验！"}, {"id": 2, "user": "椰子鸡", "date": "2026-05-05", "rating": 5, "content": "第一市场买海鲜找加工，和乐蟹超新鲜，清补凉每天两碗。"}],
  },
];

export function findGuide(id: string): TravelGuide | undefined {
  return travelGuides.find(g => g.id === id);
}
