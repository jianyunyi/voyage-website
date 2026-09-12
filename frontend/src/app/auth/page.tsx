'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Mail, Lock, User, Eye, EyeOff, Smartphone, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiPost } from '@/lib/api';
import type { AuthResponse, SmsRequestResponse, SmsVerifyResponse } from '@/lib/api';

type AuthMode = 'login' | 'register' | 'sms';

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // SMS state
  const [challengeId, setChallengeId] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [debugCode, setDebugCode] = useState('');

  const reset = () => {
    setError('');
    setSuccessMsg('');
    setChallengeId('');
    setSmsCode('');
    setDebugCode('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      const res = await apiPost<AuthResponse>('/api/auth/login', { email, password });
      if (res.success) {
        login(res.user);
        router.push('/');
      } else {
        setError(res.message);
      }
    } catch (e) {
      console.error('Login error:', e);
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost<AuthResponse>('/api/auth/register', { email, password, name });
      if (res.success) {
        login(res.user);
        router.push('/');
      } else {
        setError(res.message);
      }
    } catch (e) {
      console.error('Register error:', e);
      setError('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSmsRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      const res = await apiPost<SmsRequestResponse>('/api/auth/login/sms/request', { email, phone });
      if (res.success) {
        setChallengeId(res.challengeId!);
        setDebugCode(res.debugCode || '');
        setSuccessMsg('验证码已发送，请查收');
      } else {
        setError(res.message || '验证码发送失败');
      }
    } catch (e) {
      console.error('SMS request error:', e);
      setError('验证码发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSmsVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      const code = smsCode || debugCode;
      const res = await apiPost<SmsVerifyResponse>('/api/auth/login/sms/verify', { challengeId, code });
      if (res.success && res.user) {
        login(res.user);
        router.push('/');
      } else {
        setError(res.message || '验证码校验失败');
      }
    } catch (e) {
      console.error('SMS verify error:', e);
      setError('验证码校验失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Compass className="h-12 w-12 text-orange-600 mx-auto mb-3" />
          <h1 className="text-3xl font-serif font-bold text-gray-900">
            {mode === 'login' ? '欢迎回来' : mode === 'register' ? '创建账号' : '短信验证'}
          </h1>
          <p className="text-gray-500 mt-1">
            {mode === 'login' ? '登录继续你的旅程' : mode === 'register' ? '开启你的 VoyageX 之旅' : '使用手机验证码登录'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          {/* Mode Tabs */}
          <div className="flex mb-8 bg-gray-100 rounded-xl p-1">
            {(['login', 'register', 'sms'] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); reset(); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {m === 'login' ? '密码登录' : m === 'register' ? '注册' : '短信登录'}
              </button>
            ))}
          </div>

          {/* Error / Success */}
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{error}</div>}
          {successMsg && <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-600 text-sm rounded-xl">{successMsg}</div>}

          {/* SMS Step 1: Request */}
          {mode === 'sms' && !challengeId && (
            <form onSubmit={handleSmsRequest} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">手机号（含国际区号）</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="+8613800138000"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-[#1a1918] text-white rounded-xl font-bold hover:bg-black transition-colors disabled:bg-gray-200 disabled:text-gray-400">
                {loading ? '发送中...' : '发送验证码'}
              </button>
            </form>
          )}

          {/* SMS Step 2: Verify */}
          {mode === 'sms' && challengeId && (
            <form onSubmit={handleSmsVerify} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">验证码</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" required maxLength={6} value={smsCode} onChange={(e) => setSmsCode(e.target.value)}
                    placeholder="输入 6 位验证码"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all text-center text-2xl tracking-[0.5em]" />
                </div>
              </div>
              {debugCode && (
                <div className="p-3 bg-gray-50 border border-gray-200 text-gray-500 text-sm rounded-xl text-center">
                  调试模式验证码: <span className="font-mono font-bold text-orange-600 text-lg tracking-widest">{debugCode}</span>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-[#1a1918] text-white rounded-xl font-bold hover:bg-black transition-colors disabled:bg-gray-200 disabled:text-gray-400">
                {loading ? '验证中...' : '验证并登录'}
              </button>
            </form>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-[#1a1918] text-white rounded-xl font-bold hover:bg-black transition-colors disabled:bg-gray-200 disabled:text-gray-400">
                {loading ? '登录中...' : '登录'}
              </button>
              <p className="text-center text-xs text-gray-400">
                演示账号: demo@voyagex.com / 123456
              </p>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">昵称</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="你的昵称"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少6位，包含字母和数字"
                    className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-[#1a1918] text-white rounded-xl font-bold hover:bg-black transition-colors disabled:bg-gray-200 disabled:text-gray-400">
                {loading ? '注册中...' : '创建账号'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
