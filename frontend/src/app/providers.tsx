'use client';

import { AuthProvider } from '@/lib/auth';
import { FavoritesProvider } from '@/lib/favorites';
import { PreferencesProvider } from '@/lib/preferences';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <PreferencesProvider>
          {children}
        </PreferencesProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
