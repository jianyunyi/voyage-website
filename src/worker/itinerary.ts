/**
 * VoyageX Itinerary API — AI 行程生成
 *
 * 端点：POST /api/itinerary
 * 当前：规则模板生成（Mock 模式），接口契约按 API_SPEC 定义。
 * 未来接入 Gemini：替换 generateItineraryMock 为 GenAI 调用
 * （密钥走 Worker secret，不暴露到前端 bundle）。
 */

export interface ItineraryRequest {
  origin: string;
  destinations: string[];
  dates: { start: string; end: string };
  preferences: {
    budget: "budget" | "moderate" | "luxury";
    travel_mode: "fastest" | "relaxed" | "balanced";
    interests?: string[];
  };
}

export interface ItineraryStep {
  time: string;
  type: string;
  title: string;
  description: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  steps: ItineraryStep[];
}

export interface Itinerary {
  days: ItineraryDay[];
  sources: string[];
}

const BUDGET_MAP = {
  budget: { hotel: "经济连锁酒店", meal: "本地特色小吃", activity: "免费景点" },
  moderate: { hotel: "舒适型酒店", meal: "口碑餐厅", activity: "经典景点" },
  luxury: { hotel: "五星级酒店", meal: "高端餐厅", activity: "深度体验项目" },
} as const;

const ATTRACTIONS: Record<string, string[]> = {
  "北京": ["故宫博物院", "长城·八达岭", "颐和园", "南锣鼓巷"],
  "上海": ["外滩", "迪士尼乐园", "豫园", "武康路"],
  "广州": ["广州塔", "沙面岛", "陈家祠", "长隆野生动物世界"],
  "成都": ["宽窄巷子", "大熊猫繁育研究基地", "锦里", "都江堰"],
  "西安": ["兵马俑", "大雁塔", "回民街", "城墙"],
  "重庆": ["洪崖洞", "解放碑", "磁器口古镇", "长江索道"],
  "厦门": ["鼓浪屿", "环岛路", "厦门大学", "曾厝垵"],
  "泉州": ["开元寺", "西街", "清源山", "洛阳桥"],
};

const FOOD: Record<string, string[]> = {
  "北京": ["北京烤鸭", "炸酱面", "涮羊肉"],
  "上海": ["小笼包", "生煎", "本帮菜"],
  "广州": ["早茶", "烧鹅", "艇仔粥"],
  "成都": ["火锅", "串串香", "担担面"],
  "西安": ["肉夹馍", "凉皮", "羊肉泡馍"],
  "重庆": ["重庆火锅", "小面", "酸辣粉"],
  "厦门": ["沙茶面", "海蛎煎", "土笋冻"],
  "泉州": ["面线糊", "姜母鸭", "海蛎煎"],
};

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function fmtDate(base: string, offset: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export async function generateItinerary(req: ItineraryRequest, env?: { DEEPSEEK_API_KEY?: string }): Promise<Itinerary> {
  // 优先用 DeepSeek 生成（后端代理，密钥不暴露到前端）
  if (env?.DEEPSEEK_API_KEY) {
    try {
      const ai = await generateWithDeepSeek(req, env.DEEPSEEK_API_KEY);
      if (ai) return ai;
    } catch (e) {
      console.error("[itinerary] DeepSeek 调用失败，降级 mock:", e);
    }
  }
  // 降级：规则模板生成
  return generateMock(req);
}

/**
 * 规则模板生成器（Mock 模式，DeepSeek 不可用时兜底）
 */
async function generateMock(req: ItineraryRequest): Promise<Itinerary> {
  const totalDays = daysBetween(req.dates.start, req.dates.end);
  const dest = req.destinations[0] || "成都";
  const b = BUDGET_MAP[req.preferences.budget] || BUDGET_MAP.moderate;
  const attrs = ATTRACTIONS[dest] || ATTRACTIONS["成都"];
  const foods = FOOD[dest] || FOOD["成都"];

  const days: ItineraryDay[] = [];
  for (let d = 0; d < totalDays; d++) {
    const dayNum = d + 1;
    const attr = attrs[d % attrs.length];
    const food = foods[d % foods.length];
    days.push({
      day: dayNum,
      date: fmtDate(req.dates.start, d),
      steps: [
        { time: "09:00", type: "sightseeing", title: `游览 ${attr}`, description: `${b.activity}，深度感受${dest}的文化魅力。` },
        { time: "12:30", type: "food", title: `午餐：${food}`, description: `品尝当地${food}，体验${dest}地道风味。` },
        { time: "15:00", type: "sightseeing", title: `探访 ${attrs[(d + 1) % attrs.length]}`, description: `继续探索${dest}，感受城市节奏。` },
        { time: "19:00", type: "hotel", title: `入住${b.hotel}`, description: `选择${dest}${b.hotel}，享受舒适休憩。` },
      ],
    });
  }

  // Mock 模式：模拟 AI 生成延迟
  await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
  return { days, sources: ["mock_generator"] };
}


// ============================================================
// DeepSeek 后端代理（OpenAI 兼容 API）
// ============================================================

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

function buildPrompt(req: ItineraryRequest): string {
  const dest = req.destinations[0] || "成都";
  const totalDays = daysBetween(req.dates.start, req.dates.end);
  const interests = req.preferences.interests && req.preferences.interests.length
    ? "\n兴趣：\n" + req.preferences.interests.map(i => "- " + i).join("\n")
    : "";
  return [
    "你是一位专业的旅行规划师。请为以下行程需求生成一份详细的" + totalDays + "日游计划。",
    "",
    "目的地：" + dest,
    "出发地：" + req.origin,
    "日期：" + req.dates.start + " 至 " + req.dates.end + "（共" + totalDays + "天）",
    "预算：" + req.preferences.budget + "（budget=经济 / moderate=舒适 / luxury=豪华）",
    "旅行节奏：" + req.preferences.travel_mode + "（fastest=紧凑 / relaxed=轻松 / balanced=均衡）",
    interests,
    "",
    "要求：",
    "1. 输出严格 JSON，不要包含任何其他文字、不要用 markdown 代码块包裹。",
    "2. JSON 格式：{\"days\":[{\"day\":1,\"date\":\"YYYY-MM-DD\",\"steps\":[{\"time\":\"09:00\",\"type\":\"sightseeing|food|hotel|transport\",\"title\":\"活动标题\",\"description\":\"简要描述\"}]}]}",
    "3. 每天 3-5 个步骤，覆盖景点、餐饮、住宿。",
    "4. 日期从 " + req.dates.start + " 开始，每天递增。",
    "5. 结合" + dest + "当地真实景点与美食。",
    "6. 只输出 JSON，不要输出其他内容。",
  ].join("\n");
}

async function generateWithDeepSeek(req: ItineraryRequest, apiKey: string): Promise<Itinerary | null> {
  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: "你是一个专业旅行规划 AI，只输出 JSON。" },
        { role: "user", content: buildPrompt(req) },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  const raw = data.choices?.[0]?.message?.content || "";

  // 解析 JSON（容忍可能的代码块包裹）
  const parsed = parseJsonContent(raw);
  if (!parsed || !Array.isArray(parsed.days)) {
    throw new Error("DeepSeek 返回内容无法解析为行程 JSON");
  }

  const days: ItineraryDay[] = parsed.days
    .filter((d: any) => d && typeof d.day === "number" && Array.isArray(d.steps))
    .map((d: any) => ({
      day: d.day,
      date: d.date || fmtDate(req.dates.start, d.day - 1),
      steps: d.steps.map((s: any) => ({
        time: String(s.time || "09:00"),
        type: String(s.type || "sightseeing"),
        title: String(s.title || "行程安排"),
        description: String(s.description || ""),
      })),
    }));

  if (days.length === 0) {
    throw new Error("DeepSeek 返回行程为空");
  }

  return { days, sources: ["deepseek"] };
}

/** 解析 LLM 返回的 JSON（容忍 ```json 代码块包裹） */
function parseJsonContent(raw: string): any {
  // 去掉可能的 markdown 代码块 ```json ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1] : raw;
  try {
    return JSON.parse(jsonStr);
  } catch {
    // 尝试找到第一个 { 到最后一个 }
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(jsonStr.slice(start, end + 1)); } catch { return null; }
    }
    return null;
  }
}
