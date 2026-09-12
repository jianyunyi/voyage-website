'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Globe, BookOpen, Utensils, Map, ArrowLeftRight,
  Compass, Menu, X, User, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const navItems = [
  { name: '探索', path: '/', icon: Globe },
  { name: '旅行攻略', path: '/guides', icon: BookOpen },
  { name: '地道美食', path: '/food', icon: Utensils },
  { name: '路线规划', path: '/planner', icon: Map },
  { name: '全网比价', path: '/compare', icon: ArrowLeftRight },
];

export default function NavLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = (path: string) =>
    pathname === path || (path !== '/' && pathname.startsWith(path));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-[#fcfbf9]/90 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <Compass className="h-8 w-8 text-orange-600 group-hover:rotate-45 transition-transform duration-500" />
              <span className="font-serif font-bold text-2xl tracking-tight text-gray-900">
                Voyage<span className="text-orange-600">X</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300',
                    isActive(item.path)
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                      : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                  )}
                >
                  <item.icon className={cn('w-4 h-4', isActive(item.path) ? 'text-white' : 'text-gray-400')} />
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Profile / Auth */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-1 focus:outline-none group"
                    title="个人中心"
                  >
                    <img
                      src={user?.avatar || 'https://ui-avatars.com/api/?name=VoyageX&background=random'}
                      alt={user?.name}
                      className="w-10 h-10 rounded-full border-2 border-white shadow-sm group-hover:border-orange-200 transition-colors"
                    />
                  </Link>
                  <button
                    onClick={() => { logout(); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="登出"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="hidden md:flex items-center justify-center px-5 py-2.5 rounded-full font-bold transition-all duration-300 bg-[#1a1918] text-white hover:bg-black shadow-md hover:shadow-lg"
                >
                  登录 / 注册
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
                    isActive(item.path)
                      ? 'bg-orange-50 border-orange-600 text-orange-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
                      pathname === '/profile'
                        ? 'bg-orange-50 border-orange-600 text-orange-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      个人中心
                    </div>
                  </Link>
                  <button
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-red-500"
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="h-5 w-5" />
                      退出登录
                    </div>
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setIsMenuOpen(false)}
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-orange-600 font-bold hover:bg-orange-50 hover:border-orange-600"
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
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
