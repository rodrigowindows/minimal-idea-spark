import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type Language = 'pt' | 'en'

const translations = {
  pt: {
    // Sidebar nav
    dashboard: 'Painel',
    consultant: 'Consultor',
    opportunities: 'Oportunidades',
    journal: 'Diario',
    habits: 'Habitos',
    goals: 'Metas',
    priorities: 'Prioridades',
    analytics: 'Analiticos',
    weeklyReview: 'Revisao Semanal',
    contentGenerator: 'Gerador de Conteudo',
    workspace: 'Espaco de Trabalho',
    settings: 'Configuracoes',
    deepWork: 'Foco Profundo',
    collapse: 'Recolher',

    // Dashboard
    nightOwlMode: 'Modo noturno',
    goodMorning: 'Bom dia',
    goodAfternoon: 'Boa tarde',
    goodEvening: 'Boa noite',
    commander: 'Comandante',
    dayStreak: 'dias seguidos',
    inProgress: 'em andamento',
    focus: 'foco',
    theOneThing: 'A Unica Coisa',
    capturePlaceholder: 'Capture qualquer coisa... IA classifica automaticamente',
    capture: 'Capturar',
    quickLog: 'Registro Rapido',
    setGoal: 'Definir Meta',
    brainDump: 'Descarga Mental',
    reviewWeek: 'Revisar Semana',
    level: 'Nivel',

    // Voice input
    holdToRecord: 'Segure para gravar',
    stopRecording: 'Parar gravacao',
    recording: 'Gravando...',
    transcribing: 'Transcrevendo...',
    voiceError: 'Erro na gravacao. Tente novamente.',
    micNotSupported: 'Microfone nao suportado neste navegador.',

    // Smart capture
    identifyingDomain: 'Identificando dominio, tipo e valor estrategico...',
    itemsCaptured: 'itens capturados',
    capturedAs: 'Capturado como',
    in: 'em',

    // Widgets
    opportunityRadar: 'Radar de Oportunidades',
    timeBlocking: 'Blocos de Tempo',
    quickJournal: 'Diario Rapido',
    activityHeatmap: 'Mapa de Atividades',

    // Calendar
    calendar: 'Calendario',

    // Language
    switchLanguage: 'Idioma',
  },
  en: {
    // Sidebar nav
    dashboard: 'Dashboard',
    consultant: 'Consultant',
    opportunities: 'Opportunities',
    journal: 'Journal',
    habits: 'Habits',
    goals: 'Goals',
    priorities: 'Priorities',
    analytics: 'Analytics',
    weeklyReview: 'Weekly Review',
    contentGenerator: 'Content Generator',
    workspace: 'Workspace',
    settings: 'Settings',
    deepWork: 'Deep Work',
    collapse: 'Collapse',

    // Dashboard
    nightOwlMode: 'Night owl mode',
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    commander: 'Commander',
    dayStreak: 'day streak',
    inProgress: 'in progress',
    focus: 'focus',
    theOneThing: 'The One Thing',
    capturePlaceholder: 'Capture anything... AI classifies automatically',
    capture: 'Capture',
    quickLog: 'Quick Log',
    setGoal: 'Set Goal',
    brainDump: 'Brain Dump',
    reviewWeek: 'Review Week',
    level: 'Level',

    // Voice input
    holdToRecord: 'Hold to record',
    stopRecording: 'Stop recording',
    recording: 'Recording...',
    transcribing: 'Transcribing...',
    voiceError: 'Recording error. Please try again.',
    micNotSupported: 'Microphone not supported in this browser.',

    // Smart capture
    identifyingDomain: 'Identifying domain, type, and strategic value...',
    itemsCaptured: 'items captured',
    capturedAs: 'Captured as',
    in: 'in',

    // Widgets
    opportunityRadar: 'Opportunity Radar',
    timeBlocking: 'Time Blocking',
    quickJournal: 'Quick Journal',
    activityHeatmap: 'Activity Heatmap',

    // Calendar
    calendar: 'Calendar',

    // Language
    switchLanguage: 'Language',
  },
} as const

export type TranslationKey = keyof typeof translations.en

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: Record<TranslationKey, string>
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('lifeos_language')
    return (stored === 'pt' || stored === 'en') ? stored : 'pt'
  })

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('lifeos_language', lang)
  }, [])

  const toggleLanguage = useCallback(() => {
    handleSetLanguage(language === 'pt' ? 'en' : 'pt')
  }, [language, handleSetLanguage])

  const t = translations[language]

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (context === undefined) throw new Error('useTranslation must be used within a LanguageProvider')
  return context
}
