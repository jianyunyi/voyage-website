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
  updateUser: (u: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LS_USER = "voyagex_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 更新用户并同步 localStorage
  const applyUser = (u: AuthUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(LS_USER, JSON.stringify(u));
  };

  // 启动时恢复会话
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      const savedUser = localStorage.getItem(LS_USER);
      if (!savedUser) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        applyUser(JSON.parse(savedUser) as AuthUser);
      } catch {
        localStorage.removeItem(LS_USER);
      }
      try {
        const remoteUser = await fetchMe().catch(async () => {
          await refreshRemote();
          return fetchMe();
        });
        if (!cancelled) applyUser(remoteUser);
      } catch {
        if (!cancelled) {
          localStorage.removeItem(LS_USER);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    restore();
    return () => { cancelled = true; };
  }, []);

  const persist = (u: AuthUser) => {
    localStorage.setItem(LS_USER, JSON.stringify(u));
    setUser(u);
  };

  const login = async (nickname: string, password: string) => {
    const result = await loginRemote(nickname, password);
    persist(result.user);
  };

  const register = async (nickname: string, password: string) => {
    const result = await registerRemote(nickname, password);
    persist(result.user);
  };

  const logout = async () => {
    await logoutRemote().catch(() => undefined);
    localStorage.removeItem(LS_USER);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      accessToken: user ? "cookie-session" : null,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateUser: applyUser,
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
