import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/actions/logAction', () => ({
  logAction: vi.fn(),
}))

import { rollbackTrade } from '@/actions/rollbackTrade'
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

function makeAtomicUpdateChain(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  return chain
}

function makeUpdateChain(result: unknown = { error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return chain
}

function makeInsertChain(result: unknown = { error: null }) {
  return {
    insert: vi.fn().mockResolvedValue(result),
  }
}

function makeDeleteChain(result: unknown = { error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockResolvedValue(result)
  return chain
}

// A trade accepted 1 minute ago (within 10-min window)
function makeRecentTrade(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trade-1',
    initiator_id: 'user-a',
    receiver_id: 'user-b',
    giving_ids: ['MEX1'],
    receiving_ids: ['BRA1'],
    status: 'accepted',
    accepted_at: new Date(Date.now() - 60_000).toISOString(), // 1 min ago
    rollback_requested_by: null,
    ...overrides,
  }
}

// ─── rollbackTrade ────────────────────────────────────────────────────────────

describe('rollbackTrade', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when tradeId is empty', async () => {
    const result = await rollbackTrade('', 'user-a', 'request')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/inválidos/i)
  })

  it('returns error when userId is empty', async () => {
    const result = await rollbackTrade('trade-1', '', 'request')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/inválidos/i)
  })

  it('returns error when trade is not found', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: null, error: null }))
    const result = await rollbackTrade('trade-1', 'user-a', 'request')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/não encontrada/i)
  })

  it('returns error when 10-minute window has expired', async () => {
    const expiredTrade = makeRecentTrade({
      accepted_at: new Date(Date.now() - 11 * 60_000).toISOString(), // 11 min ago
    })
    mockFrom.mockReturnValue(makeSelectChain({ data: expiredTrade, error: null }))
    const result = await rollbackTrade('trade-1', 'user-a', 'request')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/prazo/i)
  })

  it('returns error when user is not a party to the trade', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: makeRecentTrade(), error: null }))
    const result = await rollbackTrade('trade-1', 'user-z', 'request')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/não faz parte/i)
  })

  // ─── request ──────────────────────────────────────────────────────────────

  it('request: sets rollback_requested_by and returns success', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: makeRecentTrade(), error: null })
      return makeUpdateChain({ error: null })
    })

    const result = await rollbackTrade('trade-1', 'user-a', 'request')
    expect(result.success).toBe(true)
  })

  it('request: returns error when rollback already requested', async () => {
    const trade = makeRecentTrade({ rollback_requested_by: 'user-b' })
    mockFrom.mockReturnValue(makeSelectChain({ data: trade, error: null }))

    const result = await rollbackTrade('trade-1', 'user-a', 'request')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/já solicitado/i)
  })

  // ─── deny ─────────────────────────────────────────────────────────────────

  it('deny: clears rollback_requested_by and returns success', async () => {
    const trade = makeRecentTrade({ rollback_requested_by: 'user-a' })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: trade, error: null })
      return makeUpdateChain({ error: null })
    })

    const result = await rollbackTrade('trade-1', 'user-b', 'deny')
    expect(result.success).toBe(true)
  })

  it('deny: returns error when denying own request', async () => {
    const trade = makeRecentTrade({ rollback_requested_by: 'user-a' })
    mockFrom.mockReturnValue(makeSelectChain({ data: trade, error: null }))

    const result = await rollbackTrade('trade-1', 'user-a', 'deny')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/própria solicitação/i)
  })

  // ─── confirm ──────────────────────────────────────────────────────────────

  it('confirm: returns error when no rollback request exists', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: makeRecentTrade(), error: null }))

    const result = await rollbackTrade('trade-1', 'user-b', 'confirm')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/nenhuma solicitação/i)
  })

  it('confirm: returns error when trying to confirm own request', async () => {
    const trade = makeRecentTrade({ rollback_requested_by: 'user-a' })
    mockFrom.mockReturnValue(makeSelectChain({ data: trade, error: null }))

    const result = await rollbackTrade('trade-1', 'user-a', 'confirm')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/aguardando confirmação/i)
  })

  it('confirm: returns error when atomic update fails (race condition)', async () => {
    const trade = makeRecentTrade({ rollback_requested_by: 'user-a' })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: trade, error: null })
      // Atomic update returns null — another process already changed status
      return makeAtomicUpdateChain({ data: null, error: null })
    })

    const result = await rollbackTrade('trade-1', 'user-b', 'confirm')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/outro dispositivo/i)
  })

  it('confirm: reverses stickers and returns success', async () => {
    const trade = makeRecentTrade({ rollback_requested_by: 'user-a' })
    let pendingTradesCallCount = 0

    mockFrom.mockImplementation((tableName: string) => {
      if (tableName === 'pending_trades') {
        pendingTradesCallCount++
        if (pendingTradesCallCount === 1) return makeSelectChain({ data: trade, error: null })
        return makeAtomicUpdateChain({ data: { id: 'trade-1' }, error: null })
      }
      if (tableName === 'user_duplicates') {
        // restoreDupe: select returns count=1, then update
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { count: 1 } }),
          update: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ error: null }).then(resolve),
        }
      }
      if (tableName === 'user_stickers') {
        return makeDeleteChain({ error: null })
      }
      // users lookup (fire-and-forget)
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'user-a', name: 'Iniciador' },
            { id: 'user-b', name: 'Receptor' },
          ],
        }),
      }
    })

    const result = await rollbackTrade('trade-1', 'user-b', 'confirm')
    expect(result.success).toBe(true)
  })

  it('confirm: restores sticker as new dupe when user had no existing count', async () => {
    const trade = makeRecentTrade({ rollback_requested_by: 'user-a' })
    let pendingTradesCallCount = 0

    mockFrom.mockImplementation((tableName: string) => {
      if (tableName === 'pending_trades') {
        pendingTradesCallCount++
        if (pendingTradesCallCount === 1) return makeSelectChain({ data: trade, error: null })
        return makeAtomicUpdateChain({ data: { id: 'trade-1' }, error: null })
      }
      if (tableName === 'user_duplicates') {
        // select returns null → should insert
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          ...makeInsertChain({ error: null }),
        }
      }
      if (tableName === 'user_stickers') {
        return makeDeleteChain({ error: null })
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
      }
    })

    const result = await rollbackTrade('trade-1', 'user-b', 'confirm')
    expect(result.success).toBe(true)
  })
})
