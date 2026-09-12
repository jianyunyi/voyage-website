'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiPost } from './api';
import type { ToggleFavoriteResponse } from './api';

export type FavoriteType = 'guide' | 'food' | 'hotel' | 'route';

export interface FavoriteItem {
  id: string;
  type: FavoriteType;
  title: string;
  subtitle?: string;
  image?: string;
  rating?: number;
  price?: string;
  addedAt?: number;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: FavoriteItem) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

function toServerItemId(item: FavoriteItem): string {
  if (item.type === 'food' && item.id.startsWith('food-')) return item.id.slice(5);
  return item.id;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem('voyagex_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('voyagex_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const syncFavorite = useCallback(async (item: FavoriteItem, favorited: boolean) => {
    try {
      const stored = localStorage.getItem('voyage_user');
      if (!stored) return;
      const { id: userId } = JSON.parse(stored) as { id?: string };
      if (userId && (item.type === 'guide' || item.type === 'food')) {
        await apiPost<ToggleFavoriteResponse>('/api/favorites/toggle', {
          userId,
          itemId: toServerItemId(item),
          itemType: item.type,
          favorited,
        });
      }
    } catch { /* ignore sync errors */ }
  }, []);

  const addFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) => {
      if (prev.find((f) => f.id === item.id)) return prev;
      syncFavorite(item, true);
      return [...prev, { ...item, addedAt: Date.now() }];
    });
  }, [syncFavorite]);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed) syncFavorite(removed, false);
      return prev.filter((f) => f.id !== id);
    });
  }, [syncFavorite]);

  const isFavorite = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites]);

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    if (isFavorite(item.id)) removeFavorite(item.id);
    else addFavorite(item);
  }, [isFavorite, removeFavorite, addFavorite]);

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
