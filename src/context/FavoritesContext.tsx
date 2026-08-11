import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchFavorites, addFavoriteRemote, removeFavoriteRemote, type FavoriteItem } from '../lib/api';
import { useAuth } from './AuthContext';

export type FavoriteType = 'guide' | 'food' | 'hotel' | 'route';

export type { FavoriteItem } from "../lib/api";

interface FavoritesContextType {
  favorites: FavoriteItem[];
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: FavoriteItem) => void;
  syncStatus: "idle" | "syncing" | "synced" | "error";
  syncFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    const saved = localStorage.getItem('voyagex_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");

  // 本地缓存
  useEffect(() => {
    localStorage.setItem('voyagex_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // 启动时从 KV 同步（远端优先，若远端为空则保持本地）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setSyncStatus("syncing");
        const remote = await fetchFavorites(accessToken);
        if (cancelled) return;
        if (remote.length > 0) {
          setFavorites(remote);
        }
        setSyncStatus("synced");
      } catch {
        if (!cancelled) setSyncStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken]);

  const syncFavorites = useCallback(async () => {
    setSyncStatus("syncing");
    try {
      const remote = await fetchFavorites(accessToken);
      setFavorites(remote);
      setSyncStatus("synced");
    } catch {
      setSyncStatus("error");
    }
  }, []);

  const addFavorite = (item: FavoriteItem) => {
    setFavorites(prev => {
      if (prev.find(f => f.id === item.id)) return prev;
      const next = [...prev, { ...item, addedAt: Date.now() }];
      // 异步同步到 KV（失败静默，不阻塞 UI）
      addFavoriteRemote(next[next.length - 1]).catch(() => setSyncStatus("error"));
      return next;
    });
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => {
      const next = prev.filter(f => f.id !== id);
      // 异步同步到 KV
      removeFavoriteRemote(id, accessToken).catch(() => setSyncStatus("error"));
      return next;
    });
  };

  const isFavorite = (id: string) => {
    return favorites.some(f => f.id === id);
  };

  const toggleFavorite = (item: FavoriteItem) => {
    if (isFavorite(item.id)) {
      removeFavorite(item.id);
    } else {
      addFavorite(item);
    }
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite, syncStatus, syncFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
