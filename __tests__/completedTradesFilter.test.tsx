import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: { from: vi.fn() } }))

vi.mock('@/actions/getPendingTrades', () => ({}))

vi.mock('@/actions/rollbackTrade', () => ({ rollbackTrade: vi.fn() }))
vi.mock('@/actions/getTradeRollbackInfo', () => ({ getTradeRollbackInfo: vi.fn() }))
vi.mock('@/actions/verifyTrade', () => ({ verifyTrade: vi.fn() }))

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

describe('CompletedTradesSection — partner filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    localStorageMock.setItem('userId', 'user-a')
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

  it('does not show partner filter chips when only one partner exists', () => {
    const trades = [
      makeTrade({ otherUserName: 'Alice' }),
      makeTrade({ otherUserName: 'Alice' }),
    ]

    render(<CompletedTradesSection trades={trades} userId="user-a" onRefresh={() => {}} />)

    fireEvent.click(screen.getByText(/Trocas concluídas/))

    const chips = screen.getAllByRole('button').filter(
      (btn) => btn.className.includes('rounded-full') && btn.textContent !== 'Apenas não verificadas'
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

describe('CompletedTradesSection — verified filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    localStorageMock.setItem('userId', 'user-1')
  })

  it('shows all trades by default when expanded', () => {
    const trades = [
      makeTrade({ id: '1', otherUserName: 'Ana', verified: true }),
      makeTrade({ id: '2', otherUserName: 'Bob', verified: false }),
    ]

    render(<CompletedTradesSection trades={trades} userId="user-1" onRefresh={vi.fn()} />)

    fireEvent.click(screen.getByText(/Trocas concluídas/))

    expect(screen.getAllByText('Ana').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1)
  })

  it('verified filter chip is inactive by default', () => {
    const trades = [makeTrade({ id: '1', otherUserName: 'Ana', verified: true })]

    render(<CompletedTradesSection trades={trades} userId="user-1" onRefresh={vi.fn()} />)

    fireEvent.click(screen.getByText(/Trocas concluídas/))

    const chip = screen.getByText('Apenas não verificadas')
    expect(chip.className).toContain('border-amber-300')
    expect(chip.className).not.toContain('bg-amber-500')
  })

  it('filters to only unverified trades when chip is active', () => {
    const trades = [
      makeTrade({ id: '1', otherUserName: 'Ana', verified: true, myGivingIds: ['ANA1'] }),
      makeTrade({ id: '2', otherUserName: 'Bob', verified: false, myGivingIds: ['BOB1'] }),
      makeTrade({ id: '3', otherUserName: 'Carlos', verified: false, myGivingIds: ['CAR1'] }),
    ]

    const { container } = render(
      <CompletedTradesSection trades={trades} userId="user-1" onRefresh={vi.fn()} />
    )

    fireEvent.click(screen.getByText(/Trocas concluídas/))
    fireEvent.click(screen.getByText('Apenas não verificadas'))

    expect(container.textContent).not.toContain('ANA1')
    expect(container.textContent).toContain('BOB1')
    expect(container.textContent).toContain('CAR1')
  })

  it('shows empty message when all trades are verified and filter is on', () => {
    const trades = [
      makeTrade({ id: '1', otherUserName: 'Ana', verified: true }),
      makeTrade({ id: '2', otherUserName: 'Bob', verified: true }),
    ]

    render(<CompletedTradesSection trades={trades} userId="user-1" onRefresh={vi.fn()} />)

    fireEvent.click(screen.getByText(/Trocas concluídas/))
    fireEvent.click(screen.getByText('Apenas não verificadas'))

    expect(screen.getByText(/Todas as trocas já foram verificadas/)).toBeInTheDocument()
  })
})
