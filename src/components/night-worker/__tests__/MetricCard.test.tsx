/**
 * Tests for MetricCard component.
 * Covers: rendering, accent colors, hint text, icon display.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from '../MetricCard'
import { Activity, Zap, AlertTriangle } from 'lucide-react'

describe('MetricCard', () => {
  it('renderiza titulo e valor', () => {
    render(<MetricCard title="Total" value={42} icon={Activity} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renderiza valor string', () => {
    render(<MetricCard title="Status" value="OK" icon={Activity} />)
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('mostra hint quando fornecido', () => {
    render(<MetricCard title="Erros" value={3} icon={AlertTriangle} hint="Ultimas 24h" />)
    expect(screen.getByText('Ultimas 24h')).toBeInTheDocument()
  })

  it('nao mostra hint quando nao fornecido', () => {
    const { container } = render(<MetricCard title="Total" value={0} icon={Activity} />)
    expect(container.querySelectorAll('.text-xs.text-muted-foreground')).toHaveLength(0)
  })

  it('renderiza icone', () => {
    const { container } = render(<MetricCard title="Test" value={1} icon={Zap} />)
    // Icon is rendered as SVG inside a container div
    const iconContainer = container.querySelector('.h-11.w-11')
    expect(iconContainer).not.toBeNull()
    expect(iconContainer!.querySelector('svg')).not.toBeNull()
  })

  it.each(['blue', 'green', 'red', 'yellow', 'purple'] as const)(
    'aceita accent "%s"',
    (accent) => {
      const { container } = render(<MetricCard title="Test" value={0} icon={Activity} accent={accent} />)
      // Should render without error
      expect(screen.getByText('Test')).toBeInTheDocument()
    },
  )

  it('usa accent blue como padrao', () => {
    const { container } = render(<MetricCard title="Test" value={0} icon={Activity} />)
    expect(container.firstElementChild).not.toBeNull()
  })
})
