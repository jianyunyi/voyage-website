import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Compass, Loader2, User, Lock, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// ============================================================
// 全屏背景轮播 + 渐进式图片加载（blur-up）+ 玻璃表单
// ============================================================

interface Slide {
  image: string;     // 高清
  thumb: string;     // 低清模糊缩略（渐进式占位）
  city: string;
  country: string;
  tagline: string;
  accent: string;
  accentSoft: string;
  glow: string;
}

const SLIDES: Slide[] = [
  {
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=75&w=1920",
    thumb: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=20&w=40",
    city: "京都", country: "日本", tagline: "樱花与古寺的千年对话",
    accent: "#ec4899", accentSoft: "#fce7f3", glow: "rgba(236,72,153,0.35)",
  },
  {
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=75&w=1920",
    thumb: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=20&w=40",
    city: "巴黎", country: "法国", tagline: "在铁塔灯火下漫游塞纳河",
    accent: "#8b5cf6", accentSoft: "#ede9fe", glow: "rgba(139,92,246,0.35)",
  },
  {
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=75&w=1920",
    thumb: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=20&w=40",
    city: "圣托里尼", country: "希腊", tagline: "爱琴海悬崖上的纯白梦境",
    accent: "#0ea5e9", accentSoft: "#e0f2fe", glow: "rgba(14,165,233,0.35)",
  },
  {
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=75&w=1920",
    thumb: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=20&w=40",
    city: "巴厘岛", country: "印尼", tagline: "椰林与神庙的热带呼吸",
    accent: "#10b981", accentSoft: "#d1fae5", glow: "rgba(16,185,129,0.35)",
  },
  {
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=75&w=1920",
    thumb: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=20&w=40",
    city: "采尔马特", country: "瑞士", tagline: "马特洪峰下的雪线童话",
    accent: "#22c55e", accentSoft: "#dcfce7", glow: "rgba(34,197,94,0.35)",
  },
  {
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&q=75&w=1920",
    thumb: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&q=20&w=40",
    city: "冰岛", country: "极光", tagline: "把夜空染成流动的极光",
    accent: "#7c3aed", accentSoft: "#ede9fe", glow: "rgba(124,58,237,0.4)",
  },
  {
    image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&q=75&w=1920",
    thumb: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&q=20&w=40",
    city: "悉尼", country: "澳大利亚", tagline: "海港帆影与歌剧院白",
    accent: "#2563eb", accentSoft: "#dbeafe", glow: "rgba(37,99,235,0.35)",
  },
  {
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=75&w=1920",
    thumb: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=20&w=40",
    city: "纽约", country: "美国", tagline: "永不熄灯的城市天际线",
    accent: "#f59e0b", accentSoft: "#fef3c7", glow: "rgba(245,158,11,0.35)",
  },
];

const SLIDE_MS = 6000;

export default function Login() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [slide, setSlide] = useState(0);
  // 高清图加载完成标记（渐进式 blur-up）
  const [loaded, setLoaded] = useState<boolean[]>(() => SLIDES.map(() => false));

  const from = (location.state as { from?: string } | null)?.from || "/";
  const active = SLIDES[slide];

  // 已登录访问登录页 → 自动跳首页
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 挂载时预加载全部高清图
  useEffect(() => {
    SLIDES.forEach((s, i) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => setLoaded(prev => {
        if (prev[i]) return prev;
        const next = [...prev];
        next[i] = true;
        return next;
      });
      img.src = s.image;
    });
  }, []);

  // 轮播：自动播放（reduced-motion 禁用）
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(t);
  }, []);

  // 主题色跟随
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
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-zinc-950">
      {/* ============ 背景轮播（全屏，渐进式 blur-up） ============ */}
      {SLIDES.map((s, i) => (
        <div
          key={s.city}
          className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${i === slide ? "opacity-100" : "opacity-0"}`}
          aria-hidden={i !== slide}
        >
          {/* 低清模糊占位（立即显示，渐进式第一步） */}
          <img
            src={s.thumb}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover blur-2xl scale-110 transition-opacity duration-700 ${loaded[i] ? "opacity-0" : "opacity-100"}`}
          />
          {/* 高清图（加载完成后渐显，渐进式第二步） */}
          <img
            src={s.image}
            alt={`${s.city} ${s.country}`}
            loading={i === slide ? "eager" : "lazy"}
            fetchPriority={i === slide ? "high" : "auto"}
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${loaded[i] ? "opacity-100" : "opacity-0"}`}
            style={{ transform: i === slide ? "scale(1.06)" : "scale(1)", transition: "transform 8s ease-out, opacity 1000ms ease" }}
          />
        </div>
      ))}

      {/* 深色遮罩（保证表单可读 + 视觉纵深） */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/35 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {/* 顶部品牌 */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <Compass className="h-8 w-8 text-white" style={{ filter: "drop-shadow(0 0 14px var(--accent-glow))" }} />
        <span className="font-serif font-bold text-2xl tracking-tight text-white">
          Voyage<span style={{ color: "var(--accent)" }}>X</span>
        </span>
      </div>

      {/* ============ 中央玻璃表单 ============ */}
      <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                  {mode === "login" ? "欢迎回来" : "创建账号"}
                </h1>
                <p className="text-sm text-white/75 mt-2 drop-shadow">
                  {mode === "login" ? "登录后同步你的收藏与 AI 行程" : "一分钟注册，开启 AI 旅行规划"}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Liquid Glass 卡片（refraction：内边框 + 内高光） */}
          <div
            className="backdrop-blur-xl rounded-3xl p-7 border border-white/15"
            style={{
              background: "linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 20px 50px rgba(0,0,0,0.45)",
            }}
          >
            {/* 模式切换 */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl mb-6 bg-black/25 backdrop-blur-sm border border-white/10">
              {(["login", "register"] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    mode === m
                      ? "bg-white/90 text-gray-900 shadow-lg"
                      : "text-white/70 hover:text-white"
                  }`}
                  style={mode === m ? { color: "var(--accent)" } : undefined}
                >
                  {m === "login" ? "登录" : "注册"}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              onSubmit={handleSubmit}
              className="space-y-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-white/85 mb-1.5">昵称</label>
                <div className="relative">
                  <User className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="nickname" type="text" value={nickname} onChange={e => setNickname(e.target.value)}
                    placeholder="你的昵称"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/15 rounded-2xl text-white placeholder-white/40 outline-none transition-all duration-300"
                    style={{ caretColor: "var(--accent)", backdropFilter: "blur(4px)" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)"; e.currentTarget.style.background = "rgba(255,255,255,0.16)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "rgba(255,255,255,0.10)"; }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/85 mb-1.5">密码</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "至少 6 位" : "输入密码"}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/15 rounded-2xl text-white placeholder-white/40 outline-none transition-all duration-300"
                    style={{ caretColor: "var(--accent)", backdropFilter: "blur(4px)" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)"; e.currentTarget.style.background = "rgba(255,255,255,0.16)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "rgba(255,255,255,0.10)"; }}
                  />
                </div>
              </div>

              {mode === "register" && (
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-white/85 mb-1.5">确认密码</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder="再次输入密码"
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/15 rounded-2xl text-white placeholder-white/40 outline-none transition-all duration-300"
                      style={{ caretColor: "var(--accent)", backdropFilter: "blur(4px)" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)"; e.currentTarget.style.background = "rgba(255,255,255,0.16)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "rgba(255,255,255,0.10)"; }}
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-200 bg-red-500/20 border border-red-400/20 rounded-xl px-3 py-2">{error}</p>}

              <button
                type="submit" disabled={loading}
                className="w-full text-white py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", boxShadow: "0 8px 24px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)" }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 请稍候...</> : (mode === "login" ? "登录" : "注册并登录")}
              </button>
            </motion.form>
            </AnimatePresence>
          </div>

          <p className="text-center text-xs text-white/50 mt-6">
            <Link to="/" className="hover:text-white transition-colors">← 返回首页</Link>
          </p>
        </div>
      </div>

      {/* ============ 底部城市信息 + 指示点 ============ */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-center w-full px-6">
        <div key={slide} className="animate-city-in">
          <div className="flex items-center justify-center gap-1.5 text-white/80 text-xs uppercase tracking-[0.2em] mb-1">
            <MapPin className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
            {active.country}
          </div>
          <div className="text-white text-lg font-medium">{active.city}</div>
          <div className="text-white/60 text-sm mt-0.5">{active.tagline}</div>
        </div>

        {/* 指示点 */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`查看 ${SLIDES[i].city}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${i === slide ? "w-8" : "w-2.5 bg-white/35 hover:bg-white/60"}`}
              style={i === slide ? { backgroundColor: "var(--accent)", boxShadow: "0 0 10px var(--accent-glow)" } : undefined}
            />
          ))}
        </div>
      </div>

      {/* 动画 keyframes */}
      <style>{`
        @keyframes cityIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-city-in { animation: cityIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>
    </div>
  );
}
