import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'pt' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  pt: {
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
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('pt');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'pt' ? 'en' : 'pt'));
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
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
