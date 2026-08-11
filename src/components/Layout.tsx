import { Link, Outlet, useLocation } from "react-router-dom";
import { Map, Compass, ArrowLeftRight, Menu, X, Globe, BookOpen, User, Utensils, Sparkles, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.body.classList.toggle("dark", next);
    localStorage.setItem("voyagex_theme", next ? "dark" : "light");
  };

  // 初始化主题
  useState(() => {
    const saved = localStorage.getItem("voyagex_theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      setIsDark(true);
    }
  });

  const navItems = [
    { name: "探索", path: "/", icon: Globe },
    { name: "旅行攻略", path: "/guides", icon: BookOpen },
    { name: "地道美食", path: "/food", icon: Utensils },
    { name: "路线规划", path: "/planner", icon: Map },
    { name: "全网比价", path: "/compare", icon: ArrowLeftRight },
    { name: "AI 行程", path: "/itinerary", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-gray-200 dark:border-stone-800 shadow-sm shadow-gray-200/50 dark:shadow-stone-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <Compass className="h-8 w-8 text-orange-600" />
                <span className="font-serif font-bold text-xl tracking-tight text-gray-900 dark:text-stone-100">
                  Voyage<span className="text-orange-600">X</span>
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "inline-flex items-center gap-2 px-1 pt-1 border-b-2 text-sm font-medium transition-colors",
                      isActive
                        ? "border-orange-600 text-orange-600"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:text-stone-400 dark:hover:text-stone-100"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", isActive ? "text-orange-600" : "text-gray-400")} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Profile & Mobile menu button */}
            <div className="flex items-center gap-4">
              {/* 主题切换 */}
              <button
                onClick={toggleTheme}
                aria-label="切换深色/浅色模式"
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:text-stone-400 dark:hover:text-orange-400 dark:hover:bg-stone-800 transition-colors"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link 
                to="/profile" 
                className={cn(
                  "hidden md:flex items-center justify-center p-2 rounded-full transition-colors",
                  location.pathname === "/profile" 
                    ? "bg-orange-100 text-orange-600" 
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                )}
                title="个人中心"
              >
                {user ? (
                  <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center">
                    {user.nickname.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="w-5 h-5" />
                )}
              </Link>

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
                      "block px-4 py-2.5 text-base font-medium rounded-xl transition-colors",
                      isActive
                        ? "bg-orange-50 text-orange-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
              <Link
                to="/profile"
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "block px-4 py-2.5 text-base font-medium rounded-xl transition-colors",
                  location.pathname === "/profile"
                    ? "bg-orange-50 text-orange-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                )}
              >
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  个人中心
                </div>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Compass className="h-6 w-6 text-orange-500" />
              <span className="font-serif font-bold text-xl tracking-tight">
                Voyage<span className="text-orange-500">X</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm max-w-md">
              您的全能旅行伴侣。从灵感发现到路线规划，再到全网比价，我们为您提供一站式旅行服务。
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase mb-4">产品服务</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/guides" className="hover:text-white transition-colors">旅行攻略</Link></li>
              <li><Link to="/food" className="hover:text-white transition-colors">地道美食</Link></li>
              <li><Link to="/planner" className="hover:text-white transition-colors">路线规划</Link></li>
              <li><Link to="/compare" className="hover:text-white transition-colors">全网比价</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase mb-4">关于我们</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">关于 VoyageX</a></li>
              <li><a href="#" className="hover:text-white transition-colors">联系我们</a></li>
              <li><a href="#" className="hover:text-white transition-colors">隐私政策</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-gray-800 text-sm text-gray-500 text-center">
          &copy; {new Date().getFullYear()} VoyageX Travel. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
