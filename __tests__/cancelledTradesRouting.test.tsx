import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/components/trades/StickerList', () => ({
  StickerList: () => null,
}))

import CancelledTradesSection from '@/components/CancelledTradesSection'
import type { CancelledTrade } from '@/actions/getPendingTrades'

function makeTrade(overrides: Partial<CancelledTrade> = {}): CancelledTrade {
  return {
    id: 'trade-1',
    otherUserName: 'Alice',
    myGivingIds: ['BRA1'],
    myReceivingIds: [],
    status: 'cancelled',
    createdAt: new Date().toISOString(),
    auditEntryId: null,
    ...overrides,
  }
}

function expandSection() {
  fireEvent.click(screen.getByText('Trocas canceladas'))
}

describe('CancelledTradesSection — routing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('links to /history/<id> when auditEntryId is present', () => {
    render(<CancelledTradesSection trades={[makeTrade({ auditEntryId: 'audit-abc-123' })]} />)
    expandSection()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/history/audit-abc-123')
  })

  it('falls back to /historico when auditEntryId is null', () => {
    render(<CancelledTradesSection trades={[makeTrade({ auditEntryId: null })]} />)
    expandSection()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/historico')
  })

  it('renders correct href for each trade independently', () => {
    const trades = [
      makeTrade({ id: 'trade-1', auditEntryId: 'audit-1' }),
      makeTrade({ id: 'trade-2', auditEntryId: null }),
      makeTrade({ id: 'trade-3', auditEntryId: 'audit-3' }),
    ]
    render(<CancelledTradesSection trades={trades} />)
    expandSection()
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '/history/audit-1')
    expect(links[1]).toHaveAttribute('href', '/historico')
    expect(links[2]).toHaveAttribute('href', '/history/audit-3')
  })

  it('renders nothing when trades array is empty', () => {
    const { container } = render(<CancelledTradesSection trades={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('does not render trade cards until section is expanded', () => {
    render(<CancelledTradesSection trades={[makeTrade({ auditEntryId: 'audit-xyz' })]} />)
    expect(screen.queryByRole('link')).toBeNull()
    expandSection()
    expect(screen.getByRole('link')).toBeInTheDocument()
  })
})
