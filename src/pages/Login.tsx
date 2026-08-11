import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Compass, Loader2, User, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

  const from = (location.state as { from?: string } | null)?.from || "/profile";

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (nickname.trim().length < 2) {
      setError("昵称至少 2 个字符");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    if (mode === "register" && password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        await login(nickname.trim(), password);
      } else {
        await register(nickname.trim(), password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff7ed] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Compass className="h-10 w-10 text-orange-600" />
            <span className="font-serif font-bold text-3xl tracking-tight text-gray-900">
              Voyage<span className="text-orange-600">X</span>
            </span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === "login" ? "登录后同步你的收藏与行程" : "一分钟注册，开启 AI 旅行规划"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100">
          {/* 模式切换 */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-orange-50 rounded-xl mb-6">
            {(["login", "register"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === m ? "bg-white text-orange-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
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
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="你的昵称"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "至少 6 位" : "输入密码"}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                />
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="再次输入密码"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 请稍候...</>
              ) : (
                mode === "login" ? "登录" : "注册并登录"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <Link to="/" className="hover:text-orange-600 transition-colors">← 返回首页</Link>
        </p>
      </div>
    </div>
  );
}
