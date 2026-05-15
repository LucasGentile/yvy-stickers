import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/actions/createTradeRequest', () => ({
  createTradeRequest: vi.fn(),
}))

vi.mock('@/lib/stickers', () => ({
  isChromeSticker: () => false,
}))

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
    previouslyCanceled: true,
    ...overrides,
  }
}

describe('MatchCard — previouslyCanceled badge visibility', () => {
  it('shows badge when both matchScore and reciprocalScore > 0', () => {
    render(<MatchCard match={makeMatch()} rank={1} />)
    expect(screen.getByText('Cancelada anteriormente')).toBeInTheDocument()
  })

  it('hides badge when matchScore is 0', () => {
    render(
      <MatchCard
        match={makeMatch({ matchScore: 0, matchStickers: [], mutualScore: 0 })}
        rank={1}
      />
    )
    expect(screen.queryByText('Cancelada anteriormente')).not.toBeInTheDocument()
  })

  it('hides badge when reciprocalScore is 0', () => {
    render(
      <MatchCard
        match={makeMatch({ reciprocalScore: 0, reciprocalStickers: [], mutualScore: 0 })}
        rank={1}
      />
    )
    expect(screen.queryByText('Cancelada anteriormente')).not.toBeInTheDocument()
  })

  it('hides badge when both scores are 0', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchScore: 0,
          reciprocalScore: 0,
          matchStickers: [],
          reciprocalStickers: [],
          mutualScore: 0,
        })}
        rank={1}
      />
    )
    expect(screen.queryByText('Cancelada anteriormente')).not.toBeInTheDocument()
  })

  it('hides badge when previouslyCanceled is false even with scores > 0', () => {
    render(<MatchCard match={makeMatch({ previouslyCanceled: false })} rank={1} />)
    expect(screen.queryByText('Cancelada anteriormente')).not.toBeInTheDocument()
  })
})
