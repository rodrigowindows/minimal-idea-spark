import { useCallback, useEffect, useState } from 'react'
import type { PromptItem } from '@/types/night-worker'

const STORAGE_KEY_PRIORITIZED = 'nw_kanban_prioritized_v1'
const STORAGE_KEY_DOING = 'nw_kanban_doing_v1'

interface KanbanState {
  prioritizedIds: string[]
  doingIds: string[]
}

/**
 * Hook para gerenciar estado Kanban (localStorage) com performance otimizada
 */
export function useKanbanState(prompts: PromptItem[] | undefined) {
  const [state, setState] = useState<KanbanState>(() => {
    // Initialize from localStorage
    try {
      const prioritized = JSON.parse(localStorage.getItem(STORAGE_KEY_PRIORITIZED) || '[]') as string[]
      const doing = JSON.parse(localStorage.getItem(STORAGE_KEY_DOING) || '[]') as string[]
      return { prioritizedIds: prioritized, doingIds: doing }
    } catch {
      return { prioritizedIds: [], doingIds: [] }
    }
  })

  // Clean up stale IDs (prompts that are done/failed or deleted)
  useEffect(() => {
    if (!prompts) return

    const validPendingIds = new Set(
      prompts.filter((p) => p.status === 'pending').map((p) => p.id)
    )

    setState((prev) => {
      const cleanPrioritized = prev.prioritizedIds.filter((id) => validPendingIds.has(id))
      const cleanDoing = prev.doingIds.filter((id) => validPendingIds.has(id))

      // Only update if something changed
      if (
        cleanPrioritized.length !== prev.prioritizedIds.length ||
        cleanDoing.length !== prev.doingIds.length
      ) {
        return { prioritizedIds: cleanPrioritized, doingIds: cleanDoing }
      }

      return prev
    })
  }, [prompts])

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRIORITIZED, JSON.stringify(state.prioritizedIds))
      localStorage.setItem(STORAGE_KEY_DOING, JSON.stringify(state.doingIds))
    } catch (err) {
      console.error('[Kanban] Failed to persist state:', err)
    }
  }, [state])

  const moveToBacklog = useCallback((id: string) => {
    setState((prev) => ({
      prioritizedIds: prev.prioritizedIds.filter((pid) => pid !== id),
      doingIds: prev.doingIds.filter((did) => did !== id),
    }))
  }, [])

  const moveToPrioritized = useCallback((id: string, index?: number) => {
    setState((prev) => {
      const newPrioritized = prev.prioritizedIds.filter((pid) => pid !== id)
      const insertIndex = index !== undefined ? index : newPrioritized.length
      newPrioritized.splice(insertIndex, 0, id)

      return {
        prioritizedIds: newPrioritized,
        doingIds: prev.doingIds.filter((did) => did !== id),
      }
    })
  }, [])

  const moveToDoing = useCallback((id: string) => {
    setState((prev) => ({
      prioritizedIds: prev.prioritizedIds.filter((pid) => pid !== id),
      doingIds: prev.doingIds.includes(id) ? prev.doingIds : [...prev.doingIds, id],
    }))
  }, [])

  const reorderPrioritized = useCallback((ids: string[]) => {
    setState((prev) => ({ ...prev, prioritizedIds: ids }))
  }, [])

  const clearKanban = useCallback(() => {
    setState({ prioritizedIds: [], doingIds: [] })
  }, [])

  return {
    prioritizedIds: state.prioritizedIds,
    doingIds: state.doingIds,
    moveToBacklog,
    moveToPrioritized,
    moveToDoing,
    reorderPrioritized,
    clearKanban,
  }
}
