import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

import { NotificationProvider, useNotification } from '@/contexts/NotificationContext'
import NotificationBanner from '@/components/NotificationBanner'

function TestHarness() {
  const { showSuccess, showError, dismiss } = useNotification()
  return (
    <div>
      <button data-testid="success" onClick={() => showSuccess('Operação realizada!')}>
        Success
      </button>
      <button data-testid="error" onClick={() => showError('Algo deu errado.')}>
        Error
      </button>
      <button data-testid="dismiss" onClick={dismiss}>
        Dismiss
      </button>
      <NotificationBanner />
    </div>
  )
}

function renderWithProvider() {
  return render(
    <NotificationProvider>
      <TestHarness />
    </NotificationProvider>
  )
}

describe('NotificationBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders nothing when no notification is active', () => {
    renderWithProvider()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a success banner with the correct message', () => {
    renderWithProvider()
    fireEvent.click(screen.getByTestId('success'))
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Operação realizada!')
    expect(alert).toHaveClass('bg-emerald-600')
  })

  it('shows an error banner with the correct message', () => {
    renderWithProvider()
    fireEvent.click(screen.getByTestId('error'))
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Algo deu errado.')
    expect(alert).toHaveClass('bg-red-600')
  })

  it('auto-dismisses after 5 seconds', () => {
    renderWithProvider()
    fireEvent.click(screen.getByTestId('success'))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('can be manually dismissed', () => {
    renderWithProvider()
    fireEvent.click(screen.getByTestId('success'))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Fechar notificação'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('replaces the previous notification when a new one is triggered', () => {
    renderWithProvider()
    fireEvent.click(screen.getByTestId('success'))
    expect(screen.getByRole('alert')).toHaveTextContent('Operação realizada!')

    fireEvent.click(screen.getByTestId('error'))
    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado.')
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('resets the auto-dismiss timer when a new notification replaces the old', () => {
    renderWithProvider()
    fireEvent.click(screen.getByTestId('success'))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    fireEvent.click(screen.getByTestId('error'))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('dismiss via context also works', () => {
    renderWithProvider()
    fireEvent.click(screen.getByTestId('error'))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('dismiss'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
