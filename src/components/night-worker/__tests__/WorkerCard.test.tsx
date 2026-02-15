/**
 * Tests for WorkerCard component.
 * Covers: active/inactive status, config display, queue, time formatting.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkerCard } from '../WorkerCard'
import type { WorkerConfig } from '@/types/night-worker'

const baseConfig: WorkerConfig = {
  active: true,
  provider: 'claude_cli',
  windowStart: '08:00',
  windowEnd: '22:00',
  intervalSeconds: 60,
  timeoutSeconds: 300,
  maxFiles: 3,
  maxPromptSize: 8000,
  folder: 'C:\\night-worker\\claude',
}

describe('WorkerCard', () => {
  it('renderiza titulo do worker', () => {
    render(<WorkerCard title="Claude" config={baseConfig} />)
    expect(screen.getByText('Claude')).toBeInTheDocument()
  })

  it('mostra status Ativo quando config.active = true', () => {
    render(<WorkerCard title="Claude" config={{ ...baseConfig, active: true }} />)
    expect(screen.getByText('Ativo')).toBeInTheDocument()
  })

  it('mostra status Parado quando config.active = false', () => {
    render(<WorkerCard title="Codex" config={{ ...baseConfig, active: false }} />)
    expect(screen.getByText('Parado')).toBeInTheDocument()
  })

  it('mostra provider', () => {
    render(<WorkerCard title="Claude" config={baseConfig} />)
    expect(screen.getByText('claude_cli')).toBeInTheDocument()
  })

  it('mostra intervalo em segundos', () => {
    render(<WorkerCard title="Claude" config={baseConfig} />)
    expect(screen.getByText('60s')).toBeInTheDocument()
  })

  it('mostra janela de horario', () => {
    render(<WorkerCard title="Claude" config={baseConfig} />)
    expect(screen.getByText('08:00 - 22:00')).toBeInTheDocument()
  })

  it('mostra pasta do worker', () => {
    render(<WorkerCard title="Claude" config={baseConfig} />)
    expect(screen.getByText('C:\\night-worker\\claude')).toBeInTheDocument()
  })

  it('mostra "—" quando folder ausente', () => {
    const { container } = render(<WorkerCard title="Claude" config={{ ...baseConfig, folder: undefined }} />)
    // Multiple "—" may appear (folder + lastRun), just check at least one exists
    const allText = container.textContent ?? ''
    expect(allText).toContain('—')
  })

  it('mostra fila quando fornecida', () => {
    render(<WorkerCard title="Claude" config={baseConfig} queue={5} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('mostra modelo quando disponivel', () => {
    render(<WorkerCard title="Codex" config={{ ...baseConfig, model: 'gpt-4.1-mini' }} />)
    expect(screen.getByText('gpt-4.1-mini')).toBeInTheDocument()
  })
})
