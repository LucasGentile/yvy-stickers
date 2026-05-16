import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: { from: vi.fn() } }))

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
import type { RecentTrade } from '@/actions/getPendingTrades'

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
  })

  it('shows partner filter chips when multiple partners exist', () => {
    const trades = [
      makeTrade({ otherUserName: 'Alice' }),
      makeTrade({ otherUserName: 'Bob' }),
      makeTrade({ otherUserName: 'Carlos' }),
    ]

    render(<CompletedTradesSection trades={trades} userId="user-a" onRefresh={() => {}} />)

    fireEvent.click(screen.getByText(/Trocas concluídas/))

    const chips = screen.getAllByRole('button').filter((btn) =>
      btn.className.includes('rounded-full')
    )
    const chipLabels = chips.map((c) => c.textContent)
    expect(chipLabels).toContain('Alice')
    expect(chipLabels).toContain('Bob')
    expect(chipLabels).toContain('Carlos')
  })

  it('does not show filter chips when only one partner exists', () => {
    const trades = [
      makeTrade({ otherUserName: 'Alice' }),
      makeTrade({ otherUserName: 'Alice' }),
    ]

    render(<CompletedTradesSection trades={trades} userId="user-a" onRefresh={() => {}} />)

    fireEvent.click(screen.getByText(/Trocas concluídas/))

    const chips = screen.getAllByRole('button').filter((btn) =>
      btn.className.includes('rounded-full')
    )
    expect(chips).toHaveLength(0)
  })

  function getChip(name: string) {
    return screen.getAllByRole('button').find(
      (btn) => btn.className.includes('rounded-full') && btn.textContent === name
    )!
  }

  it('filters trades when a partner chip is selected', () => {
    const trades = [
      makeTrade({ id: 'trade-alice', otherUserName: 'Alice', myGivingIds: ['AAA1'] }),
      makeTrade({ id: 'trade-bob', otherUserName: 'Bob', myGivingIds: ['BBB1'] }),
    ]

    const { container } = render(
      <CompletedTradesSection trades={trades} userId="user-a" onRefresh={() => {}} />
    )

    fireEvent.click(screen.getByText(/Trocas concluídas/))
    fireEvent.click(getChip('Alice'))

    expect(container.textContent).toContain('AAA1')
    expect(container.textContent).not.toContain('BBB1')
  })

  it('deselects filter when clicking the same chip again', () => {
    const trades = [
      makeTrade({ id: 'trade-alice', otherUserName: 'Alice', myGivingIds: ['AAA1'] }),
      makeTrade({ id: 'trade-bob', otherUserName: 'Bob', myGivingIds: ['BBB1'] }),
    ]

    const { container } = render(
      <CompletedTradesSection trades={trades} userId="user-a" onRefresh={() => {}} />
    )

    fireEvent.click(screen.getByText(/Trocas concluídas/))
    fireEvent.click(getChip('Alice'))
    fireEvent.click(getChip('Alice'))

    expect(container.textContent).toContain('AAA1')
    expect(container.textContent).toContain('BBB1')
  })

  it('shows count with partner name in header when filtered', () => {
    const trades = [
      makeTrade({ otherUserName: 'Alice' }),
      makeTrade({ otherUserName: 'Alice' }),
      makeTrade({ otherUserName: 'Bob' }),
    ]

    render(<CompletedTradesSection trades={trades} userId="user-a" onRefresh={() => {}} />)

    fireEvent.click(screen.getByText(/Trocas concluídas/))
    fireEvent.click(getChip('Alice'))

    expect(screen.getByText(/2 com Alice/)).toBeInTheDocument()
  })
})
