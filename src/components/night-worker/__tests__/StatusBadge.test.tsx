import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../StatusBadge'
import type { PromptStatus } from '@/types/night-worker'

describe('StatusBadge', () => {
  const statuses: PromptStatus[] = ['pending', 'processing', 'done', 'failed']

  it.each(statuses)('renders badge for status "%s"', (status) => {
    render(<StatusBadge status={status} />)
    const badge = screen.getByText(/.+/)
    expect(badge).toBeInTheDocument()
  })

  it('shows "Pendente" for pending status', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('Pendente')).toBeInTheDocument()
  })

  it('shows "Processando" for processing status', () => {
    render(<StatusBadge status="processing" />)
    expect(screen.getByText('Processando')).toBeInTheDocument()
  })

  it('shows "Concluido" for done status', () => {
    render(<StatusBadge status="done" />)
    expect(screen.getByText('Concluido')).toBeInTheDocument()
  })

  it('shows "Falhou" for failed status', () => {
    render(<StatusBadge status="failed" />)
    expect(screen.getByText('Falhou')).toBeInTheDocument()
  })

  it('applies pulse animation for pending when pulse=true', () => {
    const { container } = render(<StatusBadge status="pending" pulse />)
    const badge = container.querySelector('[class*="animate-pulse"]')
    expect(badge).toBeTruthy()
  })

  it('applies pulse animation for processing when pulse=true', () => {
    const { container } = render(<StatusBadge status="processing" pulse />)
    const badge = container.querySelector('[class*="animate-pulse"]')
    expect(badge).toBeTruthy()
  })

  it('does NOT pulse for done status even when pulse=true', () => {
    const { container } = render(<StatusBadge status="done" pulse />)
    const badge = container.firstElementChild
    expect(badge?.className).not.toContain('animate-pulse')
  })

  it('processing icon has animate-spin class', () => {
    const { container } = render(<StatusBadge status="processing" />)
    const spinner = container.querySelector('[class*="animate-spin"]')
    expect(spinner).toBeTruthy()
  })

  it('accepts custom className', () => {
    const { container } = render(<StatusBadge status="done" className="custom-class" />)
    const badge = container.firstElementChild
    expect(badge?.className).toContain('custom-class')
  })

  it('falls back to pending styling for unknown status', () => {
    render(<StatusBadge status={'unknown' as PromptStatus} />)
    expect(screen.getByText('Pendente')).toBeInTheDocument()
  })
})
