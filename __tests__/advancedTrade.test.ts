import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/lib/advancedMatching', () => ({
  findBestAdvancedTrade: vi.fn(),
  checkAdvancedTradeEligibility: vi.fn(),
}))

vi.mock('@/actions/effectuateAdvancedTrade', () => ({
  effectuateAdvancedTrade: vi.fn(),
}))

vi.mock('@/actions/logAction', () => ({
  logAction: vi.fn(),
}))

import { findAdvancedTrade } from '@/actions/findAdvancedTrade'
import { respondToAdvancedTrade } from '@/actions/respondToAdvancedTrade'
import { getAdvancedTradeEligibility } from '@/actions/getAdvancedTradeEligibility'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { findBestAdvancedTrade, checkAdvancedTradeEligibility } from '@/lib/advancedMatching'
import { effectuateAdvancedTrade } from '@/actions/effectuateAdvancedTrade'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>
const mockFindBest = findBestAdvancedTrade as ReturnType<typeof vi.fn>
const mockCheckEligibility = checkAdvancedTradeEligibility as ReturnType<typeof vi.fn>
const mockEffectuate = effectuateAdvancedTrade as ReturnType<typeof vi.fn>

// ─── helpers ────────────────────────────────────────────────────────────────

function makeSelectChain(result: { data: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockImplementation(() => chain),
    or: vi.fn().mockImplementation(() => chain),
    eq: vi.fn().mockImplementation(() => chain),
    in: vi.fn().mockImplementation(() => chain),
    limit: vi.fn().mockImplementation(() => chain),
    order: vi.fn().mockImplementation(() => chain),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown): Promise<unknown> =>
      Promise.resolve(result).then(resolve, reject),
  }
  return chain
}

function makeInsertChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn().mockReturnValue({ single })
  const insert = vi.fn().mockReturnValue({ select })
  return { insert, select, single, in: vi.fn().mockResolvedValue(result) }
}

function makeUpdateChain(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  return chain
}

// ─── getAdvancedTradeEligibility ────────────────────────────────────────────

describe('getAdvancedTradeEligibility', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns eligible: false for empty userId', async () => {
    const result = await getAdvancedTradeEligibility('')
    expect(result.eligible).toBe(false)
    expect(result.canSearch).toBe(false)
  })

  it('returns eligible: true and canSearch: true when algorithm finds a cycle', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: [] }))
    mockCheckEligibility.mockResolvedValue(true)
    const result = await getAdvancedTradeEligibility('user-a')
    expect(result.eligible).toBe(true)
    expect(result.canSearch).toBe(true)
  })

  it('returns eligible: false and canSearch: false when no cycle and no active trades', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: [] }))
    mockCheckEligibility.mockResolvedValue(false)
    const result = await getAdvancedTradeEligibility('user-a')
    expect(result.eligible).toBe(false)
    expect(result.canSearch).toBe(false)
  })

  it('returns eligible: true but canSearch: false when user has active trades but no new cycles', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: [{ id: 'trade-1' }] }))
    mockCheckEligibility.mockResolvedValue(false)
    const result = await getAdvancedTradeEligibility('user-a')
    expect(result.eligible).toBe(true)
    expect(result.canSearch).toBe(false)
  })
})

// ─── findAdvancedTrade ──────────────────────────────────────────────────────

describe('findAdvancedTrade', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns found: false for empty userId', async () => {
    const result = await findAdvancedTrade('')
    expect(result.found).toBe(false)
  })

  it('returns found: false when no cycle found', async () => {
    mockFindBest.mockResolvedValue(null)
    const result = await findAdvancedTrade('user-a')
    expect(result.found).toBe(false)
  })

  it('creates trade and returns proposal on success', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeInsertChain({ data: { id: 'new-trade-id' }, error: null }) // insert
      return makeSelectChain({ data: [{ id: 'user-a', name: 'Ana' }, { id: 'user-b', name: 'Bob' }, { id: 'user-c', name: 'Carol' }] }) // names lookup
    })
    mockFindBest.mockResolvedValue({
      userAId: 'user-a',
      userBId: 'user-b',
      userCId: 'user-c',
      aGivesIds: ['MEX1'],
      bGivesIds: ['BRA1'],
      cGivesIds: ['ARG1'],
    })

    const result = await findAdvancedTrade('user-a')
    expect(result.found).toBe(true)
    if (result.found) {
      expect(result.tradeId).toBe('new-trade-id')
      expect(result.proposal.userAId).toBe('user-a')
    }
  })
})

// ─── respondToAdvancedTrade ─────────────────────────────────────────────────

describe('respondToAdvancedTrade', () => {
  beforeEach(() => vi.clearAllMocks())

  const pendingTrade = {
    id: 'trade-1',
    status: 'pending',
    user_a_id: 'user-a',
    user_b_id: 'user-b',
    user_c_id: 'user-c',
    a_gives_ids: ['MEX1'],
    b_gives_ids: ['BRA1'],
    c_gives_ids: ['ARG1'],
    user_a_status: 'approved',
    user_b_status: 'pending',
    user_c_status: 'pending',
  }

  it('returns error for empty tradeId', async () => {
    const result = await respondToAdvancedTrade('', 'user-b', 'approve')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/inválidos/i)
  })

  it('returns error when trade not found', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: null }))
    const result = await respondToAdvancedTrade('trade-1', 'user-b', 'approve')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/não encontrada/i)
  })

  it('returns error when user is not a participant', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: pendingTrade }))
    const result = await respondToAdvancedTrade('trade-1', 'user-z', 'approve')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/não faz parte/i)
  })

  it('returns error when user already responded', async () => {
    mockFrom.mockReturnValue(
      makeSelectChain({ data: { ...pendingTrade, user_a_status: 'approved' } })
    )
    const result = await respondToAdvancedTrade('trade-1', 'user-a', 'approve')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/já respondeu/i)
  })

  it('sets status to rejected when any user rejects', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: pendingTrade })
      if (callCount === 2) return makeUpdateChain({ data: { id: 'trade-1' } })
      return makeSelectChain({ data: [{ id: 'user-a', name: 'Ana' }, { id: 'user-b', name: 'Bob' }, { id: 'user-c', name: 'Carol' }] })
    })

    const result = await respondToAdvancedTrade('trade-1', 'user-b', 'reject')
    expect(result.success).toBe(true)
  })

  it('does NOT effectuate when only 2 of 3 have approved', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: pendingTrade })
      if (callCount === 2) {
        // After B approves: A=approved, B=approved, C=pending
        return makeUpdateChain({
          data: { id: 'trade-1', user_a_status: 'approved', user_b_status: 'approved', user_c_status: 'pending' },
        })
      }
      return makeSelectChain({ data: [{ id: 'user-a', name: 'Ana' }, { id: 'user-b', name: 'Bob' }, { id: 'user-c', name: 'Carol' }] })
    })

    const result = await respondToAdvancedTrade('trade-1', 'user-b', 'approve')
    expect(result.success).toBe(true)
    expect(mockEffectuate).not.toHaveBeenCalled()
  })

  it('effectuates when all 3 approve', async () => {
    const tradeAllPending = {
      ...pendingTrade,
      user_a_status: 'approved',
      user_b_status: 'approved',
      user_c_status: 'pending',
    }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: tradeAllPending })
      if (callCount === 2) {
        return makeUpdateChain({
          data: { id: 'trade-1', user_a_status: 'approved', user_b_status: 'approved', user_c_status: 'approved' },
        })
      }
      // Remaining calls: update status to accepted, name lookups
      return makeUpdateChain({ data: { id: 'trade-1' } })
    })
    mockEffectuate.mockResolvedValue({ success: true })

    const result = await respondToAdvancedTrade('trade-1', 'user-c', 'approve')
    expect(result.success).toBe(true)
    expect(mockEffectuate).toHaveBeenCalledWith(
      'user-a', 'user-b', 'user-c',
      ['MEX1'], ['BRA1'], ['ARG1']
    )
  })

  it('cancels trade when effectuation fails', async () => {
    const tradeAllPending = {
      ...pendingTrade,
      user_a_status: 'approved',
      user_b_status: 'approved',
      user_c_status: 'pending',
    }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: tradeAllPending })
      if (callCount === 2) {
        return makeUpdateChain({
          data: { id: 'trade-1', user_a_status: 'approved', user_b_status: 'approved', user_c_status: 'approved' },
        })
      }
      return makeUpdateChain({ data: { id: 'trade-1' } })
    })
    mockEffectuate.mockResolvedValue({ success: false, error: 'Figurinha(s) não disponível(eis): MEX1' })

    const result = await respondToAdvancedTrade('trade-1', 'user-c', 'approve')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/não disponível/i)
  })

  it('returns error on race condition (atomic guard)', async () => {
    mockFrom.mockImplementation(() => {
      return makeSelectChain({ data: pendingTrade })
    })
    // Second call (update) returns null = race lost
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: pendingTrade })
      return makeUpdateChain({ data: null })
    })

    const result = await respondToAdvancedTrade('trade-1', 'user-b', 'approve')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/outro dispositivo/i)
  })
})
