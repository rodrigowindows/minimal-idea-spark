import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'lifeos_warroom_layout'

export const WIDGET_IDS = [
  'smart-capture',
  'the-one-thing',
  'opportunity-radar',
  'time-blocking',
  'quick-journal',
  'activity-heatmap',
] as const

export type WidgetId = (typeof WIDGET_IDS)[number]

export interface WarRoomLayout {
  order: WidgetId[]
  visible: Record<WidgetId, boolean>
}

const defaultLayout: WarRoomLayout = {
  order: [...WIDGET_IDS],
  visible: WIDGET_IDS.reduce((acc, id) => ({ ...acc, [id]: true }), {} as Record<WidgetId, boolean>),
}

function loadLayout(): WarRoomLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as WarRoomLayout
      const order = (parsed.order ?? defaultLayout.order).filter((id) => WIDGET_IDS.includes(id))
      const visible = { ...defaultLayout.visible, ...parsed.visible }
      return { order, visible }
    }
  } catch { /* ignore */ }
  return defaultLayout
}

function saveLayout(layout: WarRoomLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch { /* ignore */ }
}

interface WarRoomLayoutContextValue {
  layout: WarRoomLayout
  setOrder: (order: WidgetId[]) => void
  setVisible: (id: WidgetId, visible: boolean) => void
  resetLayout: () => void
}

const Context = createContext<WarRoomLayoutContextValue | undefined>(undefined)

export function WarRoomLayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<WarRoomLayout>(loadLayout)

  const setOrder = useCallback((order: WidgetId[]) => {
    setLayout((prev) => {
      const next = { ...prev, order }
      saveLayout(next)
      return next
    })
  }, [])

  const setVisible = useCallback((id: WidgetId, visible: boolean) => {
    setLayout((prev) => {
      const next = { ...prev, visible: { ...prev.visible, [id]: visible } }
      saveLayout(next)
      return next
    })
  }, [])

  const resetLayout = useCallback(() => {
    saveLayout(defaultLayout)
    setLayout(defaultLayout)
  }, [])

  return (
    <Context.Provider value={{ layout, setOrder, setVisible, resetLayout }}>
      {children}
    </Context.Provider>
  )
}

export function useWarRoomLayout() {
  const ctx = useContext(Context)
  if (ctx === undefined) throw new Error('useWarRoomLayout must be used within WarRoomLayoutProvider')
  return ctx
}
