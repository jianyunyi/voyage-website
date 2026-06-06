import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Preferences {
  destinations: string[];
  travelTypes: string[];
  foodSpiciness: string;
  foodFlavors: string[];
}

interface PreferencesContextType {
  preferences: Preferences;
  updatePreferences: (newPrefs: Partial<Preferences>) => void;
}

const defaultPreferences: Preferences = {
  destinations: [],
  travelTypes: [],
  foodSpiciness: '不限',
  foodFlavors: [],
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    const saved = localStorage.getItem('voyagex_preferences');
    return saved ? JSON.parse(saved) : defaultPreferences;
  });

  useEffect(() => {
    localStorage.setItem('voyagex_preferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = (newPrefs: Partial<Preferences>) => {
    setPreferences(prev => ({ ...prev, ...newPrefs }));
  };

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
