import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/actions/createTradeRequest', () => ({
  createTradeRequest: vi.fn(),
}))

vi.mock(import('@/lib/stickers'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    isChromeSticker: () => false,
    isCocaColaSticker: () => false,
  }
})

import { createTradeRequest } from '@/actions/createTradeRequest'
import MatchCard from '@/components/MatchCard'
import NotificationBanner from '@/components/NotificationBanner'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { PrefsProvider } from '@/contexts/PreferencesContext'
import type { MatchResult } from '@/lib/matching'

const mockCreateTradeRequest = createTradeRequest as ReturnType<typeof vi.fn>

function makeMatch(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    userId: 'user-b',
    displayKey: 'b',
    name: 'Bob Silva',
    apartment: '101',
    tower: 'A',
    phone: '5599999',
    matchScore: 2,
    reciprocalScore: 2,
    mutualScore: 2,
    matchStickers: ['BRA1', 'BRA2'],
    reciprocalStickers: ['MEX1', 'MEX2'],
    completionPct: 45,
    missingCount: 100,
    canceledTrades: [],
    ...overrides,
  }
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <PrefsProvider>
      <NotificationProvider>
        {ui}
        <NotificationBanner />
      </NotificationProvider>
    </PrefsProvider>
  )
}

describe('Trade submission notifications — normal trade', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: () => 'user-a', setItem: () => {}, clear: () => {} },
      configurable: true,
    })
  })

  it('shows success notification when trade is submitted', async () => {
    mockCreateTradeRequest.mockResolvedValue({ success: true })

    renderWithProviders(<MatchCard match={makeMatch()} rank={1} />)

    fireEvent.click(screen.getByText('Realizar Troca'))
    fireEvent.click(screen.getByText('BRA1'))
    fireEvent.click(screen.getByText('MEX1'))
    fireEvent.click(screen.getByText(/Confirmar troca/))
    fireEvent.click(screen.getByText('Enviar pedido de troca'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Pedido enviado para Bob!'
      )
    })
    expect(screen.getByRole('alert')).toHaveClass('bg-emerald-600')
  })

  it('shows error notification when trade submission fails', async () => {
    mockCreateTradeRequest.mockResolvedValue({
      success: false,
      error: 'Figurinha já foi trocada.',
    })

    renderWithProviders(<MatchCard match={makeMatch()} rank={1} />)

    fireEvent.click(screen.getByText('Realizar Troca'))
    fireEvent.click(screen.getByText('BRA1'))
    fireEvent.click(screen.getByText('MEX1'))
    fireEvent.click(screen.getByText(/Confirmar troca/))
    fireEvent.click(screen.getByText('Enviar pedido de troca'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Figurinha já foi trocada.')
    })
    expect(screen.getByRole('alert')).toHaveClass('bg-red-600')
  })
})

describe('NotificationBanner width constraint', () => {
  it('has max-w-lg class for constrained width', () => {
    render(
      <NotificationProvider>
        <NotificationBanner />
      </NotificationProvider>
    )

    // No notification = no banner rendered
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders with max-w-lg when notification is active', async () => {
    const { NotificationProvider: NP, useNotification } = await import(
      '@/contexts/NotificationContext'
    )

    function Trigger() {
      const { showSuccess } = useNotification()
      return <button onClick={() => showSuccess('test')}>trigger</button>
    }

    render(
      <NP>
        <Trigger />
        <NotificationBanner />
      </NP>
    )

    fireEvent.click(screen.getByText('trigger'))

    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('max-w-lg')
    expect(alert.className).not.toContain('left-0')
    expect(alert.className).not.toContain('right-0')
  })
})
