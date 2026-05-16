import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: { from: vi.fn() } }))

vi.mock('@/actions/getAdvancedTrades', () => ({
  getAdvancedTrades: vi.fn(),
}))

vi.mock('@/actions/getPendingTrades', () => ({}))

vi.mock('@/actions/rollbackTrade', () => ({
  rollbackTrade: vi.fn(),
}))

vi.mock('@/lib/stickers', () => ({
  isChromeSticker: () => false,
  isCocaColaSticker: () => false,
  sortByAlbumOrder: (ids: string[]) => ids,
  sortAlphabetically: (ids: string[]) => ids,
}))

vi.mock('@/contexts/PreferencesContext', () => ({
  usePrefs: () => ({ stickerOrder: 'album' }),
}))

import { CompletedTradesSection } from '@/components/CompletedTradesSection'
import { getAdvancedTrades } from '@/actions/getAdvancedTrades'
import type { RecentTrade } from '@/actions/getPendingTrades'

const mockGetAdvancedTrades = getAdvancedTrades as ReturnType<typeof vi.fn>

function makeTrade(overrides: Partial<RecentTrade> = {}): RecentTrade {
  return {
    id: `trade-${Math.random()}`,
    otherUserId: 'user-b',
    otherUserName: 'Bob',
    myGivingIds: ['BRA1'],
    myReceivingIds: ['MEX1'],
    acceptedAt: '2026-05-10T12:00:00Z',
    rollbackRequestedBy: null,
    isSender: true,
    verified: false,
    rollbackMyGivingIds: null,
    rollbackMyReceivingIds: null,
    ...overrides,
  }
}

describe('CompletedTradesSection — partner filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAdvancedTrades.mockResolvedValue([])
  })

  it('shows partner filter chips when multiple partners exist', async () => {
    const trades = [
      makeTrade({ otherUserName: 'Alice' }),
      makeTrade({ otherUserName: 'Bob' }),
      makeTrade({ otherUserName: 'Carlos' }),
    ]

    render(<CompletedTradesSection trades={trades} userId="user-a" onRefresh={() => {}} />)

    // Expand the section
    fireEvent.click(screen.getByText(/Trocas concluídas/))

    await waitFor(() => {
      expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1)
    })

    // Filter chips are rendered as buttons with rounded-full class
    const chips = screen.getAllByRole('button').filter((btn) =>
      btn.className.includes('rounded-full')
    )
    const chipLabels = chips.map((c) => c.textContent)
    expect(chipLabels).toContain('Alice')
    expect(chipLabels).toContain('Bob')
    expect(chipLabels).toContain('Carlos')
  })

  it('does not show filter chips when only one partner exists', async () => {
    const trades = [
      makeTrade({ otherUserName: 'Alice' }),
      makeTrade({ otherUserName: 'Alice' }),
    ]

    const { container } = render(
      <CompletedTradesSection trades={trades} userId="user-a" onRefresh={() => {}} />
    )

    fireEvent.click(screen.getByText(/Trocas concluídas/))

    await waitFor(() => {
      expect(container.textContent).toContain('BRA1')
    })

    // Only one partner — no filter chips needed
    expect(screen.queryByRole('button', { name: 'Alice' })).not.toBeInTheDocument()
  })

  function getChip(name: string) {
    return screen.getAllByRole('button').find(
      (btn) => btn.className.includes('rounded-full') && btn.textContent === name
    )!
  }

  it('filters trades when a partner chip is selected', async () => {
    const trades = [
      makeTrade({ id: 'trade-alice', otherUserName: 'Alice', myGivingIds: ['AAA1'] }),
      makeTrade({ id: 'trade-bob', otherUserName: 'Bob', myGivingIds: ['BBB1'] }),
    ]

    const { container } = render(
      <CompletedTradesSection trades={trades} userId="user-a" onRefresh={() => {}} />
    )

    fireEvent.click(screen.getByText(/Trocas concluídas/))

    await waitFor(() => {
      expect(container.textContent).toContain('AAA1')
    })

    fireEvent.click(getChip('Alice'))

    expect(container.textContent).toContain('AAA1')
    expect(container.textContent).not.toContain('BBB1')
  })

  it('deselects filter when clicking the same chip again', async () => {
    const trades = [
      makeTrade({ id: 'trade-alice', otherUserName: 'Alice', myGivingIds: ['AAA1'] }),
      makeTrade({ id: 'trade-bob', otherUserName: 'Bob', myGivingIds: ['BBB1'] }),
    ]

    const { container } = render(
      <CompletedTradesSection trades={trades} userId="user-a" onRefresh={() => {}} />
    )

    fireEvent.click(screen.getByText(/Trocas concluídas/))

    await waitFor(() => {
      expect(container.textContent).toContain('AAA1')
    })

    fireEvent.click(getChip('Alice'))
    fireEvent.click(getChip('Alice'))

    expect(container.textContent).toContain('AAA1')
    expect(container.textContent).toContain('BBB1')
  })

  it('shows count with partner name in header when filtered', async () => {
    const trades = [
      makeTrade({ otherUserName: 'Alice' }),
      makeTrade({ otherUserName: 'Alice' }),
      makeTrade({ otherUserName: 'Bob' }),
    ]

    const { container } = render(
      <CompletedTradesSection trades={trades} userId="user-a" onRefresh={() => {}} />
    )

    fireEvent.click(screen.getByText(/Trocas concluídas/))

    await waitFor(() => {
      expect(container.textContent).toContain('Alice')
    })

    fireEvent.click(getChip('Alice'))

    expect(screen.getByText(/2 com Alice/)).toBeInTheDocument()
  })
})
