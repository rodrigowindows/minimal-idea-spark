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
    'dashboard.customizeDesc': 'Arraste para reordenar. Alterne a visibilidade e escolha o tamanho dos widgets.',
    'dashboard.warRoomRestoreDefault': 'Restaurar padrão',
    'common.done': 'Concluído',
    'nav.dashboard': 'Painel',
    'nav.consultant': 'Consultor',
    'nav.opportunities': 'Oportunidades',
    'nav.journal': 'Diário',
    'nav.habits': 'Hábitos',
    'nav.goals': 'Metas',
    'nav.calendar': 'Calendário',
    'nav.priorities': 'Prioridades',
    'nav.analytics': 'Analíticos',
    'nav.weeklyReview': 'Revisão Semanal',
    'nav.notifications': 'Notificações',
    'nav.contentGenerator': 'Gerador de Conteúdo',
    'nav.automation': 'Automação',
    'nav.templates': 'Templates',
    'nav.images': 'Imagens',
    'nav.versionHistory': 'Histórico',
    'nav.workspace': 'Espaço de Trabalho',
    'nav.import': 'Importar',
    'nav.reports': 'Relatórios',
    'nav.integrations': 'Integrações',
    'nav.help': 'Ajuda',
    'nav.settings': 'Configurações',
    'nav.deepWork': 'Foco Profundo',
    'nav.collapse': 'Recolher',
    'nav.expand': 'Expandir',
    'nav.home': 'Início',
    'nav.tasks': 'Tarefas',
    'nav.capture': 'Capturar',
    'nav.advisor': 'Consultor',
    'nav.stats': 'Estatísticas',
    'nav.sectionPrincipal': 'Principal',
    'nav.sectionProdutividade': 'Produtividade',
    'nav.sectionFerramentas': 'Ferramentas',
    'nav.sectionConfig': 'Configuração',
    'nav.sectionRecent': 'Recentes',
    'nav.bottomNavigation': 'Navegação inferior',
    'common.switchLanguage': 'Trocar idioma',
    'common.back': 'Voltar',
    'layout.mobileHeader': 'Cabeçalho',
    'layout.openMenu': 'Abrir menu',
    'layout.search': 'Buscar',
    'layout.navigation': 'Navegação',
    'layout.mainContent': 'Conteúdo principal',
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
    'dashboard.customizeDesc': 'Drag to reorder. Toggle visibility and choose widget size.',
    'dashboard.warRoomRestoreDefault': 'Restore default',
    'common.done': 'Done',
    'nav.dashboard': 'Dashboard',
    'nav.consultant': 'Consultant',
    'nav.opportunities': 'Opportunities',
    'nav.journal': 'Journal',
    'nav.habits': 'Habits',
    'nav.goals': 'Goals',
    'nav.calendar': 'Calendar',
    'nav.priorities': 'Priorities',
    'nav.analytics': 'Analytics',
    'nav.weeklyReview': 'Weekly Review',
    'nav.notifications': 'Notifications',
    'nav.contentGenerator': 'Content Generator',
    'nav.automation': 'Automation',
    'nav.templates': 'Templates',
    'nav.images': 'Images',
    'nav.versionHistory': 'Version History',
    'nav.workspace': 'Workspace',
    'nav.import': 'Import',
    'nav.reports': 'Reports',
    'nav.integrations': 'Integrations',
    'nav.help': 'Help',
    'nav.settings': 'Settings',
    'nav.deepWork': 'Deep Work',
    'nav.collapse': 'Collapse',
    'nav.expand': 'Expand',
    'nav.home': 'Home',
    'nav.tasks': 'Tasks',
    'nav.capture': 'Capture',
    'nav.advisor': 'Advisor',
    'nav.stats': 'Stats',
    'nav.sectionPrincipal': 'Main',
    'nav.sectionProdutividade': 'Productivity',
    'nav.sectionFerramentas': 'Tools',
    'nav.sectionConfig': 'Settings',
    'nav.sectionRecent': 'Recent',
    'nav.bottomNavigation': 'Bottom navigation',
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
    'dashboard.customizeDesc': 'Arrastra para reordenar. Alterna la visibilidad y elige el tamaño de los widgets.',
    'dashboard.warRoomRestoreDefault': 'Restaurar predeterminado',
    'common.done': 'Hecho',
    'nav.dashboard': 'Panel',
    'nav.consultant': 'Consultor',
    'nav.opportunities': 'Oportunidades',
    'nav.journal': 'Diario',
    'nav.habits': 'Hábitos',
    'nav.goals': 'Metas',
    'nav.calendar': 'Calendario',
    'nav.priorities': 'Prioridades',
    'nav.analytics': 'Analíticas',
    'nav.weeklyReview': 'Revisión Semanal',
    'nav.notifications': 'Notificaciones',
    'nav.contentGenerator': 'Generador de Contenido',
    'nav.automation': 'Automatización',
    'nav.templates': 'Plantillas',
    'nav.images': 'Imágenes',
    'nav.versionHistory': 'Historial',
    'nav.workspace': 'Espacio de Trabajo',
    'nav.import': 'Importar',
    'nav.reports': 'Informes',
    'nav.integrations': 'Integraciones',
    'nav.help': 'Ayuda',
    'nav.settings': 'Configuración',
    'nav.deepWork': 'Trabajo Profundo',
    'nav.collapse': 'Colapsar',
    'nav.expand': 'Expandir',
    'nav.home': 'Inicio',
    'nav.tasks': 'Tareas',
    'nav.capture': 'Capturar',
    'nav.advisor': 'Asesor',
    'nav.stats': 'Estadísticas',
    'nav.sectionPrincipal': 'Principal',
    'nav.sectionProdutividade': 'Productividad',
    'nav.sectionFerramentas': 'Herramientas',
    'nav.sectionConfig': 'Configuración',
    'nav.sectionRecent': 'Recientes',
    'nav.bottomNavigation': 'Navegación inferior',
    'common.switchLanguage': 'Cambiar idioma',
    'common.back': 'Volver',
    'layout.mobileHeader': 'Encabezado',
    'layout.openMenu': 'Abrir menú',
    'layout.search': 'Buscar',
    'layout.navigation': 'Navegación',
    'layout.mainContent': 'Contenido principal',
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
