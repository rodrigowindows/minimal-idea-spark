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
    'dashboard.goodMorning': 'Bom dia',
    'dashboard.goodAfternoon': 'Boa tarde',
    'dashboard.goodEvening': 'Boa noite',
    'dashboard.nightOwlMode': 'Modo coruja',
    'dashboard.commander': 'comandante',
    'dashboard.level': 'Nível',
    'dashboard.dayStreak': 'dias de sequência',
    'dashboard.inProgress': 'em andamento',
    'dashboard.focus': 'foco',
    'dashboard.customizeWarRoom': 'Customizar War Room',
    'dashboard.warRoomRestoreDefault': 'Restaurar padrão',
    'common.done': 'Concluído',
  },
  en: {
    'sidebar.dashboard': 'Dashboard',
    'sidebar.profile': 'Profile',
    'dashboard.title': 'Main Dashboard',
    'dashboard.theOneThing': 'The One Thing',
    'dashboard.goodMorning': 'Good morning',
    'dashboard.goodAfternoon': 'Good afternoon',
    'dashboard.goodEvening': 'Good evening',
    'dashboard.nightOwlMode': 'Night owl mode',
    'dashboard.commander': 'commander',
    'dashboard.level': 'Level',
    'dashboard.dayStreak': 'day streak',
    'dashboard.inProgress': 'in progress',
    'dashboard.focus': 'focus',
    'dashboard.customizeWarRoom': 'Customize War Room',
    'dashboard.warRoomRestoreDefault': 'Restore default',
    'common.done': 'Done',
  },
  es: {
    'sidebar.dashboard': 'Panel',
    'sidebar.profile': 'Perfil',
    'dashboard.title': 'Panel Principal',
    'dashboard.theOneThing': 'La Única Cosa',
    'dashboard.goodMorning': 'Buenos días',
    'dashboard.goodAfternoon': 'Buenas tardes',
    'dashboard.goodEvening': 'Buenas noches',
    'dashboard.nightOwlMode': 'Modo noctámbulo',
    'dashboard.commander': 'comandante',
    'dashboard.level': 'Nivel',
    'dashboard.dayStreak': 'días de racha',
    'dashboard.inProgress': 'en curso',
    'dashboard.focus': 'enfoque',
    'dashboard.customizeWarRoom': 'Personalizar War Room',
    'dashboard.warRoomRestoreDefault': 'Restaurar predeterminado',
    'common.done': 'Hecho',
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
