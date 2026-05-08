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
  return {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockResolvedValue(result),
  }
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
      if (callCount === 1) return makeInsertChain({ data: { id: 'trade-123' }, error: null })
      return makeSelectChain({ data: { name: 'Parceiro' }, error: null }) // fire-and-forget name lookup
    })

    const result = await createTradeRequest('user-a', 'user-b', ['MEX1'], ['BRA1'])
    expect(result.success).toBe(true)
    if (result.success) expect(result.tradeId).toBe('trade-123')
  })

  it('returns error on DB failure', async () => {
    const chain = makeInsertChain({ data: null, error: { message: 'db error' } })
    mockFrom.mockReturnValue(chain)

    const result = await createTradeRequest('user-a', 'user-b', ['MEX1'], [])
    expect(result.success).toBe(false)
  })

  it('accepts giving-only or receiving-only trades', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeInsertChain({ data: { id: 'trade-456' }, error: null })
      return makeSelectChain({ data: { name: 'Parceiro' }, error: null })
    })

    const result = await createTradeRequest('user-a', 'user-b', [], ['BRA1'])
    expect(result.success).toBe(true)
  })
})

// ─── getPendingTrades ────────────────────────────────────────────────────────

describe('getPendingTrades', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty when userId is empty', async () => {
    const result = await getPendingTrades('')
    expect(result.received).toEqual([])
    expect(result.sent).toEqual([])
  })

  it('returns empty when no trades exist', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: [], error: null }))
    const result = await getPendingTrades('user-a')
    expect(result.received).toEqual([])
    expect(result.sent).toEqual([])
  })

  it('separates received and sent trades correctly', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // pending_trades query
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
      if (callCount === 1) return makeSelectChain({ data: tradeData, error: null })
      if (callCount === 2) return makeUpdateChain()
      return makeSelectChain({ data: { name: 'Parceiro' }, error: null }) // fire-and-forget name lookup
    })
    mockEffectuate.mockResolvedValue({ success: true })

    const result = await respondToTrade('trade-1', 'user-b', 'accept')
    expect(result.success).toBe(true)
    expect(mockEffectuate).toHaveBeenCalledWith('user-a', 'user-b', ['MEX1'], ['BRA1'])
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
      if (callCount === 2) return makeUpdateChain()
      return makeSelectChain({ data: { name: 'Parceiro' }, error: null }) // fire-and-forget name lookup
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
      if (callCount === 2) return makeUpdateChain()
      return makeSelectChain({ data: { name: 'Parceiro' }, error: null }) // fire-and-forget name lookup
    })

    const result = await respondToTrade('trade-1', 'user-a', 'cancel')
    expect(result.success).toBe(true)
    expect(mockEffectuate).not.toHaveBeenCalled()
  })

  it('returns error and does not update status if effectuateTrade fails on accept', async () => {
    const tradeData = {
      id: 'trade-1',
      initiator_id: 'user-a',
      receiver_id: 'user-b',
      giving_ids: ['MEX1'],
      receiving_ids: ['BRA1'],
      status: 'pending',
    }
    mockFrom.mockReturnValue(makeSelectChain({ data: tradeData, error: null }))
    mockEffectuate.mockResolvedValue({ success: false, error: 'Usuários não encontrados.' })

    const result = await respondToTrade('trade-1', 'user-b', 'accept')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('Usuários não encontrados.')
    // update should NOT have been called (only 1 from() call — the select)
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })
})
