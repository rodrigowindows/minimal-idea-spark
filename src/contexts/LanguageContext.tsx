import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'pt-BR' | 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  'pt-BR': {
    'sidebar.dashboard': 'Painel',
    'sidebar.profile': 'Perfil',
    'dashboard.title': 'Painel Principal',
    'dashboard.theOneThing': 'A Única Coisa',
  },
  en: {
    'sidebar.dashboard': 'Dashboard',
    'sidebar.profile': 'Profile',
    'dashboard.title': 'Main Dashboard',
    'dashboard.theOneThing': 'The One Thing',
  },
  es: {
    'sidebar.dashboard': 'Panel',
    'sidebar.profile': 'Perfil',
    'dashboard.title': 'Panel Principal',
    'dashboard.theOneThing': 'La Única Cosa',
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('pt-BR');

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => {
      if (prev === 'pt-BR') return 'en';
      if (prev === 'en') return 'es';
      return 'pt-BR';
    });
  };

  const t = (key: string) => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

/** Alias for useTranslation — used by Settings and other pages */
export const useLanguage = useTranslation;
