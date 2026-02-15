import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProviderBadge } from '../ProviderBadge'

describe('ProviderBadge', () => {
  it('renders Claude provider', () => {
    render(<ProviderBadge provider="claude" />)
    expect(screen.getByText('Claude')).toBeInTheDocument()
  })

  it('renders Codex provider', () => {
    render(<ProviderBadge provider="codex" />)
    expect(screen.getByText('Codex')).toBeInTheDocument()
  })

  it('renders Gemini provider', () => {
    render(<ProviderBadge provider="gemini" />)
    expect(screen.getByText('Gemini')).toBeInTheDocument()
  })

  it('renders claude_cli variant', () => {
    render(<ProviderBadge provider="claude_cli" />)
    expect(screen.getByText('Claude CLI')).toBeInTheDocument()
  })

  it('renders codex_cli variant', () => {
    render(<ProviderBadge provider="codex_cli" />)
    expect(screen.getByText('Codex CLI')).toBeInTheDocument()
  })

  it('renders gemini_cli variant', () => {
    render(<ProviderBadge provider="gemini_cli" />)
    expect(screen.getByText('Gemini CLI')).toBeInTheDocument()
  })

  it('falls back gracefully for unknown provider', () => {
    render(<ProviderBadge provider="unknown_provider" />)
    expect(screen.getByText('unknown_provider')).toBeInTheDocument()
  })

  it('renders compact variant', () => {
    const { container } = render(<ProviderBadge provider="claude" compact />)
    const badge = container.firstElementChild
    expect(badge?.className).toContain('py-0.5')
  })

  it('accepts custom className', () => {
    const { container } = render(<ProviderBadge provider="claude" className="my-custom" />)
    const badge = container.firstElementChild
    expect(badge?.className).toContain('my-custom')
  })

  it('has icon with aria-hidden', () => {
    const { container } = render(<ProviderBadge provider="claude" />)
    const icon = container.querySelector('svg[aria-hidden]')
    expect(icon).toBeTruthy()
  })
})
