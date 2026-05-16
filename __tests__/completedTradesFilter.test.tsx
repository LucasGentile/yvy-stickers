import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/actions/rollbackTrade', () => ({ rollbackTrade: vi.fn() }))
vi.mock('@/actions/getTradeRollbackInfo', () => ({ getTradeRollbackInfo: vi.fn() }))
vi.mock('@/actions/verifyTrade', () => ({ verifyTrade: vi.fn() }))

import { CompletedTradesSection } from '@/components/CompletedTradesSection'
import type { RecentTrade } from '@/actions/getPendingTrades'

function makeTrade(id: string, name: string, verified: boolean): RecentTrade {
  return {
    id,
    otherUserId: `user-${id}`,
    otherUserName: name,
    myGivingIds: ['BRA1'],
    myReceivingIds: ['ARG1'],
    acceptedAt: '2026-05-10T12:00:00Z',
    rollbackRequestedBy: null,
    isSender: true,
    verified,
    rollbackMyGivingIds: null,
    rollbackMyReceivingIds: null,
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

describe('CompletedTradesSection — verified filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    localStorageMock.setItem('userId', 'user-1')
  })

  it('shows all trades by default when expanded', () => {
    const trades = [makeTrade('1', 'Ana', true), makeTrade('2', 'Bob', false)]

    render(<CompletedTradesSection trades={trades} userId="user-1" onRefresh={vi.fn()} />)

    fireEvent.click(screen.getByText(/Trocas concluídas/))

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('filter checkbox is unchecked by default', () => {
    const trades = [makeTrade('1', 'Ana', true)]

    render(<CompletedTradesSection trades={trades} userId="user-1" onRefresh={vi.fn()} />)

    fireEvent.click(screen.getByText(/Trocas concluídas/))

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('filters to only unverified trades when checkbox is checked', () => {
    const trades = [
      makeTrade('1', 'Ana', true),
      makeTrade('2', 'Bob', false),
      makeTrade('3', 'Carlos', false),
    ]

    render(<CompletedTradesSection trades={trades} userId="user-1" onRefresh={vi.fn()} />)

    fireEvent.click(screen.getByText(/Trocas concluídas/))

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox'))

    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
  })

  it('shows empty message when all trades are verified and filter is on', () => {
    const trades = [makeTrade('1', 'Ana', true), makeTrade('2', 'Bob', true)]

    render(<CompletedTradesSection trades={trades} userId="user-1" onRefresh={vi.fn()} />)

    fireEvent.click(screen.getByText(/Trocas concluídas/))
    fireEvent.click(screen.getByRole('checkbox'))

    expect(screen.getByText(/Todas as trocas já foram verificadas/)).toBeInTheDocument()
  })

  it('unchecking the filter shows all trades again', () => {
    const trades = [makeTrade('1', 'Ana', true), makeTrade('2', 'Bob', false)]

    render(<CompletedTradesSection trades={trades} userId="user-1" onRefresh={vi.fn()} />)

    fireEvent.click(screen.getByText(/Trocas concluídas/))
    fireEvent.click(screen.getByRole('checkbox'))

    expect(screen.queryByText('Ana')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox'))

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })
})
