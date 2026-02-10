import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'lifeos_warroom_layout'

export const WIDGET_IDS = [
  'smart-capture',
  'the-one-thing',
  'opportunity-radar',
  'time-blocking',
  'quick-journal',
  'activity-heatmap',
  'goals-okr',
] as const

export type WidgetId = (typeof WIDGET_IDS)[number]

export type WidgetSize = 'compact' | 'normal' | 'large'

export interface WarRoomLayout {
  order: WidgetId[]
  visible: Record<WidgetId, boolean>
  sizes: Record<WidgetId, WidgetSize>
}

const defaultLayout: WarRoomLayout = {
  order: [...WIDGET_IDS],
  visible: WIDGET_IDS.reduce((acc, id) => ({ ...acc, [id]: true }), {} as Record<WidgetId, boolean>),
  sizes: WIDGET_IDS.reduce((acc, id) => ({ ...acc, [id]: 'normal' as WidgetSize }), {} as Record<WidgetId, WidgetSize>),
}

function loadLayout(): WarRoomLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WarRoomLayout>
      // Merge with defaults so new widgets added in the future auto-appear
      const knownOrder = (parsed.order ?? []).filter((id) => WIDGET_IDS.includes(id))
      const missing = WIDGET_IDS.filter((id) => !knownOrder.includes(id))
      const order = [...knownOrder, ...missing]
      const visible = { ...defaultLayout.visible, ...parsed.visible }
      const sizes = { ...defaultLayout.sizes, ...parsed.sizes }
      return { order, visible, sizes }
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
  setSize: (id: WidgetId, size: WidgetSize) => void
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

  const setSize = useCallback((id: WidgetId, size: WidgetSize) => {
    setLayout((prev) => {
      const next = { ...prev, sizes: { ...prev.sizes, [id]: size } }
      saveLayout(next)
      return next
    })
  }, [])

  const resetLayout = useCallback(() => {
    saveLayout(defaultLayout)
    setLayout(defaultLayout)
  }, [])

  const value = useMemo(() => ({ layout, setOrder, setVisible, setSize, resetLayout }), [layout, setOrder, setVisible, setSize, resetLayout])

  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  )
}

export function useWarRoomLayout() {
  const ctx = useContext(Context)
  if (ctx === undefined) throw new Error('useWarRoomLayout must be used within WarRoomLayoutProvider')
  return ctx
}
