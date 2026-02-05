import { useState, useCallback, useMemo } from 'react'
import type { Opportunity, TimeBlock } from '@/types'
import { TIME_BLOCK_DEFAULTS } from '@/lib/constants'

interface TimeBlockState {
  blocks: TimeBlock[]
  selectedDate: string
}

const STORAGE_KEY = 'minimal_idea_spark_time_blocks'

function getInitialState(): TimeBlockState {
  if (typeof window === 'undefined') {
    return createDefaultState()
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return createDefaultState()
    }
  }
  return createDefaultState()
}

function createDefaultState(): TimeBlockState {
  return {
    blocks: [],
    selectedDate: new Date().toISOString().split('T')[0],
  }
}

export function useTimeBlocking() {
  const [state, setState] = useState<TimeBlockState>(getInitialState)

  const persistState = useCallback((newState: TimeBlockState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
  }, [])

  const blocksForSelectedDate = useMemo(() => {
    return state.blocks
      .filter(b => b.block_date === state.selectedDate)
      .sort((a, b) => a.block_start.localeCompare(b.block_start))
  }, [state.blocks, state.selectedDate])

  const setSelectedDate = useCallback((date: string) => {
    setState(prev => {
      const newState = { ...prev, selectedDate: date }
      persistState(newState)
      return newState
    })
  }, [persistState])

  const addBlock = useCallback((
    blockStart: string,
    duration: number = TIME_BLOCK_DEFAULTS.DEFAULT_DURATION,
    opportunity?: Opportunity
  ) => {
    const newBlock: TimeBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: 'mock-user',
      opportunity_id: opportunity?.id ?? null,
      block_start: blockStart,
      block_duration: duration,
      block_date: state.selectedDate,
      created_at: new Date().toISOString(),
      opportunity,
    }

    setState(prev => {
      const newBlocks = [...prev.blocks, newBlock]
      const newState = { ...prev, blocks: newBlocks }
      persistState(newState)
      return newState
    })

    return newBlock
  }, [state.selectedDate, persistState])

  const updateBlock = useCallback((
    blockId: string,
    updates: Partial<Pick<TimeBlock, 'block_start' | 'block_duration' | 'opportunity_id' | 'opportunity'>>
  ) => {
    setState(prev => {
      const newBlocks = prev.blocks.map(block =>
        block.id === blockId ? { ...block, ...updates } : block
      )
      const newState = { ...prev, blocks: newBlocks }
      persistState(newState)
      return newState
    })
  }, [persistState])

  const removeBlock = useCallback((blockId: string) => {
    setState(prev => {
      const newBlocks = prev.blocks.filter(b => b.id !== blockId)
      const newState = { ...prev, blocks: newBlocks }
      persistState(newState)
      return newState
    })
  }, [persistState])

  const moveBlock = useCallback((blockId: string, newStartTime: string) => {
    updateBlock(blockId, { block_start: newStartTime })
  }, [updateBlock])

  const assignOpportunity = useCallback((blockId: string, opportunity: Opportunity | null) => {
    updateBlock(blockId, {
      opportunity_id: opportunity?.id ?? null,
      opportunity: opportunity ?? undefined,
    })
  }, [updateBlock])

  const getBlocksTotal = useCallback(() => {
    return blocksForSelectedDate.reduce((sum, b) => sum + b.block_duration, 0)
  }, [blocksForSelectedDate])

  const checkOverlap = useCallback((start: string, duration: number, excludeId?: string) => {
    const startMinutes = timeToMinutes(start)
    const endMinutes = startMinutes + duration

    return blocksForSelectedDate.some(block => {
      if (block.id === excludeId) return false
      const blockStart = timeToMinutes(block.block_start)
      const blockEnd = blockStart + block.block_duration
      return (startMinutes < blockEnd && endMinutes > blockStart)
    })
  }, [blocksForSelectedDate])

  return {
    blocks: blocksForSelectedDate,
    selectedDate: state.selectedDate,
    setSelectedDate,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
    assignOpportunity,
    getBlocksTotal,
    checkOverlap,
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}
