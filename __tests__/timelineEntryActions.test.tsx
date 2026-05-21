import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/contexts/PreferencesContext', () => ({
  usePrefs: () => ({ stickerOrder: 'album' }),
}))

vi.mock('@/actions/rollbackTrade', () => ({
  rollbackTrade: vi.fn(),
}))

vi.mock('@/actions/rollbackAdvancedTrade', () => ({
  rollbackAdvancedTrade: vi.fn(),
}))

vi.mock('@/actions/getTradeRollbackInfo', () => ({
  getTradeRollbackInfo: vi.fn(),
}))

import { TimelineEntry } from '@/components/audit/TimelineEntry'

describe('TimelineEntry actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders rollback control for trade_accepted entries with tradeId', () => {
    render(
      <TimelineEntry
        entry={{
          id: 'e1',
          action: 'trade_accepted',
          metadata: {
            tradeId: 'trade-1',
            partnerName: 'Ana Silva',
            givingIds: ['BRA1'],
            receivingIds: ['ARG2'],
          },
          created_at: '2026-05-10T12:00:00Z',
        }}
        isFocused={true}
        userId="user-1"
      />
    )

    expect(screen.getByText('Desfazer troca')).toBeInTheDocument()
  })

  it('renders advanced rollback control for advanced_trade_executed entries', () => {
    render(
      <TimelineEntry
        entry={{
          id: 'e1',
          action: 'advanced_trade_executed',
          metadata: {
            tradeId: 'adv-trade-1',
            partners: ['Ana', 'Bia'],
            givingIds: ['BRA1'],
            receivingIds: ['ARG2'],
            giveToName: 'Ana',
            receiveFromName: 'Bia',
          },
          created_at: '2026-05-10T12:00:00Z',
        }}
        isFocused={true}
        userId="user-1"
      />
    )

    expect(screen.getByText('Desfazer troca')).toBeInTheDocument()
  })

  it('renders trade assistant button for trade_accepted entries with stickers', () => {
    render(
      <TimelineEntry
        entry={{
          id: 'e1',
          action: 'trade_accepted',
          metadata: {
            tradeId: 'trade-1',
            partnerName: 'Ana Silva',
            givingIds: ['BRA1'],
            receivingIds: ['ARG2'],
          },
          created_at: '2026-05-10T12:00:00Z',
        }}
        isFocused={true}
        userId="user-1"
      />
    )

    expect(screen.getByText('Assistente de troca')).toBeInTheDocument()
  })

  it('does NOT render actions for trade_cancelled entries', () => {
    render(
      <TimelineEntry
        entry={{
          id: 'e1',
          action: 'trade_cancelled',
          metadata: {
            tradeId: 'trade-1',
            partnerName: 'Ana',
            givingIds: ['BRA1'],
            receivingIds: ['ARG2'],
          },
          created_at: '2026-05-10T12:00:00Z',
        }}
        isFocused={true}
        userId="user-1"
      />
    )

    expect(screen.queryByText('Desfazer troca')).not.toBeInTheDocument()
    expect(screen.queryByText('Assistente de troca')).not.toBeInTheDocument()
  })

  it('does NOT render actions for trade_rejected entries', () => {
    render(
      <TimelineEntry
        entry={{
          id: 'e1',
          action: 'trade_rejected',
          metadata: {
            tradeId: 'trade-1',
            partnerName: 'Ana',
            givingIds: ['BRA1'],
            receivingIds: [],
          },
          created_at: '2026-05-10T12:00:00Z',
        }}
        isFocused={true}
        userId="user-1"
      />
    )

    expect(screen.queryByText('Desfazer troca')).not.toBeInTheDocument()
  })

  it('does NOT render rollback for non-terminal events like trade_sent', () => {
    render(
      <TimelineEntry
        entry={{
          id: 'e1',
          action: 'trade_sent',
          metadata: {
            tradeId: 'trade-1',
            partnerName: 'Ana',
            givingIds: ['BRA1'],
            receivingIds: ['ARG2'],
          },
          created_at: '2026-05-10T12:00:00Z',
        }}
        isFocused={false}
        userId="user-1"
      />
    )

    expect(screen.queryByText('Desfazer troca')).not.toBeInTheDocument()
  })

  it('renders trade assistant for non-canceled trade entries with stickers', () => {
    render(
      <TimelineEntry
        entry={{
          id: 'e1',
          action: 'trade_sent',
          metadata: {
            tradeId: 'trade-1',
            partnerName: 'Ana',
            givingIds: ['BRA1'],
            receivingIds: ['ARG2'],
          },
          created_at: '2026-05-10T12:00:00Z',
        }}
        isFocused={false}
        userId="user-1"
      />
    )

    expect(screen.getByText('Assistente de troca')).toBeInTheDocument()
  })

  it('does NOT render actions when userId is not provided', () => {
    render(
      <TimelineEntry
        entry={{
          id: 'e1',
          action: 'trade_accepted',
          metadata: {
            tradeId: 'trade-1',
            partnerName: 'Ana',
            givingIds: ['BRA1'],
            receivingIds: ['ARG2'],
          },
          created_at: '2026-05-10T12:00:00Z',
        }}
        isFocused={true}
      />
    )

    expect(screen.queryByText('Desfazer troca')).not.toBeInTheDocument()
  })
})
