
import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import type { Language } from '../types';

export interface Settings {
  apiKey: string;
  theme: 'light' | 'dark' | 'system';
  language: Language;
  font: 'sans' | 'serif' | 'mono' | 'kai' | 'cursive';
  // Admin-specific settings
  allowPublicApiKey: boolean;
  publicApiKey: string;
  paypalClientId: string; // New field for PayPal Integration
  autoUpdateCacheOnLogin: boolean;
}

const defaultSettings: Settings = {
  apiKey: '',
  theme: 'system',
  language: 'zh-TW',
  font: 'sans',
  allowPublicApiKey: false,
  publicApiKey: '',
  paypalClientId: '', // Default empty
  autoUpdateCacheOnLogin: true,
};

const defaultTranslations: Record<Language, any> = {
    'zh-TW': {},
    'zh-CN': {},
    'en': {},
    'ja': {},
};


interface SettingsContextType {
  settings: Settings;
  isSettingsModalOpen: boolean;
  setSettingsModalOpen: (isOpen: boolean) => void;
  saveSettings: (newSettings: Partial<Settings>) => void;
  getApiKey: () => string | null;
  t: (key: string, replacements?: Record<string, string>) => string;
}

export const SettingsContext = createContext<SettingsContextType>(null!);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  const [settings, setSettings] = useState<Settings>(() => {
    // Initialize state from localStorage immediately for language
    const lastLanguage = localStorage.getItem('app_language') as Language;
    const validLanguages: Language[] = ['zh-TW', 'en', 'zh-CN', 'ja'];
    return {
      ...defaultSettings,
      language: validLanguages.includes(lastLanguage) ? lastLanguage : defaultSettings.language,
    };
  });

  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [translations, setTranslations] = useState(defaultTranslations);

  // Effect to load translations dynamically using fetch
  useEffect(() => {
    const fetchTranslations = async () => {
        try {
            const [zhTWRes, zhCNRes, enRes, jaRes] = await Promise.all([
                fetch('./locales/zh-TW.json'),
                fetch('./locales/zh-CN.json'),
                fetch('./locales/en.json'),
                fetch('./locales/ja.json'),
            ]);
            
            if (!zhTWRes.ok || !zhCNRes.ok || !enRes.ok || !jaRes.ok) {
                throw new Error('One or more translation files failed to load.');
            }

            const loadedTranslations = {
                'zh-TW': await zhTWRes.json(),
                'zh-CN': await zhCNRes.json(),
                'en': await enRes.json(),
                'ja': await jaRes.json(),
            };
            setTranslations(loadedTranslations);
        } catch (error) {
            console.error("Failed to fetch translation files:", error);
            // In case of error, the app will fallback to using keys.
        }
    };
    fetchTranslations();
  }, []); // Run only once on mount

  const getStorageKey = useCallback(() => {
    if (!currentUser) return null;
    return `user_settings_${currentUser.email}`;
  }, [currentUser]);

  useEffect(() => {
    const storageKey = getStorageKey();
    if (storageKey) { // User is logged in
      try {
        const storedSettings = localStorage.getItem(storageKey);
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          // Ensure language setting is valid, otherwise fallback to default
          if (!translations.hasOwnProperty(parsedSettings.language)) {
              parsedSettings.language = defaultSettings.language;
          }
          setSettings(prev => ({...prev, ...parsedSettings})); // Merge to preserve defaults for new settings
           // Also sync global language key on login
          if (parsedSettings.language) {
            localStorage.setItem('app_language', parsedSettings.language);
          }
        } else {
          // New logged-in user, save current settings (which include global language) for them
          localStorage.setItem(storageKey, JSON.stringify(settings));
        }
      } catch (error) {
        console.error("Failed to load settings from localStorage", error);
      }
    } else {
      // Logged out, reset user-specific settings to default but keep the last used language
      const lastLanguage = localStorage.getItem('app_language') as Language || defaultSettings.language;
      setSettings(prev => ({
        ...defaultSettings,
        language: lastLanguage,
        theme: prev.theme, // Persist theme across logout
        font: prev.font,   // Persist font across logout
      }));
    }
  }, [currentUser, getStorageKey, translations]);
  
  // Effect to apply theme class to the document based on 'light', 'dark', or 'system'
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
      if (settings.theme === 'dark' || (settings.theme === 'system' && mediaQuery.matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    updateTheme();

    // Listen for changes in OS theme preference
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [settings.theme]);

  // Effect to apply font class to the document
  useEffect(() => {
    const body = window.document.body;
    body.classList.remove('font-sans', 'font-serif', 'font-mono', 'font-kai', 'font-cursive');
    
    switch (settings.font) {
      case 'serif':
        body.classList.add('font-serif');
        break;
      case 'mono':
        body.classList.add('font-mono');
        break;
      case 'kai':
        body.classList.add('font-kai');
        break;
      case 'cursive':
        body.classList.add('font-cursive');
        break;
      case 'sans':
      default:
        body.classList.add('font-sans');
        break;
    }
  }, [settings.font]);

  const saveSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => {
        const updatedSettings = { ...prev, ...newSettings };
        
        // Persist language globally so it persists on logout
        if (updatedSettings.language) {
            localStorage.setItem('app_language', updatedSettings.language);
        }

        // Persist all settings for the logged-in user
        const storageKey = getStorageKey();
        if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(updatedSettings));
        }

        return updatedSettings;
    });
  };

  const getApiKey = (): string | null => {
    // If Admin has a personal key set, use it. 
    // Otherwise, if Admin has set a global key (even if allowPublic is false), use that for Admin convenience.
    if (currentUser?.role === '管理員') {
        if (settings.apiKey) return settings.apiKey;
        if (settings.publicApiKey) return settings.publicApiKey;
        return null;
    }
    
    // For regular users:
    // 1. Use personal key if set.
    // 2. Fallback to public key ONLY if allowed.
    if (settings.apiKey) {
        return settings.apiKey;
    }
    if (settings.allowPublicApiKey && settings.publicApiKey) {
      return settings.publicApiKey;
    }
    return null;
  };

  const t = useCallback((key: string, replacements?: Record<string, string>): string => {
    const langTranslations = translations[settings.language] || {};
    let translation = langTranslations[key] || key;
    
    if (replacements) {
        Object.keys(replacements).forEach(rKey => {
            translation = translation.replace(new RegExp(`{{${rKey}}}`, 'g'), replacements[rKey]);
        });
    }
    return translation;
  }, [settings.language, translations]);


  return (
    <SettingsContext.Provider value={{ settings, isSettingsModalOpen, setSettingsModalOpen, saveSettings, getApiKey, t }}>
      {children}
    </SettingsContext.Provider>
  );
};
