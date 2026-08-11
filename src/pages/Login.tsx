import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Compass, Loader2, User, Lock, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// ============================================================
// 世界旅游胜地轮播（每图配主题色 → 登录区配色动态跟随）
// 注：不用 canvas 取色（Unsplash 跨域污染），预定义主题色
// ============================================================

interface Slide {
  image: string;
  city: string;
  country: string;
  tagline: string;
  accent: string;      // 主色
  accentSoft: string;  // 浅色（选中态）
  glow: string;        // 光晕
}

const SLIDES: Slide[] = [
  {
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=1920",
    city: "京都", country: "日本", tagline: "樱花与古寺的千年对话",
    accent: "#ec4899", accentSoft: "#fce7f3", glow: "rgba(236,72,153,0.35)",
  },
  {
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=1920",
    city: "巴黎", country: "法国", tagline: "在铁塔灯火下漫游塞纳河",
    accent: "#8b5cf6", accentSoft: "#ede9fe", glow: "rgba(139,92,246,0.35)",
  },
  {
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=1920",
    city: "圣托里尼", country: "希腊", tagline: "爱琴海悬崖上的纯白梦境",
    accent: "#0ea5e9", accentSoft: "#e0f2fe", glow: "rgba(14,165,233,0.35)",
  },
  {
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=1920",
    city: "巴厘岛", country: "印尼", tagline: "椰林与神庙的热带呼吸",
    accent: "#10b981", accentSoft: "#d1fae5", glow: "rgba(16,185,129,0.35)",
  },
  {
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=1920",
    city: "采尔马特", country: "瑞士", tagline: "马特洪峰下的雪线童话",
    accent: "#22c55e", accentSoft: "#dcfce7", glow: "rgba(34,197,94,0.35)",
  },
  {
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&q=80&w=1920",
    city: "冰岛", country: "极光", tagline: "把夜空染成流动的极光",
    accent: "#7c3aed", accentSoft: "#ede9fe", glow: "rgba(124,58,237,0.4)",
  },
  {
    image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&q=80&w=1920",
    city: "悉尼", country: "澳大利亚", tagline: "海港帆影与歌剧院白",
    accent: "#2563eb", accentSoft: "#dbeafe", glow: "rgba(37,99,235,0.35)",
  },
  {
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=1920",
    city: "纽约", country: "美国", tagline: "永不熄灯的城市天际线",
    accent: "#f59e0b", accentSoft: "#fef3c7", glow: "rgba(245,158,11,0.35)",
  },
];

const SLIDE_MS = 6000;

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [slide, setSlide] = useState(0);

  const from = (location.state as { from?: string } | null)?.from || "/profile";
  const active = SLIDES[slide];

  // 轮播：自动播放 + 主题色注入
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(t);
  }, []);

  // 主题色跟随：CSS 变量过渡
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", active.accent);
    root.style.setProperty("--accent-soft", active.accentSoft);
    root.style.setProperty("--accent-glow", active.glow);
  }, [slide]);

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (nickname.trim().length < 2) { setError("昵称至少 2 个字符"); return; }
    if (password.length < 6) { setError("密码至少 6 位"); return; }
    if (mode === "register" && password !== confirm) { setError("两次输入的密码不一致"); return; }
    setLoading(true);
    setError("");
    try {
      if (mode === "login") { await login(nickname.trim(), password); }
      else { await register(nickname.trim(), password); }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  const goSlide = (i: number) => setSlide((i + SLIDES.length) % SLIDES.length);

  return (
    <div className="min-h-screen flex bg-[#fff7ed]" style={{ transition: "background-color 0.8s ease" }}>
      {/* ============ 左侧：世界轮播 ============ */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-gray-950">
        {SLIDES.map((s, i) => (
          <div
            key={s.city}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${i === slide ? "opacity-100" : "opacity-0"}`}
          >
            <img src={s.image} alt={s.city} className="w-full h-full object-cover scale-105" style={{ transform: i === slide ? "scale(1.05)" : "scale(1)", transition: "transform 7s ease-out" }} />
          </div>
        ))}

        {/* 底部渐变遮罩（保证文字可读） */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

        {/* 左上品牌 */}
        <div className="absolute top-8 left-10 flex items-center gap-2 z-10">
          <Compass className="h-9 w-9 text-white" style={{ filter: `drop-shadow(0 0 12px var(--accent-glow))` }} />
          <span className="font-serif font-bold text-2xl tracking-tight text-white">
            Voyage<span style={{ color: "var(--accent)" }}>X</span>
          </span>
        </div>

        {/* 左下城市信息 */}
        <div className="absolute bottom-12 left-10 right-10 z-10">
          <AnimateCity city={active.city} country={active.country} tagline={active.tagline} />
          {/* 指示点 + 计数 */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goSlide(i)}
                  aria-label={`查看 ${SLIDES[i].city}`}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === slide ? "w-8" : "w-2.5 bg-white/40 hover:bg-white/70"}`}
                  style={i === slide ? { backgroundColor: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" } : undefined}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 text-white/70 text-sm font-mono">
              {String(slide + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
            </div>
          </div>
          {/* 进度条 */}
          <div className="mt-3 h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div
              key={slide}
              className="h-full rounded-full"
              style={{ backgroundColor: "var(--accent)", animation: `slideProgress ${SLIDE_MS}ms linear forwards` }}
            />
          </div>
        </div>

        {/* 左右切换 */}
        <button onClick={() => goSlide(slide - 1)} aria-label="上一张" className="absolute top-1/2 left-4 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={() => goSlide(slide + 1)} aria-label="下一张" className="absolute top-1/2 right-4 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ============ 右侧：登录逻辑 ============ */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative">
        {/* 移动端顶部品牌 */}
        <div className="lg:hidden absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <Compass className="h-7 w-7" style={{ color: "var(--accent)" }} />
          <span className="font-serif font-bold text-xl tracking-tight text-gray-900">
            Voyage<span style={{ color: "var(--accent)" }}>X</span>
          </span>
        </div>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "login" ? "欢迎回来" : "创建账号"}
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">
              {mode === "login" ? "登录后同步你的收藏与 AI 行程" : "一分钟注册，开启 AI 旅行规划"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border" style={{ borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)", boxShadow: "0 8px 30px color-mix(in srgb, var(--accent) 12%, transparent)" }}>
            {/* 模式切换 */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-6" style={{ backgroundColor: "var(--accent-soft)" }}>
              {(["login", "register"] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                  style={mode === m ? { color: "var(--accent)" } : undefined}
                >
                  {m === "login" ? "登录" : "注册"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="nickname" type="text" value={nickname} onChange={e => setNickname(e.target.value)}
                    placeholder="你的昵称"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none transition-all focus:ring-2"
                    style={{ caretColor: "var(--accent)" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "至少 6 位" : "输入密码"}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none transition-all"
                    style={{ caretColor: "var(--accent)" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              {mode === "register" && (
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder="再次输入密码"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none transition-all"
                      style={{ caretColor: "var(--accent)" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit" disabled={loading}
                className="w-full text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", boxShadow: "0 4px 14px var(--accent-glow)" }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 请稍候...</> : (mode === "login" ? "登录" : "注册并登录")}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            <Link to="/" className="hover:underline transition-colors" style={{ color: "inherit" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.color = "inherit")}
            >← 返回首页</Link>
          </p>
        </div>
      </div>

      {/* 进度条动画 keyframes */}
      <style>{`
        @keyframes slideProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
        * { transition: border-color 0.5s ease, box-shadow 0.5s ease; }
      `}</style>
    </div>
  );
}

/** 城市信息（切换时淡入上移） */
function AnimateCity({ city, country, tagline }: { city: string; country: string; tagline: string }) {
  return (
    <div key={city} className="animate-city-in">
      <div className="flex items-center gap-2 text-white/80 text-sm uppercase tracking-widest mb-2">
        <MapPin className="w-4 h-4" style={{ color: "var(--accent)" }} />
        {country}
      </div>
      <h2 className="text-4xl font-serif font-bold text-white mb-2">{city}</h2>
      <p className="text-white/85 text-lg">{tagline}</p>
      <style>{`
        @keyframes cityIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-city-in { animation: cityIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>
    </div>
  );
}
