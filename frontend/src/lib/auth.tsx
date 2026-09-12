'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { PublicUser } from './api';

export interface User extends PublicUser {}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('voyage_user');
      if (stored) setUser(JSON.parse(stored));
    } catch { /* JSON.parse failure — ignore */ }
    setLoading(false);
  }, []);

  const persist = useCallback((u: User | null) => {
    if (u) localStorage.setItem('voyage_user', JSON.stringify(u));
    else localStorage.removeItem('voyage_user');
    setUser(u);
  }, []);

  const login = useCallback((userData: User) => persist(userData), [persist]);
  const logout = useCallback(() => persist(null), [persist]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...updates };
      localStorage.setItem('voyage_user', JSON.stringify(next));
      return next;
    });
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
