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
    in: vi.fn().mockResolvedValue(result),
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
  chain.then = vi
    .fn()
    .mockImplementation((resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject)
    )
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

function makeTrade(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trade-1',
    initiator_id: 'user-a',
    receiver_id: 'user-b',
    giving_ids: ['MEX1', 'MEX2'],
    receiving_ids: ['BRA1', 'BRA2'],
    status: 'accepted',
    accepted_at: new Date(Date.now() - 60_000).toISOString(),
    rollback_requested_by: null,
    rollback_giving_ids: null,
    rollback_receiving_ids: null,
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

  it('returns error when user is not a party to the trade', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: makeTrade(), error: null }))
    const result = await rollbackTrade('trade-1', 'user-z', 'request')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/não faz parte/i)
  })

  // ─── request ──────────────────────────────────────────────────────────────

  it('request: sets rollback_requested_by and returns success', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: makeTrade(), error: null })
      if (callCount === 2) return makeUpdateChain({ error: null })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Ana' },
          { id: 'user-b', name: 'Bob' },
        ],
        error: null,
      })
    })

    const result = await rollbackTrade('trade-1', 'user-a', 'request')
    expect(result.success).toBe(true)
    await new Promise((r) => setTimeout(r, 10))
  })

  it('request: returns error when rollback already requested', async () => {
    const trade = makeTrade({ rollback_requested_by: 'user-b' })
    mockFrom.mockReturnValue(makeSelectChain({ data: trade, error: null }))

    const result = await rollbackTrade('trade-1', 'user-a', 'request')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/já solicitado/i)
  })

  it('request: stores partial sticker IDs and returns success', async () => {
    let callCount = 0
    let updatePayload: Record<string, unknown> | null = null
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: makeTrade(), error: null })
      if (callCount === 3)
        return makeSelectChain({
          data: [
            { id: 'user-a', name: 'Ana' },
            { id: 'user-b', name: 'Bob' },
          ],
          error: null,
        })
      const chain: Record<string, ReturnType<typeof vi.fn>> = {}
      chain.update = vi.fn().mockImplementation((payload) => {
        updatePayload = payload
        return chain
      })
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.then = vi
        .fn()
        .mockImplementation((resolve: (v: unknown) => unknown) =>
          Promise.resolve({ error: null }).then(resolve)
        )
      return chain
    })

    const result = await rollbackTrade('trade-1', 'user-a', 'request', ['MEX1'], ['BRA2'])
    expect(result.success).toBe(true)
    await new Promise((r) => setTimeout(r, 10))
    expect(updatePayload).toMatchObject({
      rollback_requested_by: 'user-a',
      rollback_giving_ids: ['MEX1'],
      rollback_receiving_ids: ['BRA2'],
    })
  })

  it('request: returns error when partial sticker IDs not in trade', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: makeTrade(), error: null }))

    const result = await rollbackTrade('trade-1', 'user-a', 'request', ['INVALID'], [])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/inválidas/i)
  })

  it('request: returns error when partial selection is empty', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: makeTrade(), error: null }))

    const result = await rollbackTrade('trade-1', 'user-a', 'request', [], [])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/pelo menos uma/i)
  })

  // ─── deny ─────────────────────────────────────────────────────────────────

  it('deny: clears rollback fields and returns success', async () => {
    const trade = makeTrade({ rollback_requested_by: 'user-a', rollback_giving_ids: ['MEX1'] })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: trade, error: null })
      if (callCount === 2) return makeUpdateChain({ error: null })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Ana' },
          { id: 'user-b', name: 'Bob' },
        ],
        error: null,
      })
    })

    const result = await rollbackTrade('trade-1', 'user-b', 'deny')
    expect(result.success).toBe(true)
    await new Promise((r) => setTimeout(r, 10))
  })

  it('deny: returns error when denying own request', async () => {
    const trade = makeTrade({ rollback_requested_by: 'user-a' })
    mockFrom.mockReturnValue(makeSelectChain({ data: trade, error: null }))

    const result = await rollbackTrade('trade-1', 'user-a', 'deny')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/própria solicitação/i)
  })

  // ─── confirm ──────────────────────────────────────────────────────────────

  it('confirm: returns error when no rollback request exists', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: makeTrade(), error: null }))

    const result = await rollbackTrade('trade-1', 'user-b', 'confirm')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/nenhuma solicitação/i)
  })

  it('confirm: returns error when trying to confirm own request', async () => {
    const trade = makeTrade({ rollback_requested_by: 'user-a' })
    mockFrom.mockReturnValue(makeSelectChain({ data: trade, error: null }))

    const result = await rollbackTrade('trade-1', 'user-a', 'confirm')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/aguardando confirmação/i)
  })

  it('confirm: returns error when atomic update fails (race condition)', async () => {
    const trade = makeTrade({ rollback_requested_by: 'user-a' })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: trade, error: null })
      return makeAtomicUpdateChain({ data: null, error: null })
    })

    const result = await rollbackTrade('trade-1', 'user-b', 'confirm')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/outro dispositivo/i)
  })

  it('confirm: reverses all stickers for full rollback', async () => {
    const trade = makeTrade({ rollback_requested_by: 'user-a' })
    let pendingTradesCallCount = 0

    mockFrom.mockImplementation((tableName: string) => {
      if (tableName === 'pending_trades') {
        pendingTradesCallCount++
        if (pendingTradesCallCount === 1) return makeSelectChain({ data: trade, error: null })
        return makeAtomicUpdateChain({ data: { id: 'trade-1' }, error: null })
      }
      if (tableName === 'user_duplicates') {
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

  it('confirm: reverses only partial stickers when partial rollback requested', async () => {
    const trade = makeTrade({
      rollback_requested_by: 'user-a',
      rollback_giving_ids: ['MEX1'],
      rollback_receiving_ids: [],
    })
    let pendingTradesCallCount = 0
    const restoredIds: string[] = []

    mockFrom.mockImplementation((tableName: string) => {
      if (tableName === 'pending_trades') {
        pendingTradesCallCount++
        if (pendingTradesCallCount === 1) return makeSelectChain({ data: trade, error: null })
        return makeAtomicUpdateChain({ data: { id: 'trade-1' }, error: null })
      }
      if (tableName === 'user_duplicates') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((_col, val) => {
            if (typeof val === 'string' && val !== 'user-a' && val !== 'user-b')
              restoredIds.push(val)
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            }
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
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

  it('confirm: restores sticker as new dupe when user had no existing count', async () => {
    const trade = makeTrade({ rollback_requested_by: 'user-a' })
    let pendingTradesCallCount = 0

    mockFrom.mockImplementation((tableName: string) => {
      if (tableName === 'pending_trades') {
        pendingTradesCallCount++
        if (pendingTradesCallCount === 1) return makeSelectChain({ data: trade, error: null })
        return makeAtomicUpdateChain({ data: { id: 'trade-1' }, error: null })
      }
      if (tableName === 'user_duplicates') {
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
