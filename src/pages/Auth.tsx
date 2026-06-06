import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser } from '../lib/authService';
import {
  type AuthField,
  type AuthFieldErrors,
  hasFieldErrors,
  validateLoginForm,
  validateRegisterForm,
} from '../lib/authValidation';

const fieldClass = (hasError: boolean) =>
  `block w-full pl-11 pr-4 py-3 bg-white border rounded-2xl text-sm focus:ring-4 transition-all outline-none ${
    hasError
      ? 'border-red-300 focus:ring-red-50 focus:border-red-400'
      : 'border-gray-200 focus:ring-orange-50 focus:border-orange-500'
  }`;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 ml-1 text-xs text-red-500 font-medium">{message}</p>;
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const from = location.state?.from?.pathname || '/profile';

  const clearFieldError = (field: AuthField) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const resetFormState = () => {
    setError('');
    setFieldErrors({});
    setConfirmPassword('');
  };

  const switchMode = () => {
    setIsLogin((prev) => !prev);
    resetFormState();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const formData = { email, password, name, confirmPassword };
    const errors = isLogin ? validateLoginForm(formData) : validateRegisterForm(formData);

    if (hasFieldErrors(errors)) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (isLogin) {
        const result = await loginUser(email, password);
        if (result.success === false) {
          setError(result.message);
          return;
        }
        login(result.user);
      } else {
        const result = await registerUser(email, password, name);
        if (result.success === false) {
          setError(result.message);
          return;
        }
        register(result.user);
      }

      navigate(from, { replace: true });
    } catch {
      setError('发生未知错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex grid md:grid-cols-2 bg-[#fcfbf9]">
      <div className="hidden md:flex relative overflow-hidden bg-gray-900 border-r border-gray-200/50">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
            alt="Travel inspiration"
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
        </div>
        <div className="relative z-10 flex flex-col justify-end p-12 text-white h-full">
          <Compass className="w-12 h-12 mb-6 text-orange-400" />
          <h1 className="text-4xl lg:text-5xl font-serif font-bold mb-4 leading-tight">
            开启你的<br />非凡旅程
          </h1>
          <p className="text-gray-300 text-lg max-w-md">
            加入 VoyageX，与全球旅行者分享独特体验，规划属于你的完美假日。
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 md:px-12 lg:px-24">
        <div className="max-w-md w-full mx-auto">
          <div className="text-center md:text-left mb-10">
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-3">
              {isLogin ? '欢迎回来' : '创建账号'}
            </h2>
            <p className="text-gray-500">
              {isLogin
                ? '登录以继续探索更多深度旅行内容'
                : '注册 VoyageX，开启您的探索之旅'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">昵称</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className={fieldClass(!!fieldErrors.name)}
                      placeholder="如何称呼您？"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearFieldError('name');
                      }}
                      maxLength={20}
                    />
                  </div>
                  <FieldError message={fieldErrors.name} />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">邮箱</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  className={fieldClass(!!fieldErrors.email)}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError('email');
                  }}
                  autoComplete="email"
                />
              </div>
              <FieldError message={fieldErrors.email} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-sm font-medium text-gray-700">密码</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setError('忘记密码功能即将上线，请联系客服或使用演示账号登录')}
                    className="text-xs font-medium text-orange-600 hover:text-orange-500 transition-colors"
                  >
                    忘记密码？
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  className={fieldClass(!!fieldErrors.password)}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError('password');
                  }}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  maxLength={32}
                />
              </div>
              <FieldError message={fieldErrors.password} />
              {!isLogin && !fieldErrors.password && (
                <p className="mt-1.5 ml-1 text-xs text-gray-400">
                  6-32 位，需同时包含字母和数字
                </p>
              )}
            </div>

            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">确认密码</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      className={fieldClass(!!fieldErrors.confirmPassword)}
                      placeholder="再次输入密码"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearFieldError('confirmPassword');
                      }}
                      autoComplete="new-password"
                      maxLength={32}
                    />
                  </div>
                  <FieldError message={fieldErrors.confirmPassword} />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-red-500 text-sm pl-1 font-medium bg-red-50 p-3 rounded-xl border border-red-100"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative flex items-center justify-center py-3.5 px-4 bg-[#1a1918] text-white rounded-2xl font-bold hover:bg-black hover:shadow-lg hover:shadow-black/10 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed group mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? '登录' : '立即注册'}</span>
                  <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 absolute right-6" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center sm:text-left">
            <p className="text-sm text-gray-600">
              {isLogin ? '还没有账号？' : '已有账号？'}
              <button
                type="button"
                onClick={switchMode}
                className="ml-2 font-bold text-gray-900 hover:text-orange-600 transition-colors"
              >
                {isLogin ? '立即注册' : '返回登录'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
