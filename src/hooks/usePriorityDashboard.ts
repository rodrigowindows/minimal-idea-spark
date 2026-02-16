import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useLocalData } from '@/hooks/useLocalData'
import { usePriorities } from '@/hooks/usePriorities'
import {
  loadPersistentContext,
  markReevaluated,
  savePersistentContext,
  shouldAutoReevaluate,
  syncPrioritiesToPersistentContext,
} from '@/lib/rag/priority-context'

export function usePriorityDashboard() {
  const { opportunities, goals } = useLocalData()
  const {
    priorities,
    activePriorities,
    completedPriorities,
    archivedPriorities,
    insights,
    suggestions,
    stats,
    addPriority,
    updatePriority,
    deletePriority,
    changePriorityStatus,
    updateKeyResult,
    addKeyResult,
    removeKeyResult,
  } = usePriorities(opportunities, goals)

  const [showNewDialog, setShowNewDialog] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [objectivesInput, setObjectivesInput] = useState('')
  const [showObjectives, setShowObjectives] = useState(false)

  const persistentCtx = useMemo(() => loadPersistentContext(), [priorities])

  useEffect(() => {
    syncPrioritiesToPersistentContext(priorities)
  }, [priorities])

  useEffect(() => {
    if (shouldAutoReevaluate(priorities)) {
      markReevaluated()
    }
  }, [priorities])

  function handleSaveObjectives() {
    const objectives = objectivesInput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    const context = loadPersistentContext()
    savePersistentContext({ ...context, objectives })
    toast.success('Objectives updated!')
    setShowObjectives(false)
  }

  return {
    priorities,
    activePriorities,
    completedPriorities,
    archivedPriorities,
    insights,
    suggestions,
    stats,
    addPriority,
    updatePriority,
    deletePriority,
    changePriorityStatus,
    updateKeyResult,
    addKeyResult,
    removeKeyResult,
    showNewDialog,
    setShowNewDialog,
    expandedId,
    setExpandedId,
    objectivesInput,
    setObjectivesInput,
    showObjectives,
    setShowObjectives,
    persistentCtx,
    handleSaveObjectives,
  }
}
