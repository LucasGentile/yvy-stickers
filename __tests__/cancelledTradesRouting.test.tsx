import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/components/trades/StickerList', () => ({
  StickerList: () => null,
}))

vi.mock('@/actions/ackTradeCancellation', () => ({
  ackTradeCancellation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/contexts/NotificationContext', () => ({
  useNotification: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}))

import CancelledTradesSection from '@/components/CancelledTradesSection'
import type { CancelledTrade } from '@/actions/getPendingTrades'

const noop = () => {}

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

describe('CancelledTradesSection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing when trades array is empty', () => {
    const { container } = render(
      <CancelledTradesSection trades={[]} userId="user-1" onAck={noop} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows trade cards immediately (always expanded)', () => {
    render(
      <CancelledTradesSection
        trades={[makeTrade({ auditEntryId: 'audit-abc' })]}
        userId="user-1"
        onAck={noop}
      />
    )
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('links to /history/<id> when auditEntryId is present', () => {
    render(
      <CancelledTradesSection
        trades={[makeTrade({ auditEntryId: 'audit-abc-123' })]}
        userId="user-1"
        onAck={noop}
      />
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/history/audit-abc-123')
  })

  it('shows no details link when auditEntryId is null', () => {
    render(
      <CancelledTradesSection
        trades={[makeTrade({ auditEntryId: null })]}
        userId="user-1"
        onAck={noop}
      />
    )
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders one ack button per trade', () => {
    const trades = [
      makeTrade({ id: 'trade-1', auditEntryId: 'audit-1' }),
      makeTrade({ id: 'trade-2', auditEntryId: null }),
    ]
    render(<CancelledTradesSection trades={trades} userId="user-1" onAck={noop} />)
    const buttons = screen.getAllByRole('button', { name: /entendi/i })
    expect(buttons).toHaveLength(2)
  })
})
