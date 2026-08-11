import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { registerRemote, loginRemote, refreshRemote, logoutRemote, fetchMe, type AuthUser } from "../lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (nickname: string, password: string) => Promise<void>;
  register: (nickname: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LS_ACCESS = "voyagex_access_token";
const LS_REFRESH = "voyagex_refresh_token";
const LS_USER = "voyagex_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 启动时恢复会话
  useEffect(() => {
    const token = localStorage.getItem(LS_ACCESS);
    const savedUser = localStorage.getItem(LS_USER);
    if (token && savedUser) {
      setAccessToken(token);
      setUser(JSON.parse(savedUser) as AuthUser);
      // 后台验证 access token，失效则尝试 refresh
      fetchMe(token).catch(() => {
        const refresh = localStorage.getItem(LS_REFRESH);
        if (refresh) {
          refreshRemote(refresh)
            .then(tokens => {
              localStorage.setItem(LS_ACCESS, tokens.accessToken);
              localStorage.setItem(LS_REFRESH, tokens.refreshToken);
              setAccessToken(tokens.accessToken);
            })
            .catch(() => {
              localStorage.removeItem(LS_ACCESS);
              localStorage.removeItem(LS_REFRESH);
              localStorage.removeItem(LS_USER);
              setAccessToken(null);
              setUser(null);
            });
        }
      });
    }
    setLoading(false);
  }, []);

  const persist = (tokens: { accessToken: string; refreshToken: string }, u: AuthUser) => {
    localStorage.setItem(LS_ACCESS, tokens.accessToken);
    localStorage.setItem(LS_REFRESH, tokens.refreshToken);
    localStorage.setItem(LS_USER, JSON.stringify(u));
    setAccessToken(tokens.accessToken);
    setUser(u);
  };

  const login = async (nickname: string, password: string) => {
    const result = await loginRemote(nickname, password);
    persist(result, result.user);
  };

  const register = async (nickname: string, password: string) => {
    const result = await registerRemote(nickname, password);
    persist(result, result.user);
  };

  const logout = async () => {
    const refresh = localStorage.getItem(LS_REFRESH);
    if (refresh) {
      await logoutRemote(refresh).catch(() => undefined);
    }
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    localStorage.removeItem(LS_USER);
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      accessToken,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
