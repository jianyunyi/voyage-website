import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, Compass, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActionButton } from '../components/ActionButton';
import { loginUser, registerUser, requestSmsLoginCode, verifySmsLoginCode } from '../lib/authService';
import {
  type AuthField,
  type AuthFieldErrors,
  hasFieldErrors,
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
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsChallengeId, setSmsChallengeId] = useState('');
  const [smsDebugCode, setSmsDebugCode] = useState('');
  const [loginMode, setLoginMode] = useState<'sms' | 'password'>('sms');

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
    setSmsCode('');
    setSmsChallengeId('');
    setSmsDebugCode('');
  };

  const switchMode = () => {
    setIsLogin((prev) => !prev);
    resetFormState();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (isLogin) {
        if (loginMode === 'password') {
          if (!email.trim() || !password) {
            setError('请输入管理员邮箱和密码');
            return;
          }

          const result = await loginUser(email, password);
          if (result.success === false) {
            setError(result.message);
            return;
          }
          login(result.user);
          navigate(from, { replace: true });
          return;
        }

        if (!email.trim() || !phone.trim()) {
          setError('请输入邮箱和手机号');
          return;
        }

        if (!smsChallengeId) {
          const result = await requestSmsLoginCode(email, phone);
          if (result.success === false) {
            setError(result.message);
            return;
          }
          setSmsChallengeId(result.challengeId);
          setSmsDebugCode(result.debugCode || '');
          setError(result.debugCode ? `验证码已发送，本地开发验证码：${result.debugCode}` : '验证码已发送');
          return;
        }

        if (!/^\d{6}$/.test(smsCode.trim())) {
          setError('请输入 6 位短信验证码');
          return;
        }

        const result = await verifySmsLoginCode(smsChallengeId, smsCode);
        if (result.success === false) {
          setError(result.message);
          return;
        }
        login(result.user);
      } else {
        const formData = { email, password, name, confirmPassword };
        const errors = validateRegisterForm(formData);

        if (hasFieldErrors(errors)) {
          setFieldErrors(errors);
          return;
        }

        setFieldErrors({});
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
    <div className="voyage-content-page min-h-[calc(100vh-4rem)] flex grid md:grid-cols-2">
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

            {isLogin && (
              <>
                <div className="flex rounded-2xl bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('sms');
                      setError('');
                    }}
                    className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${
                      loginMode === 'sms' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    短信登录
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('password');
                      setError('');
                    }}
                    className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${
                      loginMode === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    管理员登录
                  </button>
                </div>

                {loginMode === 'password' ? (
                  <div>
                    <div className="flex justify-between items-center mb-1.5 ml-1">
                      <label className="block text-sm font-medium text-gray-700">管理员密码</label>
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
                        autoComplete="current-password"
                        maxLength={32}
                      />
                    </div>
                  </div>
                ) : (
                <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">手机号</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Smartphone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      className={fieldClass(false)}
                      placeholder="+8613800138000"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setSmsChallengeId('');
                        setSmsCode('');
                        setSmsDebugCode('');
                      }}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {smsChallengeId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">短信验证码</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={fieldClass(false)}
                        placeholder={smsDebugCode || '123456'}
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value)}
                        maxLength={6}
                      />
                    </div>
                  </div>
                )}
                </>
                )}
              </>
            )}

            {!isLogin && (
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-sm font-medium text-gray-700">密码</label>
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
            )}

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

            <ActionButton
              action="sign-in"
              pending={loading}
              type="submit"
              className="w-full relative flex items-center justify-center py-3.5 px-4 bg-[#1a1918] text-white rounded-2xl font-bold hover:bg-black hover:shadow-lg hover:shadow-black/10 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed group mt-2"
            >
            </ActionButton>
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
