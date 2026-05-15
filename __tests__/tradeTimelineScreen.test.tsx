import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/actions/getTradeTimeline', () => ({
  getTradeTimeline: vi.fn(),
}))

vi.mock('@/contexts/PreferencesContext', () => ({
  usePrefs: () => ({ stickerOrder: 'album' }),
}))

import TradeTimelineScreen from '@/components/TradeTimelineScreen'
import { getTradeTimeline } from '@/actions/getTradeTimeline'

const mockGetTradeTimeline = getTradeTimeline as ReturnType<typeof vi.fn>

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('TradeTimelineScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('shows login prompt when no userId', async () => {
    render(<TradeTimelineScreen entryId="entry-1" />)
    expect(await screen.findByText(/identificar/i)).toBeInTheDocument()
  })

  it('shows error when entry not found', async () => {
    localStorageMock.setItem('userId', 'user-1')
    mockGetTradeTimeline.mockResolvedValue(null)

    render(<TradeTimelineScreen entryId="entry-missing" />)
    expect(await screen.findByText(/não encontrado/i)).toBeInTheDocument()
  })

  it('shows back link to historico', async () => {
    localStorageMock.setItem('userId', 'user-1')
    mockGetTradeTimeline.mockResolvedValue(null)

    render(<TradeTimelineScreen entryId="entry-1" />)
    const link = await screen.findByText(/voltar ao histórico/i)
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/historico')
  })

  it('renders timeline entries with focused indicator', async () => {
    localStorageMock.setItem('userId', 'user-1')
    mockGetTradeTimeline.mockResolvedValue({
      entries: [
        {
          id: 'entry-2',
          action: 'trade_accepted',
          metadata: { tradeId: 'trade-1', partnerName: 'Ana' },
          created_at: '2026-05-10T12:00:00Z',
        },
        {
          id: 'entry-1',
          action: 'trade_sent',
          metadata: { tradeId: 'trade-1', partnerName: 'Ana' },
          created_at: '2026-05-10T10:00:00Z',
        },
      ],
      focusedEntryId: 'entry-2',
      tradeId: 'trade-1',
    })

    render(<TradeTimelineScreen entryId="entry-2" />)
    expect(await screen.findByText(/Troca concluída com Ana/i)).toBeInTheDocument()
    expect(screen.getByText(/Pedido de troca enviado/i)).toBeInTheDocument()
  })

  it('highlights only the focused entry with data-focused', async () => {
    localStorageMock.setItem('userId', 'user-1')
    mockGetTradeTimeline.mockResolvedValue({
      entries: [
        {
          id: 'entry-3',
          action: 'trade_accepted',
          metadata: { tradeId: 'trade-1', partnerName: 'Ana' },
          created_at: '2026-05-10T14:00:00Z',
        },
        {
          id: 'entry-2',
          action: 'trade_received',
          metadata: { tradeId: 'trade-1', partnerName: 'Ana' },
          created_at: '2026-05-10T12:00:00Z',
        },
        {
          id: 'entry-1',
          action: 'trade_sent',
          metadata: { tradeId: 'trade-1', partnerName: 'Ana' },
          created_at: '2026-05-10T10:00:00Z',
        },
      ],
      focusedEntryId: 'entry-2',
      tradeId: 'trade-1',
    })

    render(<TradeTimelineScreen entryId="entry-2" />)
    await screen.findByText(/Pedido de troca recebido/i)

    const focusedElements = document.querySelectorAll('[data-focused]')
    expect(focusedElements).toHaveLength(1)
  })

  it('shows stickers for entries that have them', async () => {
    localStorageMock.setItem('userId', 'user-1')
    mockGetTradeTimeline.mockResolvedValue({
      entries: [
        {
          id: 'entry-1',
          action: 'trade_accepted',
          metadata: {
            tradeId: 'trade-1',
            partnerName: 'Ana',
            givingIds: ['BRA1', 'ARG2'],
            receivingIds: ['ESP3'],
          },
          created_at: '2026-05-10T12:00:00Z',
        },
      ],
      focusedEntryId: 'entry-1',
      tradeId: 'trade-1',
    })

    const { container } = render(<TradeTimelineScreen entryId="entry-1" />)
    await screen.findByText(/Troca concluída com Ana/i)
    expect(container.textContent).toContain('BRA1')
    expect(container.textContent).toContain('ARG2')
    expect(container.textContent).toContain('ESP3')
  })

  it('shows error state on fetch failure', async () => {
    localStorageMock.setItem('userId', 'user-1')
    mockGetTradeTimeline.mockRejectedValue(new Error('Network'))

    render(<TradeTimelineScreen entryId="entry-1" />)
    expect(await screen.findByText(/erro ao carregar/i)).toBeInTheDocument()
  })
})
