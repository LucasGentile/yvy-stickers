import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/contexts/PreferencesContext', () => ({
  usePrefs: () => ({ stickerOrder: 'album' }),
}))

import { TradeCardBody } from '@/components/audit/TradeCardBody'
import type { AuditEntry } from '@/actions/getAuditLog'

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'entry-1',
    action: 'trade_accepted',
    metadata: {
      tradeId: 'trade-1',
      partnerName: 'Ana Lima',
      givingIds: ['BRA1', 'MEX2'],
      receivingIds: ['ARG1'],
    },
    created_at: '2026-05-10T12:00:00Z',
    ...overrides,
  }
}

describe('TradeCardBody', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders label and detail from EVENT_CONFIG', () => {
    render(
      <TradeCardBody
        entry={makeEntry()}
        borderClass="border-l-green-500"
        timeSlot={<span data-testid="time">agora</span>}
      />
    )
    expect(screen.getByText(/Troca concluída com Ana Lima/i)).toBeInTheDocument()
    expect(screen.getByText(/2 dando · 1 recebendo/i)).toBeInTheDocument()
  })

  it('renders the time slot', () => {
    render(
      <TradeCardBody
        entry={makeEntry()}
        borderClass="border-l-green-500"
        timeSlot={<span data-testid="time">há 5 min</span>}
      />
    )
    expect(screen.getByTestId('time')).toHaveTextContent('há 5 min')
  })

  it('renders giving stickers with giving label', () => {
    const { container } = render(
      <TradeCardBody
        entry={makeEntry()}
        borderClass="border-l-green-500"
        timeSlot={<span>now</span>}
      />
    )
    expect(container.textContent).toContain('BRA1')
    expect(container.textContent).toContain('MEX2')
    expect(screen.getByText(/Você deu 2 para/i)).toBeInTheDocument()
  })

  it('renders receiving stickers with receiving label', () => {
    const { container } = render(
      <TradeCardBody
        entry={makeEntry()}
        borderClass="border-l-green-500"
        timeSlot={<span>now</span>}
      />
    )
    expect(container.textContent).toContain('ARG1')
    expect(screen.getByText(/Você recebeu/i)).toBeInTheDocument()
  })

  it('renders children when provided', () => {
    render(
      <TradeCardBody
        entry={makeEntry()}
        borderClass="border-l-green-500"
        timeSlot={<span>now</span>}
      >
        <div data-testid="child">Custom child</div>
      </TradeCardBody>
    )
    expect(screen.getByTestId('child')).toHaveTextContent('Custom child')
  })

  it('returns null for unknown action', () => {
    const { container } = render(
      <TradeCardBody
        entry={makeEntry({ action: 'unknown_action' as string })}
        borderClass="border-l-gray-500"
        timeSlot={<span>now</span>}
      />
    )
    expect(container.innerHTML).toBe('')
  })

  it('does not show sticker sections when no givingIds or receivingIds', () => {
    const entry = makeEntry({
      metadata: { tradeId: 'trade-1', partnerName: 'Ana Lima', givingCount: 2, receivingCount: 1 },
    })
    const { container } = render(
      <TradeCardBody entry={entry} borderClass="border-l-green-500" timeSlot={<span>now</span>} />
    )
    expect(container.querySelector('.flex.flex-wrap')).toBeNull()
  })

  it('shows recovery labels for trade_rolled_back action', () => {
    const entry = makeEntry({
      action: 'trade_rolled_back',
      metadata: {
        tradeId: 'trade-1',
        partnerName: 'João',
        givingIds: ['BRA1'],
        receivingIds: ['MEX1'],
        partial: false,
      },
    })
    render(
      <TradeCardBody entry={entry} borderClass="border-l-amber-400" timeSlot={<span>now</span>} />
    )
    expect(screen.getByText(/Você recuperou/)).toBeInTheDocument()
    expect(screen.getByText(/Você devolveu/)).toBeInTheDocument()
  })

  it('uses future tense for pending trade (trade_sent)', () => {
    const entry = makeEntry({
      action: 'trade_sent',
      metadata: {
        tradeId: 'trade-1',
        partnerName: 'Carlos',
        givingIds: ['BRA2'],
        receivingIds: ['MEX3'],
        givingCount: 1,
        receivingCount: 1,
      },
    })
    render(
      <TradeCardBody entry={entry} borderClass="border-l-yvy-accent" timeSlot={<span>now</span>} />
    )
    expect(screen.getByText(/Você dá 1 para/)).toBeInTheDocument()
    expect(screen.getByText(/Você recebe 1 de/)).toBeInTheDocument()
  })

  it('shows third-party stickers for advanced_trade_executed', () => {
    const entry = makeEntry({
      action: 'advanced_trade_executed',
      metadata: {
        tradeId: 'trade-1',
        partners: ['Bob', 'Carol'],
        givingIds: ['BRA1'],
        receivingIds: ['MEX1'],
        giveToName: 'Bob',
        receiveFromName: 'Carol',
        thirdPartyIds: ['ARG3'],
        thirdPartyFromName: 'Bob',
        thirdPartyToName: 'Carol',
      },
    })
    const { container } = render(
      <TradeCardBody entry={entry} borderClass="border-l-green-500" timeSlot={<span>now</span>} />
    )
    expect(container.textContent).toContain('ARG3')
    expect(screen.getByText(/Bob dá 1 para Carol/)).toBeInTheDocument()
  })

  it('applies the borderClass to the container', () => {
    const { container } = render(
      <TradeCardBody
        entry={makeEntry()}
        borderClass="border-l-[4px] border-l-yvy-accent"
        timeSlot={<span>now</span>}
      />
    )
    const outerDiv = container.firstElementChild
    expect(outerDiv?.className).toContain('border-l-[4px]')
    expect(outerDiv?.className).toContain('border-l-yvy-accent')
  })

  it('formats partnerName using formatName', () => {
    const entry = makeEntry({
      metadata: {
        tradeId: 'trade-1',
        partnerName: 'MARIA DE SOUZA',
        givingIds: ['BRA1'],
        receivingIds: [],
      },
    })
    render(
      <TradeCardBody entry={entry} borderClass="border-l-green-500" timeSlot={<span>now</span>} />
    )
    // formatName applied twice: "MARIA DE SOUZA" -> "Maria de Souza"
    expect(screen.getByText(/Maria de Souza/)).toBeInTheDocument()
  })
})
