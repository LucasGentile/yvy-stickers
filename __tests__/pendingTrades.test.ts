import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/actions/effectuateTrade', () => ({
  effectuateTrade: vi.fn(),
}))

vi.mock('@/actions/logAction', () => ({
  logAction: vi.fn(),
}))

import { createTradeRequest } from '@/actions/createTradeRequest'
import { getPendingTrades } from '@/actions/getPendingTrades'
import { respondToTrade } from '@/actions/respondToTrade'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { effectuateTrade } from '@/actions/effectuateTrade'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>
const mockEffectuate = effectuateTrade as ReturnType<typeof vi.fn>

// ─── helpers ────────────────────────────────────────────────────────────────

function makeInsertChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn().mockReturnValue({ single })
  const insert = vi.fn().mockReturnValue({ select })
  return { insert, select, single }
}

function makeSelectChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockResolvedValue(result),
    // Thenable: allows `await chain.select().eq()` without a terminal method
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown): Promise<unknown> =>
      Promise.resolve(result).then(resolve, reject),
  }
  return chain
}

// For the atomic update: .update().eq().eq().select().maybeSingle()
function makeAtomicUpdateChain(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  return chain
}

function makeUpdateChain() {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
}

// ─── createTradeRequest ──────────────────────────────────────────────────────

describe('createTradeRequest', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when initiatorId is empty', async () => {
    const result = await createTradeRequest('', 'user-b', ['MEX1'], [])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/inválidos/i)
  })

  it('returns error when initiator === receiver', async () => {
    const result = await createTradeRequest('user-a', 'user-a', ['MEX1'], [])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/consigo mesmo/i)
  })

  it('returns error when both id arrays are empty', async () => {
    const result = await createTradeRequest('user-a', 'user-b', [], [])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/nenhuma/i)
  })

  it('returns tradeId on success', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: [], error: null }) // initiator: pending_trades
      if (callCount === 2)
        return makeSelectChain({ data: [{ sticker_id: 'MEX1', count: 1 }], error: null }) // initiator: user_duplicates
      if (callCount === 3) return makeSelectChain({ data: [], error: null }) // receiver: pending_trades
      if (callCount === 4)
        return makeSelectChain({ data: [{ sticker_id: 'BRA1', count: 1 }], error: null }) // receiver: user_duplicates
      if (callCount === 5) return makeInsertChain({ data: { id: 'trade-123' }, error: null })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Iniciador' },
          { id: 'user-b', name: 'Receptor' },
        ],
        error: null,
      }) // fire-and-forget name lookup
    })

    const result = await createTradeRequest('user-a', 'user-b', ['MEX1'], ['BRA1'])
    expect(result.success).toBe(true)
    if (result.success) expect(result.tradeId).toBe('trade-123')
  })

  it('returns error on DB failure', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: [], error: null }) // pending_trades
      if (callCount === 2) return makeSelectChain({ data: [], error: null }) // user_duplicates
      return makeInsertChain({ data: null, error: { message: 'db error' } })
    })

    const result = await createTradeRequest('user-a', 'user-b', ['MEX1'], [])
    expect(result.success).toBe(false)
  })

  it('accepts giving-only or receiving-only trades', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      // No givingIds → skip initiator check; receiver check runs first
      if (callCount === 1) return makeSelectChain({ data: [], error: null }) // receiver: pending_trades
      if (callCount === 2)
        return makeSelectChain({ data: [{ sticker_id: 'BRA1', count: 1 }], error: null }) // receiver: user_duplicates
      if (callCount === 3) return makeInsertChain({ data: { id: 'trade-456' }, error: null })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Iniciador' },
          { id: 'user-b', name: 'Receptor' },
        ],
        error: null,
      })
    })

    const result = await createTradeRequest('user-a', 'user-b', [], ['BRA1'])
    expect(result.success).toBe(true)
  })

  it('returns error when giving stickers are already reserved in another pending trade', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1)
        return makeSelectChain({
          data: [{ initiator_id: 'user-a', giving_ids: ['MEX1'], receiving_ids: [] }],
          error: null,
        }) // pending_trades: MEX1 reserved once
      if (callCount === 2)
        return makeSelectChain({
          data: [{ sticker_id: 'MEX1', count: 1 }],
          error: null,
        }) // user_duplicates: MEX1 has count=1 → fully reserved
      return makeInsertChain({ data: null, error: null })
    })

    const result = await createTradeRequest('user-a', 'user-b', ['MEX1', 'BRA1'], [])
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/reservada/i)
      expect(result.error).toContain('MEX1')
    }
  })

  it('returns error when receiver stickers are already reserved in another pending trade', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      // No givingIds → skip initiator check
      if (callCount === 1)
        return makeSelectChain({
          data: [{ initiator_id: 'user-b', giving_ids: ['BRA1'], receiving_ids: [] }],
          error: null,
        }) // receiver: pending_trades — BRA1 reserved once
      if (callCount === 2)
        return makeSelectChain({
          data: [{ sticker_id: 'BRA1', count: 1 }],
          error: null,
        }) // receiver: user_duplicates — BRA1 count=1, fully reserved
      return makeInsertChain({ data: null, error: null })
    })

    const result = await createTradeRequest('user-a', 'user-b', [], ['BRA1'])
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/reservada/i)
      expect(result.error).toContain('BRA1')
    }
  })

  it('allows trade when receiver sticker has more copies than reserved', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      // No givingIds → skip initiator check
      if (callCount === 1)
        return makeSelectChain({
          data: [{ initiator_id: 'user-b', giving_ids: ['BRA1'], receiving_ids: [] }],
          error: null,
        }) // receiver: pending_trades — BRA1 reserved once
      if (callCount === 2)
        return makeSelectChain({
          data: [{ sticker_id: 'BRA1', count: 2 }],
          error: null,
        }) // receiver: user_duplicates — BRA1 count=2, 1 free copy
      if (callCount === 3) return makeInsertChain({ data: { id: 'trade-789' }, error: null })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'A' },
          { id: 'user-b', name: 'B' },
        ],
        error: null,
      })
    })

    const result = await createTradeRequest('user-a', 'user-b', [], ['BRA1'])
    expect(result.success).toBe(true)
  })

  it('allows trade when sticker has more copies than reserved', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1)
        return makeSelectChain({
          data: [{ initiator_id: 'user-a', giving_ids: ['MEX1'], receiving_ids: [] }],
          error: null,
        }) // pending_trades: MEX1 reserved once
      if (callCount === 2)
        return makeSelectChain({
          data: [{ sticker_id: 'MEX1', count: 2 }],
          error: null,
        }) // user_duplicates: MEX1 has count=2 → 1 free copy remaining
      if (callCount === 3) return makeInsertChain({ data: { id: 'trade-789' }, error: null })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'A' },
          { id: 'user-b', name: 'B' },
        ],
        error: null,
      })
    })

    const result = await createTradeRequest('user-a', 'user-b', ['MEX1'], [])
    expect(result.success).toBe(true)
  })
})

// ─── getPendingTrades ────────────────────────────────────────────────────────

// getPendingTrades now makes two parallel queries via Promise.all:
//   call 1: pending_trades (status=pending)
//   call 2: pending_trades (status=accepted, within 10-min window)
//   call 3: users lookup
// We mock by table-call index.

describe('getPendingTrades', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty when userId is empty', async () => {
    const result = await getPendingTrades('')
    expect(result.received).toEqual([])
    expect(result.sent).toEqual([])
    expect(result.recentlyAccepted).toEqual([])
  })

  it('returns empty when no trades exist', async () => {
    // Both parallel queries return empty
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount <= 2) return makeSelectChain({ data: [], error: null })
      return { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [] }) }
    })
    const result = await getPendingTrades('user-a')
    expect(result.received).toEqual([])
    expect(result.sent).toEqual([])
    expect(result.recentlyAccepted).toEqual([])
  })

  it('separates received and sent trades correctly', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // pending_trades (status=pending)
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'trade-1',
                initiator_id: 'user-a',
                receiver_id: 'user-b',
                giving_ids: ['MEX1'],
                receiving_ids: ['BRA1'],
                status: 'pending',
                created_at: '2026-01-01T00:00:00Z',
              },
              {
                id: 'trade-2',
                initiator_id: 'user-c',
                receiver_id: 'user-a',
                giving_ids: ['ARG1'],
                receiving_ids: ['FRA1'],
                status: 'pending',
                created_at: '2026-01-02T00:00:00Z',
              },
            ],
            error: null,
          }),
        }
      }
      if (callCount === 2) {
        // pending_trades (status=accepted, recently accepted)
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      // users query
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'user-b', name: 'Diego Estima', phone: '111' },
            { id: 'user-c', name: 'Lucas Gentile', phone: '222' },
          ],
          error: null,
        }),
      }
    })

    const result = await getPendingTrades('user-a')

    expect(result.sent).toHaveLength(1)
    expect(result.sent[0].id).toBe('trade-1')
    expect(result.sent[0].myGivingIds).toEqual(['MEX1'])
    expect(result.sent[0].myReceivingIds).toEqual(['BRA1'])
    expect(result.sent[0].isSender).toBe(true)

    expect(result.received).toHaveLength(1)
    expect(result.received[0].id).toBe('trade-2')
    // From user-a's perspective: gives FRA1 (what initiator wants), receives ARG1 (what initiator gives)
    expect(result.received[0].myGivingIds).toEqual(['FRA1'])
    expect(result.received[0].myReceivingIds).toEqual(['ARG1'])
    expect(result.received[0].isSender).toBe(false)
  })

  it('returns recentlyAccepted trades within the 10-minute window', async () => {
    const recentAt = new Date(Date.now() - 60_000).toISOString() // 1 min ago
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // pending_trades (status=pending) — empty
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (callCount === 2) {
        // pending_trades (status=accepted, recently accepted)
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'trade-10',
                initiator_id: 'user-a',
                receiver_id: 'user-b',
                giving_ids: ['MEX1'],
                receiving_ids: ['BRA1'],
                accepted_at: recentAt,
                rollback_requested_by: null,
              },
            ],
            error: null,
          }),
        }
      }
      // users query
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ id: 'user-b', name: 'Diego Estima', phone: '111' }],
          error: null,
        }),
      }
    })

    const result = await getPendingTrades('user-a')

    expect(result.recentlyAccepted).toHaveLength(1)
    expect(result.recentlyAccepted[0].id).toBe('trade-10')
    expect(result.recentlyAccepted[0].myGivingIds).toEqual(['MEX1'])
    expect(result.recentlyAccepted[0].myReceivingIds).toEqual(['BRA1'])
    expect(result.recentlyAccepted[0].rollbackRequestedBy).toBeNull()
    expect(result.recentlyAccepted[0].isSender).toBe(true)
  })
})

// ─── respondToTrade ──────────────────────────────────────────────────────────

describe('respondToTrade', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when tradeId is empty', async () => {
    const result = await respondToTrade('', 'user-a', 'accept')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/inválidos/i)
  })

  it('returns error when trade is not found', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: null, error: null }))
    const result = await respondToTrade('trade-1', 'user-a', 'accept')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/não encontrado/i)
  })

  it('returns error when non-initiator tries to cancel', async () => {
    mockFrom.mockReturnValue(
      makeSelectChain({
        data: {
          id: 'trade-1',
          initiator_id: 'user-a',
          receiver_id: 'user-b',
          giving_ids: ['MEX1'],
          receiving_ids: ['BRA1'],
          status: 'pending',
        },
        error: null,
      })
    )
    const result = await respondToTrade('trade-1', 'user-b', 'cancel')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/criou/i)
  })

  it('returns error when non-receiver tries to accept', async () => {
    mockFrom.mockReturnValue(
      makeSelectChain({
        data: {
          id: 'trade-1',
          initiator_id: 'user-a',
          receiver_id: 'user-b',
          giving_ids: ['MEX1'],
          receiving_ids: ['BRA1'],
          status: 'pending',
        },
        error: null,
      })
    )
    const result = await respondToTrade('trade-1', 'user-a', 'accept')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/destinatário/i)
  })

  it('calls effectuateTrade and updates status to accepted when receiver accepts', async () => {
    const tradeData = {
      id: 'trade-1',
      initiator_id: 'user-a',
      receiver_id: 'user-b',
      giving_ids: ['MEX1'],
      receiving_ids: ['BRA1'],
      status: 'pending',
    }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: tradeData, error: null }) // read trade
      if (callCount === 2) return makeAtomicUpdateChain({ data: { id: 'trade-1' }, error: null }) // atomic accept
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Iniciador' },
          { id: 'user-b', name: 'Receptor' },
        ],
        error: null,
      }) // fire-and-forget name lookup
    })
    mockEffectuate.mockResolvedValue({ success: true })

    const result = await respondToTrade('trade-1', 'user-b', 'accept')
    expect(result.success).toBe(true)
    expect(mockEffectuate).toHaveBeenCalledWith('user-a', 'user-b', ['MEX1'], ['BRA1'])
  })

  it('returns error when trade was already processed on another device (atomic guard)', async () => {
    const tradeData = {
      id: 'trade-1',
      initiator_id: 'user-a',
      receiver_id: 'user-b',
      giving_ids: ['MEX1'],
      receiving_ids: ['BRA1'],
      status: 'pending',
    }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: tradeData, error: null }) // read trade
      return makeAtomicUpdateChain({ data: null, error: null }) // atomic update returns null — race lost
    })

    const result = await respondToTrade('trade-1', 'user-b', 'accept')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/outro dispositivo/i)
    expect(mockEffectuate).not.toHaveBeenCalled()
  })

  it('does NOT call effectuateTrade when rejecting', async () => {
    const tradeData = {
      id: 'trade-1',
      initiator_id: 'user-a',
      receiver_id: 'user-b',
      giving_ids: ['MEX1'],
      receiving_ids: ['BRA1'],
      status: 'pending',
    }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: tradeData, error: null })
      if (callCount === 2) return makeAtomicUpdateChain({ data: { id: 'trade-1' }, error: null })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Iniciador' },
          { id: 'user-b', name: 'Receptor' },
        ],
        error: null,
      })
    })

    const result = await respondToTrade('trade-1', 'user-b', 'reject')
    expect(result.success).toBe(true)
    expect(mockEffectuate).not.toHaveBeenCalled()
  })

  it('does NOT call effectuateTrade when cancelling', async () => {
    const tradeData = {
      id: 'trade-1',
      initiator_id: 'user-a',
      receiver_id: 'user-b',
      giving_ids: ['MEX1'],
      receiving_ids: [],
      status: 'pending',
    }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: tradeData, error: null })
      if (callCount === 2) return makeAtomicUpdateChain({ data: { id: 'trade-1' }, error: null })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Iniciador' },
          { id: 'user-b', name: 'Receptor' },
        ],
        error: null,
      })
    })

    const result = await respondToTrade('trade-1', 'user-a', 'cancel')
    expect(result.success).toBe(true)
    expect(mockEffectuate).not.toHaveBeenCalled()
  })

  it('reverts status to pending and returns error if effectuateTrade fails on accept', async () => {
    const tradeData = {
      id: 'trade-1',
      initiator_id: 'user-a',
      receiver_id: 'user-b',
      giving_ids: ['MEX1'],
      receiving_ids: ['BRA1'],
      status: 'pending',
    }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: tradeData, error: null }) // read
      if (callCount === 2) return makeAtomicUpdateChain({ data: { id: 'trade-1' }, error: null }) // accept
      return makeUpdateChain() // revert to pending
    })
    mockEffectuate.mockResolvedValue({ success: false, error: 'Usuários não encontrados.' })

    const result = await respondToTrade('trade-1', 'user-b', 'accept')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('Usuários não encontrados.')
    // Revert update (call 3) must have been made
    expect(mockFrom).toHaveBeenCalledTimes(3)
  })
})
