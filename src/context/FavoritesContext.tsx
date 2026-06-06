import React, { createContext, useContext, useState, useEffect } from 'react';

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

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    const saved = localStorage.getItem('voyagex_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('voyagex_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (item: FavoriteItem) => {
    setFavorites(prev => {
      if (!prev.find(f => f.id === item.id)) {
        return [...prev, { ...item, addedAt: Date.now() }];
      }
      return prev;
    });
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
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
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite }}>
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
