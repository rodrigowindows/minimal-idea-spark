import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SmartCapture } from './SmartCapture'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('SmartCapture', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should render the input field', () => {
    render(<SmartCapture />)
    const input = screen.getByPlaceholderText(/capture anything/i)
    expect(input).toBeInTheDocument()
  })

  it('should accept text input', async () => {
    render(<SmartCapture />)
    const input = screen.getByPlaceholderText(/capture anything/i)

    await userEvent.type(input, 'Study for exam')
    expect(input).toHaveValue('Study for exam')
  })

  it('should have a submit button', () => {
    render(<SmartCapture />)
    const button = screen.getByRole('button', { name: /capture/i })
    expect(button).toBeInTheDocument()
  })

  it('should disable submit button when input is empty', () => {
    render(<SmartCapture />)
    const button = screen.getByRole('button', { name: /capture/i })
    expect(button).toBeDisabled()
  })

  it('should enable submit button when input has text', async () => {
    render(<SmartCapture />)
    const input = screen.getByPlaceholderText(/capture anything/i)
    await userEvent.type(input, 'some task')

    const button = screen.getByRole('button', { name: /capture/i })
    expect(button).toBeEnabled()
  })

  it('should show loading state after submit', async () => {
    render(<SmartCapture />)
    const input = screen.getByPlaceholderText(/capture anything/i)
    await userEvent.type(input, 'Study TypeScript')

    const button = screen.getByRole('button', { name: /capture/i })
    fireEvent.click(button)

    // Input should be disabled during processing
    expect(input).toBeDisabled()
  })

  it('should process input and show classification after submit', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<SmartCapture />)
    const input = screen.getByPlaceholderText(/capture anything/i)

    await userEvent.type(input, 'Study for concurso')

    const button = screen.getByRole('button', { name: /capture/i })
    await userEvent.click(button)

    // Advance past the 1200ms simulated processing delay
    vi.advanceTimersByTime(1300)

    await waitFor(() => {
      // After processing, classification result should appear with type badge
      expect(screen.getByText('study')).toBeInTheDocument()
    })

    vi.useRealTimers()
  })

  it('should clear input after successful capture', async () => {
    render(<SmartCapture />)
    const input = screen.getByPlaceholderText(/capture anything/i)

    await userEvent.type(input, 'Study something')

    const button = screen.getByRole('button', { name: /capture/i })
    fireEvent.click(button)

    // Wait for the processing delay (1200ms) + clearing timeout (2500ms)
    await waitFor(() => {
      expect(input).toHaveValue('')
    }, { timeout: 5000 })
  })

  it('should render quick action buttons', () => {
    render(<SmartCapture />)

    expect(screen.getByText('Quick Log')).toBeInTheDocument()
    expect(screen.getByText('Set Goal')).toBeInTheDocument()
    expect(screen.getByText('Brain Dump')).toBeInTheDocument()
    expect(screen.getByText('Review Week')).toBeInTheDocument()
  })

  it('should set input prefix when clicking quick action', async () => {
    render(<SmartCapture />)
    const goalButton = screen.getByText('Set Goal')

    await userEvent.click(goalButton)

    const input = screen.getByPlaceholderText(/capture anything/i)
    expect(input).toHaveValue('My goal for today: ')
  })
})
