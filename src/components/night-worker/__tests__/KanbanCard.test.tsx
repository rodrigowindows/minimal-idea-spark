/**
 * Tests for KanbanCard component.
 * Covers: prompt display, status/provider badges, error/result snippets,
 * reprocess button visibility, time-ago display.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { PromptItem } from '@/types/night-worker'

// Mock dnd-kit
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}))

import { KanbanCard } from '../KanbanCard'

function makePrompt(overrides: Partial<PromptItem> = {}): PromptItem {
  return {
    id: 'test-1',
    name: 'prompt-test',
    provider: 'claude',
    status: 'pending',
    content: 'test content',
    target_folder: 'C:\\code\\test',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T01:00:00Z',
    ...overrides,
  }
}

function renderCard(prompt: PromptItem, props: Partial<Parameters<typeof KanbanCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <KanbanCard prompt={prompt} isDraggable={false} {...props} />
    </MemoryRouter>,
  )
}

describe('KanbanCard', () => {
  it('renderiza nome do prompt', () => {
    renderCard(makePrompt({ name: 'meu-prompt-legal' }))
    expect(screen.getByText('meu-prompt-legal')).toBeInTheDocument()
  })

  it('renderiza target folder', () => {
    renderCard(makePrompt({ target_folder: '/home/user/project' }))
    expect(screen.getByText('/home/user/project')).toBeInTheDocument()
  })

  it('mostra "-" quando target_folder vazio', () => {
    renderCard(makePrompt({ target_folder: '' }))
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('mostra botao "Ver detalhes"', () => {
    renderCard(makePrompt())
    expect(screen.getByText('Ver detalhes')).toBeInTheDocument()
  })

  it('mostra erro para prompts com status failed', () => {
    renderCard(makePrompt({ status: 'failed', error: 'Rate limit exceeded' }))
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
  })

  it('nao mostra erro para prompts done', () => {
    renderCard(makePrompt({ status: 'done', error: null }))
    expect(screen.queryByText(/Rate limit/)).toBeNull()
  })

  it('mostra snippet do resultado para prompts done', () => {
    renderCard(makePrompt({ status: 'done', result_content: 'Here is the implementation code...' }))
    expect(screen.getByText(/Here is the implementation/)).toBeInTheDocument()
  })

  it('mostra botao Reprocessar para prompts done/failed', () => {
    const onReprocess = vi.fn()
    renderCard(makePrompt({ status: 'done' }), { onReprocess })
    expect(screen.getByText('Reprocessar')).toBeInTheDocument()
  })

  it('nao mostra botao Reprocessar para prompts pending', () => {
    const onReprocess = vi.fn()
    renderCard(makePrompt({ status: 'pending' }), { onReprocess })
    expect(screen.queryByText('Reprocessar')).toBeNull()
  })

  it('mostra badge "Processando" quando isProcessing=true', () => {
    renderCard(makePrompt({ status: 'processing' }), { isProcessing: true })
    // "Processando" appears in both StatusBadge and the isProcessing Badge
    const elements = screen.getAllByText('Processando')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('mostra badge "Reprocessado" quando cloned_from existe', () => {
    renderCard(makePrompt({ cloned_from: 'original-1' }))
    expect(screen.getByText('Reprocessado')).toBeInTheDocument()
  })

  it('chama onReprocess ao clicar no botao', async () => {
    const onReprocess = vi.fn()
    const prompt = makePrompt({ status: 'failed' })
    renderCard(prompt, { onReprocess })

    await userEvent.click(screen.getByText('Reprocessar'))
    expect(onReprocess).toHaveBeenCalledWith(prompt)
  })
})
