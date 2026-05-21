import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/contexts/PreferencesContext', () => ({
  usePrefs: () => ({ stickerOrder: 'album' }),
  PrefsProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/contexts/NotificationContext', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
  NotificationProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/actions/respondToTrade', () => ({
  respondToTrade: vi.fn(),
}))

vi.mock('@/actions/getBetterMatchExcludingTrade', () => ({
  getBetterMatchExcludingTrade: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/actions/getTradeAvailability', () => ({
  getTradeAvailability: vi.fn().mockResolvedValue({
    myGivingAvailable: ['BRA1'],
    myGivingUnavailable: [],
    theirGivingAvailable: ['CAN3'],
    theirGivingUnavailable: [],
  }),
}))

vi.mock('@/actions/checkAlreadyOwnedIncoming', () => ({
  checkAlreadyOwnedIncoming: vi.fn(),
}))

vi.mock(import('@/lib/stickers'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    isChromeSticker: () => false,
    isCocaColaSticker: () => false,
  }
})

import { checkAlreadyOwnedIncoming } from '@/actions/checkAlreadyOwnedIncoming'
import { respondToTrade } from '@/actions/respondToTrade'
import { TradeCard } from '@/components/trades/TradeCard'
import type { PendingTrade } from '@/actions/getPendingTrades'

const mockCheckAlreadyOwned = checkAlreadyOwnedIncoming as ReturnType<typeof vi.fn>
const mockRespondToTrade = respondToTrade as ReturnType<typeof vi.fn>

function makeTrade(overrides: Partial<PendingTrade> = {}): PendingTrade {
  return {
    id: 'trade-1',
    otherUserId: 'user-b',
    otherUserName: 'Bob Silva',
    otherUserPhone: '5599999',
    myGivingIds: ['BRA1'],
    myReceivingIds: ['CAN3'],
    status: 'pending',
    createdAt: '2026-05-20T12:00:00Z',
    isSender: false,
    ...overrides,
  }
}

describe('Already-owned trade warning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRespondToTrade.mockResolvedValue({ success: true })
  })

  it('does not show striped variant when no one owns redundant stickers', async () => {
    mockCheckAlreadyOwned.mockResolvedValue({ myAlreadyOwned: [], theirAlreadyOwned: [] })

    const { container } = render(
      <TradeCard trade={makeTrade()} userId="user-a" onDone={vi.fn()} />
    )

    await waitFor(() => {
      expect(mockCheckAlreadyOwned).toHaveBeenCalledWith('user-a', 'user-b', ['CAN3'], ['BRA1'])
    })

    const chips = container.querySelectorAll('[class*="border-red-400"]')
    expect(chips).toHaveLength(0)
  })

  it('shows striped variant on stickers I already own (receiving)', async () => {
    mockCheckAlreadyOwned.mockResolvedValue({ myAlreadyOwned: ['CAN3'], theirAlreadyOwned: [] })

    const { container } = render(
      <TradeCard trade={makeTrade()} userId="user-a" onDone={vi.fn()} />
    )

    await waitFor(() => {
      const chips = container.querySelectorAll('[class*="border-red-400"]')
      expect(chips.length).toBeGreaterThan(0)
    })
  })

  it('shows striped variant on stickers the other user already owns (giving)', async () => {
    mockCheckAlreadyOwned.mockResolvedValue({ myAlreadyOwned: [], theirAlreadyOwned: ['BRA1'] })

    const { container } = render(
      <TradeCard trade={makeTrade()} userId="user-a" onDone={vi.fn()} />
    )

    await waitFor(() => {
      const chips = container.querySelectorAll('[class*="border-red-400"]')
      expect(chips.length).toBeGreaterThan(0)
    })
  })

  it('shows modal when user tries to approve with stickers they already own', async () => {
    mockCheckAlreadyOwned.mockResolvedValue({ myAlreadyOwned: ['CAN3'], theirAlreadyOwned: [] })

    render(<TradeCard trade={makeTrade()} userId="user-a" onDone={vi.fn()} />)

    await waitFor(() => {
      expect(mockCheckAlreadyOwned).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByText('Aceitar troca'))
    fireEvent.click(screen.getByText('Revisei, continuar'))

    await waitFor(() => {
      expect(screen.getByText(/Confirmar troca/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Confirmar troca/))

    await waitFor(() => {
      expect(screen.getByText('Troca com figurinhas redundantes')).toBeInTheDocument()
      expect(screen.getByText(/Você já tem/)).toBeInTheDocument()
    })
  })

  it('shows modal when giving stickers the other user already owns', async () => {
    mockCheckAlreadyOwned.mockResolvedValue({ myAlreadyOwned: [], theirAlreadyOwned: ['BRA1'] })

    render(<TradeCard trade={makeTrade()} userId="user-a" onDone={vi.fn()} />)

    await waitFor(() => {
      expect(mockCheckAlreadyOwned).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByText('Aceitar troca'))
    fireEvent.click(screen.getByText('Revisei, continuar'))

    await waitFor(() => {
      expect(screen.getByText(/Confirmar troca/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Confirmar troca/))

    await waitFor(() => {
      expect(screen.getByText('Troca com figurinhas redundantes')).toBeInTheDocument()
      expect(screen.getByText(/Bob já tem/)).toBeInTheDocument()
    })
  })

  it('modal "Recusar troca" calls reject action', async () => {
    mockCheckAlreadyOwned.mockResolvedValue({ myAlreadyOwned: ['CAN3'], theirAlreadyOwned: [] })
    const onDone = vi.fn()

    render(<TradeCard trade={makeTrade()} userId="user-a" onDone={onDone} />)

    await waitFor(() => {
      expect(mockCheckAlreadyOwned).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByText('Aceitar troca'))
    fireEvent.click(screen.getByText('Revisei, continuar'))

    await waitFor(() => {
      expect(screen.getByText(/Confirmar troca/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Confirmar troca/))

    await waitFor(() => {
      expect(screen.getByText('Recusar troca')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Recusar troca'))

    await waitFor(() => {
      expect(mockRespondToTrade).toHaveBeenCalledWith('trade-1', 'user-a', 'reject')
    })
  })

  it('modal "Confirmar mesmo assim" proceeds with accept', async () => {
    mockCheckAlreadyOwned.mockResolvedValue({ myAlreadyOwned: ['CAN3'], theirAlreadyOwned: [] })
    const onDone = vi.fn()

    render(<TradeCard trade={makeTrade()} userId="user-a" onDone={onDone} />)

    await waitFor(() => {
      expect(mockCheckAlreadyOwned).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByText('Aceitar troca'))
    fireEvent.click(screen.getByText('Revisei, continuar'))

    await waitFor(() => {
      expect(screen.getByText(/Confirmar troca/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Confirmar troca/))

    await waitFor(() => {
      expect(screen.getByText('Confirmar mesmo assim')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Confirmar mesmo assim'))

    await waitFor(() => {
      expect(mockRespondToTrade).toHaveBeenCalledWith(
        'trade-1',
        'user-a',
        'accept',
        ['BRA1'],
        ['CAN3']
      )
    })
  })

  it('modal dismiss returns to previous state without action', async () => {
    mockCheckAlreadyOwned.mockResolvedValue({ myAlreadyOwned: ['CAN3'], theirAlreadyOwned: [] })

    render(<TradeCard trade={makeTrade()} userId="user-a" onDone={vi.fn()} />)

    await waitFor(() => {
      expect(mockCheckAlreadyOwned).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByText('Aceitar troca'))
    fireEvent.click(screen.getByText('Revisei, continuar'))

    await waitFor(() => {
      expect(screen.getByText(/Confirmar troca/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Confirmar troca/))

    await waitFor(() => {
      expect(screen.getByText('Troca com figurinhas redundantes')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Fechar'))

    await waitFor(() => {
      expect(screen.queryByText('Troca com figurinhas redundantes')).not.toBeInTheDocument()
    })

    expect(mockRespondToTrade).not.toHaveBeenCalled()
  })

  it('no modal when neither user owns redundant stickers', async () => {
    mockCheckAlreadyOwned.mockResolvedValue({ myAlreadyOwned: [], theirAlreadyOwned: [] })
    const onDone = vi.fn()

    render(<TradeCard trade={makeTrade()} userId="user-a" onDone={onDone} />)

    await waitFor(() => {
      expect(mockCheckAlreadyOwned).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByText('Aceitar troca'))
    fireEvent.click(screen.getByText('Revisei, continuar'))

    await waitFor(() => {
      expect(screen.getByText(/Confirmar troca/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Confirmar troca/))

    await waitFor(() => {
      expect(mockRespondToTrade).toHaveBeenCalledWith(
        'trade-1',
        'user-a',
        'accept',
        ['BRA1'],
        ['CAN3']
      )
    })

    expect(screen.queryByText('Troca com figurinhas redundantes')).not.toBeInTheDocument()
  })
})
