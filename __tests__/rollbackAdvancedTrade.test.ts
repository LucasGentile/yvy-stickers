import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/actions/logAction', () => ({
  logAction: vi.fn(),
}))

import { rollbackAdvancedTrade } from '@/actions/rollbackAdvancedTrade'
import { getAdvancedTradeRollbackInfo } from '@/actions/getAdvancedTradeRollbackInfo'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return chain
}

function makeUpdateChain(result: unknown = { error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return chain
}

function makeDeleteChain(result: unknown = { error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockResolvedValue(result)
  return chain
}

function makeTrade(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trade-1',
    status: 'accepted',
    user_a_id: 'user-a',
    user_b_id: 'user-b',
    user_c_id: 'user-c',
    a_gives_ids: ['MEX1'],
    b_gives_ids: ['BRA1'],
    c_gives_ids: ['ARG1'],
    rollback_requested_by: null,
    rollback_requested_at: null,
    rollback_a_status: 'none',
    rollback_b_status: 'none',
    rollback_c_status: 'none',
    ...overrides,
  }
}

// ─── getAdvancedTradeRollbackInfo ────────────────────────────────────────────

describe('getAdvancedTradeRollbackInfo', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns found: false for empty tradeId', async () => {
    const result = await getAdvancedTradeRollbackInfo('', 'user-a')
    expect(result.found).toBe(false)
  })

  it('returns found: false for empty userId', async () => {
    const result = await getAdvancedTradeRollbackInfo('trade-1', '')
    expect(result.found).toBe(false)
  })

  it('returns found: false when trade not found', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: null, error: null }))
    const result = await getAdvancedTradeRollbackInfo('trade-1', 'user-a')
    expect(result.found).toBe(false)
  })

  it('returns alreadyRolledBack: true when status is rolled_back', async () => {
    mockFrom.mockReturnValue(
      makeSelectChain({
        data: { ...makeTrade(), status: 'rolled_back' },
        error: null,
      })
    )
    const result = await getAdvancedTradeRollbackInfo('trade-1', 'user-a')
    expect(result).toEqual({ found: true, alreadyRolledBack: true })
  })

  it('returns found: false when userId is not a participant', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: makeTrade(), error: null }))
    const result = await getAdvancedTradeRollbackInfo('trade-1', 'user-z')
    expect(result.found).toBe(false)
  })

  it('returns rollback info when no rollback is pending', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: makeTrade(), error: null }))
    const result = await getAdvancedTradeRollbackInfo('trade-1', 'user-a')
    expect(result).toEqual({
      found: true,
      alreadyRolledBack: false,
      rollbackRequestedBy: null,
      rollbackRequestedAt: null,
    })
  })

  it('returns rollback info with requestedBy and requestedAt', async () => {
    const requestedAt = '2026-05-10T00:00:00.000Z'
    mockFrom.mockReturnValue(
      makeSelectChain({
        data: makeTrade({
          rollback_requested_by: 'user-a',
          rollback_requested_at: requestedAt,
        }),
        error: null,
      })
    )
    const result = await getAdvancedTradeRollbackInfo('trade-1', 'user-a')
    expect(result).toEqual({
      found: true,
      alreadyRolledBack: false,
      rollbackRequestedBy: 'user-a',
      rollbackRequestedAt: requestedAt,
    })
  })
})

// ─── rollbackAdvancedTrade force ─────────────────────────────────────────────

describe('rollbackAdvancedTrade - force', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when no rollback is pending', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: makeTrade(), error: null }))
    const result = await rollbackAdvancedTrade('trade-1', 'user-a', 'force')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/nenhuma solicitação/i)
  })

  it('returns error when non-requester tries to force', async () => {
    const trade = makeTrade({ rollback_requested_by: 'user-a' })
    mockFrom.mockReturnValue(makeSelectChain({ data: trade, error: null }))
    const result = await rollbackAdvancedTrade('trade-1', 'user-b', 'force')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/apenas quem solicitou/i)
  })

  it('returns error when less than 7 days have passed', async () => {
    const trade = makeTrade({
      rollback_requested_by: 'user-a',
      rollback_requested_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    })
    mockFrom.mockReturnValue(makeSelectChain({ data: trade, error: null }))
    const result = await rollbackAdvancedTrade('trade-1', 'user-a', 'force')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/aguarde 7 dias/i)
  })

  it('succeeds when 7+ days have passed', async () => {
    const trade = makeTrade({
      rollback_requested_by: 'user-a',
      rollback_requested_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    })

    mockFrom.mockImplementation((tableName: string) => {
      if (tableName === 'advanced_trades') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: trade, error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'trade-1' }, error: null }),
                }),
              }),
            }),
          }),
        }
      }
      if (tableName === 'user_duplicates') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (tableName === 'user_stickers') {
        return makeDeleteChain({ error: null })
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'user-a', name: 'Ana' },
            { id: 'user-b', name: 'Bob' },
            { id: 'user-c', name: 'Carol' },
          ],
        }),
      }
    })

    const result = await rollbackAdvancedTrade('trade-1', 'user-a', 'force')
    expect(result.success).toBe(true)
  })

  it('returns error for empty params', async () => {
    const result = await rollbackAdvancedTrade('', 'user-a', 'force')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/inválidos/i)
  })
})
