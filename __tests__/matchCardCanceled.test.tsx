import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/actions/createTradeRequest', () => ({
  createTradeRequest: vi.fn(),
}))

vi.mock(import('@/lib/stickers'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    isChromeSticker: () => false,
    isCocaColaSticker: () => false,
  }
})

import MatchCard from '@/components/MatchCard'
import type { MatchResult } from '@/lib/matching'

function makeMatch(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    userId: 'user-b',
    displayKey: 'b',
    name: 'Bob Silva',
    apartment: '101',
    tower: 'A',
    phone: '5599999',
    matchScore: 3,
    reciprocalScore: 2,
    mutualScore: 2,
    matchStickers: ['BRA1', 'BRA2', 'BRA3'],
    reciprocalStickers: ['MEX1', 'MEX2'],
    completionPct: 45,
    missingCount: 100,
    canceledTrades: [],
    ...overrides,
  }
}

describe('MatchCard — canceled trade badge', () => {
  it('shows badge when a canceled trade stickers are all available in current match', () => {
    render(
      <MatchCard
        match={makeMatch({
          canceledTrades: [{ giving: ['MEX1'], receiving: ['BRA1'] }],
        })}
        rank={1}
      />
    )
    expect(screen.getByText('Cancelada anteriormente')).toBeInTheDocument()
  })

  it('hides badge when canceled trade stickers are NOT all available', () => {
    render(
      <MatchCard
        match={makeMatch({
          canceledTrades: [{ giving: ['XXX1'], receiving: ['BRA1'] }],
        })}
        rank={1}
      />
    )
    expect(screen.queryByText('Cancelada anteriormente')).not.toBeInTheDocument()
  })

  it('hides badge when no canceled trades exist', () => {
    render(<MatchCard match={makeMatch()} rank={1} />)
    expect(screen.queryByText('Cancelada anteriormente')).not.toBeInTheDocument()
  })

  it('hides badge when canceled trade has empty sticker arrays', () => {
    render(
      <MatchCard
        match={makeMatch({
          canceledTrades: [{ giving: [], receiving: [] }],
        })}
        rank={1}
      />
    )
    expect(screen.queryByText('Cancelada anteriormente')).not.toBeInTheDocument()
  })
})

describe('MatchCard — canceled trade confirmation in modal', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: () => 'user-a', setItem: () => {}, clear: () => {} },
    })
  })

  it('shows warning when selected stickers exactly match a canceled trade', () => {
    render(
      <MatchCard
        match={makeMatch({
          canceledTrades: [{ giving: ['MEX1'], receiving: ['BRA1'] }],
        })}
        rank={1}
      />
    )

    fireEvent.click(screen.getByText('Realizar Troca'))

    // Select giving: MEX1
    fireEvent.click(screen.getByText('MEX1'))
    // Select receiving: BRA1
    fireEvent.click(screen.getByText('BRA1'))

    // Go to confirmation step
    fireEvent.click(screen.getByText(/Confirmar troca/))

    // Click send — should trigger canceled trade warning
    fireEvent.click(screen.getByText('Enviar pedido de troca'))

    expect(screen.getByText(/idêntica a uma que foi cancelada/)).toBeInTheDocument()
    expect(screen.getByText('Enviar mesmo assim')).toBeInTheDocument()
  })

  it('does NOT show warning when selected stickers differ from canceled trade', () => {
    render(
      <MatchCard
        match={makeMatch({
          canceledTrades: [{ giving: ['MEX1', 'MEX2'], receiving: ['BRA1', 'BRA2'] }],
        })}
        rank={1}
      />
    )

    fireEvent.click(screen.getByText('Realizar Troca'))

    // Select only MEX1 (not the full set)
    fireEvent.click(screen.getByText('MEX1'))
    // Select only BRA1
    fireEvent.click(screen.getByText('BRA1'))

    fireEvent.click(screen.getByText(/Confirmar troca/))
    fireEvent.click(screen.getByText('Enviar pedido de troca'))

    expect(screen.queryByText(/idêntica a uma que foi cancelada/)).not.toBeInTheDocument()
  })
})
