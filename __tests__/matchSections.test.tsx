import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
}))
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('@/lib/matching', () => ({
  getMatches: vi.fn(),
}))
vi.mock('@/actions/getPendingTrades', () => ({
  getPendingTrades: vi.fn(),
}))
vi.mock('@/actions/createTradeRequest', () => ({
  createTradeRequest: vi.fn(),
}))
vi.mock('@/actions/respondToTrade', () => ({
  respondToTrade: vi.fn(),
}))
vi.mock('@/actions/getBetterMatchExcludingTrade', () => ({
  getBetterMatchExcludingTrade: vi.fn(),
}))
vi.mock('@/actions/getTradeAvailability', () => ({
  getTradeAvailability: vi.fn(),
}))
vi.mock('@/actions/rollbackTrade', () => ({
  rollbackTrade: vi.fn(),
}))
vi.mock('@/actions/verifyTrade', () => ({
  verifyTrade: vi.fn(),
}))

import MatchesScreen from '@/components/MatchesScreen'
import { getMatches } from '@/lib/matching'
import { getPendingTrades } from '@/actions/getPendingTrades'

const mockGetMatches = getMatches as ReturnType<typeof vi.fn>
const mockGetPendingTrades = getPendingTrades as ReturnType<typeof vi.fn>

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

function makeMatch(overrides: {
  userId: string
  name: string
  matchScore: number
  reciprocalScore: number
}) {
  return {
    userId: overrides.userId,
    displayKey: overrides.userId,
    name: overrides.name,
    apartment: '101',
    tower: 'A',
    phone: '5599999',
    matchScore: overrides.matchScore,
    reciprocalScore: overrides.reciprocalScore,
    mutualScore: Math.min(overrides.matchScore, overrides.reciprocalScore),
    matchStickers: Array(overrides.matchScore).fill('BRA1'),
    reciprocalStickers: Array(overrides.reciprocalScore).fill('MEX1'),
    completionPct: 50,
    missingCount: 100,
    previouslyCanceled: false,
    canceledTrades: [],
  }
}

describe('MatchesScreen sections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    localStorageMock.setItem('userId', 'user-1')
    mockGetPendingTrades.mockResolvedValue({
      received: [],
      sent: [],
      recentlyAccepted: [],
      recentlyCancelled: [],
    })
  })

  it('shows mutual matches in the main ranking section', async () => {
    mockGetMatches.mockResolvedValue([
      makeMatch({ userId: 'u-mutual', name: 'Ana Mutual', matchScore: 3, reciprocalScore: 2 }),
    ])

    render(<MatchesScreen />)
    expect(await screen.findByText('Ana Mutual')).toBeInTheDocument()
    expect(screen.queryByText(/Têm para mim/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Preciso das minhas/)).not.toBeInTheDocument()
  })

  it('shows one-way-receive matches in collapsible section', async () => {
    mockGetMatches.mockResolvedValue([
      makeMatch({ userId: 'u-receive', name: 'Bob Doador', matchScore: 5, reciprocalScore: 0 }),
    ])

    render(<MatchesScreen />)
    const sectionButton = await screen.findByText(/Têm para mim, mas não precisa das minhas/)
    expect(sectionButton).toBeInTheDocument()

    expect(screen.queryByText('Bob Doador')).not.toBeInTheDocument()

    fireEvent.click(sectionButton)
    expect(await screen.findByText('Bob Doador')).toBeInTheDocument()
  })

  it('shows one-way-give matches in collapsible section', async () => {
    mockGetMatches.mockResolvedValue([
      makeMatch({ userId: 'u-give', name: 'Carlos Receptor', matchScore: 0, reciprocalScore: 4 }),
    ])

    render(<MatchesScreen />)
    const sectionButton = await screen.findByText(/Precisa das minhas, mas não têm para mim/)
    expect(sectionButton).toBeInTheDocument()

    expect(screen.queryByText('Carlos Receptor')).not.toBeInTheDocument()

    fireEvent.click(sectionButton)
    expect(await screen.findByText('Carlos Receptor')).toBeInTheDocument()
  })

  it('splits matches correctly across all three sections', async () => {
    mockGetMatches.mockResolvedValue([
      makeMatch({ userId: 'u-mutual', name: 'Ana Mutual', matchScore: 3, reciprocalScore: 2 }),
      makeMatch({ userId: 'u-receive', name: 'Bob Doador', matchScore: 5, reciprocalScore: 0 }),
      makeMatch({ userId: 'u-give', name: 'Carlos Receptor', matchScore: 0, reciprocalScore: 4 }),
    ])

    render(<MatchesScreen />)

    expect(await screen.findByText('Ana Mutual')).toBeInTheDocument()

    expect(screen.queryByText('Bob Doador')).not.toBeInTheDocument()
    expect(screen.queryByText('Carlos Receptor')).not.toBeInTheDocument()

    const receiveSection = screen.getByText(/Têm para mim, mas não precisa das minhas \(1\)/)
    fireEvent.click(receiveSection)
    expect(await screen.findByText('Bob Doador')).toBeInTheDocument()

    const giveSection = screen.getByText(/Precisa das minhas, mas não têm para mim \(1\)/)
    fireEvent.click(giveSection)
    expect(await screen.findByText('Carlos Receptor')).toBeInTheDocument()
  })

  it('does not show collapsible sections when all matches are mutual', async () => {
    mockGetMatches.mockResolvedValue([
      makeMatch({ userId: 'u-1', name: 'Ana', matchScore: 3, reciprocalScore: 2 }),
      makeMatch({ userId: 'u-2', name: 'Bob', matchScore: 1, reciprocalScore: 1 }),
    ])

    render(<MatchesScreen />)
    await screen.findByText('Ana')

    expect(screen.queryByText(/Têm para mim/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Preciso das minhas/)).not.toBeInTheDocument()
  })

  it('collapses section when clicked again', async () => {
    mockGetMatches.mockResolvedValue([
      makeMatch({ userId: 'u-receive', name: 'Bob Doador', matchScore: 5, reciprocalScore: 0 }),
    ])

    render(<MatchesScreen />)
    const sectionButton = await screen.findByText(/Têm para mim/)

    fireEvent.click(sectionButton)
    expect(await screen.findByText('Bob Doador')).toBeInTheDocument()

    fireEvent.click(sectionButton)
    expect(screen.queryByText('Bob Doador')).not.toBeInTheDocument()
  })
})
