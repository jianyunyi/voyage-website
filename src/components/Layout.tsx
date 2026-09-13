import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Map, Compass, ArrowLeftRight, Menu, X, Globe, BookOpen, User, Utensils, LogOut } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ImmersiveBackdrop } from "./ImmersiveBackdrop";

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isPlannerWorkspace = location.pathname === "/planner";
  const shouldReduceMotion = useReducedMotion();
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = [
    { name: "探索", path: "/", icon: Globe },
    { name: "旅行攻略", path: "/guides", icon: BookOpen },
    { name: "地道美食", path: "/food", icon: Utensils },
    { name: "路线规划", path: "/planner", icon: Map },
    { name: "全网比价", path: "/compare", icon: ArrowLeftRight },
  ];

  return (
    <div className={cn("voyage-shell min-h-screen flex flex-col font-sans", isPlannerWorkspace && "voyage-shell--planner-workspace")}>
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={location.pathname}
          aria-hidden="true"
          className="voyage-backdrop-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.12, ease: 'easeOut' }}
        >
          <ImmersiveBackdrop pathname={location.pathname} />
        </motion.div>
      </AnimatePresence>
      {!isPlannerWorkspace && <header className="sticky top-0 z-50 bg-[#fcfbf9]/90 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <Compass className="h-8 w-8 text-orange-600 group-hover:rotate-45 transition-transform duration-500" />
                <span className="font-serif font-bold text-2xl tracking-tight text-gray-900">
                  Voyage<span className="text-orange-600">X</span>
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                      isActive
                        ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                        : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-gray-400 group-hover:text-orange-600")} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Profile & Mobile menu button */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-3">
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 px-1 focus:outline-none group"
                    title="个人中心"
                  >
                    <img 
                      src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} 
                      alt={user?.name} 
                      className="w-10 h-10 rounded-full border-2 border-white shadow-sm group-hover:border-orange-200 transition-colors"
                    />
                  </Link>
                  <button 
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="登出"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="hidden md:flex items-center justify-center px-5 py-2.5 rounded-full font-bold transition-all duration-300 bg-[#1a1918] text-white hover:bg-black shadow-md hover:shadow-lg"
                >
                  登录 / 注册
                </Link>
              )}

              <div className="flex items-center md:hidden">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
                >
                  {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "block pl-3 pr-4 py-2 border-l-4 text-base font-medium",
                      isActive
                        ? "bg-orange-50 border-orange-600 text-orange-700"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "block pl-3 pr-4 py-2 border-l-4 text-base font-medium",
                      location.pathname === "/profile"
                        ? "bg-orange-50 border-orange-600 text-orange-700"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      个人中心 ({user?.name})
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="w-full text-left block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="h-5 w-5" />
                      登出
                    </div>
                  </button>
                </>
              ) : (
                 <Link
                  to="/auth"
                  onClick={() => setIsMenuOpen(false)}
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-bold text-gray-900 hover:bg-gray-50 hover:border-gray-300"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    登录 / 注册
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>}

      <main className="relative z-10 flex-grow">
        <Outlet />
      </main>

      {!isPlannerWorkspace && <footer className="relative z-10 bg-[#1a1918] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6 group">
              <Compass className="h-8 w-8 text-orange-500 group-hover:rotate-45 transition-transform duration-500" />
              <span className="font-serif font-bold text-2xl tracking-tight">
                Voyage<span className="text-orange-500">X</span>
              </span>
            </Link>
            <p className="text-gray-400 text-base leading-relaxed max-w-md">
              您的全能旅行伴侣。从灵感发现到路线规划，再到全网比价，我们为您提供一站式旅行服务。
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-6">产品服务</h3>
            <ul className="space-y-4 text-sm text-gray-300">
              <li><Link to="/guides" className="hover:text-orange-400 transition-colors">旅行攻略</Link></li>
              <li><Link to="/food" className="hover:text-orange-400 transition-colors">地道美食</Link></li>
              <li><Link to="/planner" className="hover:text-orange-400 transition-colors">路线规划</Link></li>
              <li><Link to="/compare" className="hover:text-orange-400 transition-colors">全网比价</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-6">关于我们</h3>
            <ul className="space-y-4 text-sm text-gray-300">
              <li><a href="#" className="hover:text-orange-400 transition-colors">关于 VoyageX</a></li>
              <li><a href="#" className="hover:text-orange-400 transition-colors">联系我们</a></li>
              <li><a href="#" className="hover:text-orange-400 transition-colors">隐私政策</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-white/10 text-sm text-gray-500 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>&copy; {new Date().getFullYear()} VoyageX Travel. All rights reserved.</div>
          <div className="flex gap-6 text-xs uppercase tracking-widest">
            <a href="#" className="hover:text-gray-300 transition-colors">Twitter</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Instagram</a>
            <a href="#" className="hover:text-gray-300 transition-colors">WeChat</a>
          </div>
        </div>
      </footer>}
    </div>
  );
}
