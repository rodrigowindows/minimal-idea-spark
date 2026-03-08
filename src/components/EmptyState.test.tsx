import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from './EmptyState'
import { Search } from 'lucide-react'

describe('EmptyState', () => {
  it('should render title and description', () => {
    render(<EmptyState title="No items" description="Create your first item" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText('Create your first item')).toBeInTheDocument()
  })

  it('should render action button when provided', async () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="Empty"
        description="Nothing here"
        actionLabel="Add Item"
        onAction={onClick}
      />
    )
    const button = screen.getByText('Add Item')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('should render with custom icon', () => {
    render(<EmptyState title="Empty" description="Test" icon={Search} />)
    expect(screen.getByText('Empty')).toBeInTheDocument()
  })
})
