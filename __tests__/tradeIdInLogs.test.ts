import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/actions/effectuateTrade', () => ({
  effectuateTrade: vi.fn(),
}))

vi.mock('@/actions/effectuateAdvancedTrade', () => ({
  effectuateAdvancedTrade: vi.fn(),
}))

vi.mock('@/actions/logAction', () => ({
  logAction: vi.fn(),
}))

import { createTradeRequest } from '@/actions/createTradeRequest'
import { respondToTrade } from '@/actions/respondToTrade'
import { rollbackTrade } from '@/actions/rollbackTrade'
import { respondToAdvancedTrade } from '@/actions/respondToAdvancedTrade'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { effectuateTrade } from '@/actions/effectuateTrade'
import { effectuateAdvancedTrade } from '@/actions/effectuateAdvancedTrade'
import { logAction } from '@/actions/logAction'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>
const mockEffectuate = effectuateTrade as ReturnType<typeof vi.fn>
const mockEffectuateAdvanced = effectuateAdvancedTrade as ReturnType<typeof vi.fn>
const mockLogAction = logAction as ReturnType<typeof vi.fn>

// ─── helpers ────────────────────────────────────────────────────────────────

function makeSelectChain(result: { data: unknown; error?: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockResolvedValue(result),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown): Promise<unknown> =>
      Promise.resolve(result).then(resolve, reject),
  }
  return chain
}

function makeInsertChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn().mockReturnValue({ single })
  const insert = vi.fn().mockReturnValue({ select })
  return { insert, select, single }
}

function makeAtomicUpdateChain(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  return chain
}

// ─── createTradeRequest: tradeId in logs ────────────────────────────────────

describe('createTradeRequest logs include tradeId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes the created trade id to logAction metadata', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: { trades_blocked: false }, error: null }) // receiver trades_blocked check
      if (callCount === 2) return makeSelectChain({ data: [], error: null }) // initiator pending_trades
      if (callCount === 3)
        return makeSelectChain({ data: [{ sticker_id: 'MEX1', count: 1 }], error: null }) // initiator dupes
      if (callCount === 4) return makeSelectChain({ data: [], error: null }) // initiator advanced_trades
      if (callCount === 5) return makeSelectChain({ data: [], error: null }) // receiver pending_trades
      if (callCount === 6)
        return makeSelectChain({ data: [{ sticker_id: 'BRA1', count: 1 }], error: null }) // receiver dupes
      if (callCount === 7) return makeSelectChain({ data: [], error: null }) // receiver advanced_trades
      if (callCount === 8) return makeInsertChain({ data: { id: 'trade-new-123' }, error: null })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Ana' },
          { id: 'user-b', name: 'Bob' },
        ],
        error: null,
      })
    })

    const result = await createTradeRequest('user-a', 'user-b', ['MEX1'], ['BRA1'])
    expect(result.success).toBe(true)

    // Allow fire-and-forget promise to resolve
    await new Promise((r) => setTimeout(r, 10))

    // logAction should be called with tradeId in metadata for both parties
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-a',
      'trade_sent',
      expect.objectContaining({ tradeId: 'trade-new-123' })
    )
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-b',
      'trade_received',
      expect.objectContaining({ tradeId: 'trade-new-123' })
    )
  })
})

// ─── respondToTrade: tradeId in logs ────────────────────────────────────────

describe('respondToTrade logs include tradeId', () => {
  beforeEach(() => vi.clearAllMocks())

  const tradeData = {
    id: 'trade-resp-456',
    initiator_id: 'user-a',
    receiver_id: 'user-b',
    giving_ids: ['MEX1'],
    receiving_ids: ['BRA1'],
    status: 'pending',
  }

  it('includes tradeId on accept', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: tradeData, error: null })
      if (callCount === 2)
        return makeAtomicUpdateChain({ data: { id: 'trade-resp-456' }, error: null })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Ana' },
          { id: 'user-b', name: 'Bob' },
        ],
        error: null,
      })
    })
    mockEffectuate.mockResolvedValue({ success: true })

    const result = await respondToTrade('trade-resp-456', 'user-b', 'accept')
    expect(result.success).toBe(true)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockLogAction).toHaveBeenCalledWith(
      'user-b',
      'trade_accepted',
      expect.objectContaining({ tradeId: 'trade-resp-456' })
    )
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-a',
      'trade_accepted',
      expect.objectContaining({ tradeId: 'trade-resp-456' })
    )
  })

  it('includes tradeId on reject', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: tradeData, error: null })
      if (callCount === 2)
        return makeAtomicUpdateChain({ data: { id: 'trade-resp-456' }, error: null })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Ana' },
          { id: 'user-b', name: 'Bob' },
        ],
        error: null,
      })
    })

    const result = await respondToTrade('trade-resp-456', 'user-b', 'reject')
    expect(result.success).toBe(true)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockLogAction).toHaveBeenCalledWith(
      'user-b',
      'trade_rejected',
      expect.objectContaining({ tradeId: 'trade-resp-456' })
    )
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-a',
      'trade_rejected',
      expect.objectContaining({ tradeId: 'trade-resp-456' })
    )
  })

  it('includes tradeId on cancel', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: tradeData, error: null })
      if (callCount === 2)
        return makeAtomicUpdateChain({ data: { id: 'trade-resp-456' }, error: null })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Ana' },
          { id: 'user-b', name: 'Bob' },
        ],
        error: null,
      })
    })

    const result = await respondToTrade('trade-resp-456', 'user-a', 'cancel')
    expect(result.success).toBe(true)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockLogAction).toHaveBeenCalledWith(
      'user-a',
      'trade_cancelled',
      expect.objectContaining({ tradeId: 'trade-resp-456' })
    )
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-b',
      'trade_cancelled',
      expect.objectContaining({ tradeId: 'trade-resp-456' })
    )
  })
})

// ─── rollbackTrade: tradeId in logs ─────────────────────────────────────────

describe('rollbackTrade logs include tradeId', () => {
  beforeEach(() => vi.clearAllMocks())

  const acceptedTrade = {
    id: 'trade-rb-789',
    initiator_id: 'user-a',
    receiver_id: 'user-b',
    giving_ids: ['MEX1'],
    receiving_ids: ['BRA1'],
    status: 'accepted',
    accepted_at: new Date(Date.now() - 60_000).toISOString(),
    rollback_requested_by: null,
    rollback_giving_ids: null,
    rollback_receiving_ids: null,
  }

  it('includes tradeId on rollback request', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: acceptedTrade, error: null }),
        }
      }
      if (callCount === 2) {
        // update chain
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.update = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockReturnValue(chain)
        chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) =>
          Promise.resolve({ error: null }).then(resolve))
        return chain
      }
      // user lookup
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'user-a', name: 'Ana' },
            { id: 'user-b', name: 'Bob' },
          ],
        }),
      }
    })

    const result = await rollbackTrade('trade-rb-789', 'user-a', 'request')
    expect(result.success).toBe(true)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockLogAction).toHaveBeenCalledWith(
      'user-a',
      'trade_rollback_requested',
      expect.objectContaining({ tradeId: 'trade-rb-789' })
    )
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-b',
      'trade_rollback_requested',
      expect.objectContaining({ tradeId: 'trade-rb-789' })
    )
  })

  it('includes tradeId on rollback confirm', async () => {
    const tradeWithRequest = { ...acceptedTrade, rollback_requested_by: 'user-a' }
    let ptCallCount = 0

    mockFrom.mockImplementation((tableName: string) => {
      if (tableName === 'pending_trades') {
        ptCallCount++
        if (ptCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: tradeWithRequest, error: null }),
          }
        }
        // atomic update for status transition
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.update = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockReturnValue(chain)
        chain.select = vi.fn().mockReturnValue(chain)
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'trade-rb-789' }, error: null })
        return chain
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
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.delete = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockReturnValue(chain)
        chain.in = vi.fn().mockResolvedValue({ error: null })
        return chain
      }
      // users lookup
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'user-a', name: 'Ana' },
            { id: 'user-b', name: 'Bob' },
          ],
        }),
      }
    })

    const result = await rollbackTrade('trade-rb-789', 'user-b', 'confirm')
    expect(result.success).toBe(true)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockLogAction).toHaveBeenCalledWith(
      'user-a',
      'trade_rolled_back',
      expect.objectContaining({ tradeId: 'trade-rb-789' })
    )
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-b',
      'trade_rolled_back',
      expect.objectContaining({ tradeId: 'trade-rb-789' })
    )
  })

  it('includes tradeId on rollback deny', async () => {
    const tradeWithRequest = { ...acceptedTrade, rollback_requested_by: 'user-a' }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: tradeWithRequest, error: null }),
        }
      }
      if (callCount === 2) {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.update = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockReturnValue(chain)
        chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) =>
          Promise.resolve({ error: null }).then(resolve))
        return chain
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'user-a', name: 'Ana' },
            { id: 'user-b', name: 'Bob' },
          ],
        }),
      }
    })

    const result = await rollbackTrade('trade-rb-789', 'user-b', 'deny')
    expect(result.success).toBe(true)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockLogAction).toHaveBeenCalledWith(
      'user-a',
      'trade_rollback_denied',
      expect.objectContaining({ tradeId: 'trade-rb-789' })
    )
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-b',
      'trade_rollback_denied',
      expect.objectContaining({ tradeId: 'trade-rb-789' })
    )
  })
})

// ─── respondToAdvancedTrade: final approver always logs approval ─────────────

describe('respondToAdvancedTrade: final approver logs approval', () => {
  beforeEach(() => vi.clearAllMocks())

  const pendingTrade = {
    id: 'adv-trade-1',
    status: 'pending',
    user_a_id: 'user-a',
    user_b_id: 'user-b',
    user_c_id: 'user-c',
    a_gives_ids: ['MEX1'],
    b_gives_ids: ['BRA1'],
    c_gives_ids: ['ARG1'],
    user_a_status: 'approved',
    user_b_status: 'approved',
    user_c_status: 'pending',
    requested_by: 'user-a',
  }

  it('logs approval for all participants when final approver triggers execution', async () => {
    let callCount = 0
    mockFrom.mockImplementation((tableName: string) => {
      callCount++
      if (tableName === 'advanced_trades') {
        if (callCount === 1) return makeSelectChain({ data: pendingTrade })
        // Update calls for the advanced_trades table (approve + mark accepted)
        return makeAtomicUpdateChain({
          data: {
            id: 'adv-trade-1',
            user_a_status: 'approved',
            user_b_status: 'approved',
            user_c_status: 'approved',
          },
        })
      }
      // 'users' table for name lookups (fire-and-forget)
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
    mockEffectuateAdvanced.mockResolvedValue({ success: true })

    const result = await respondToAdvancedTrade('adv-trade-1', 'user-c', 'approve')
    expect(result.success).toBe(true)

    await new Promise((r) => setTimeout(r, 50))

    // The approval log must fire even when this approver is the final one
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-a',
      'advanced_trade_approved',
      expect.objectContaining({ tradeId: 'adv-trade-1', approvedBy: expect.any(String) })
    )
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-b',
      'advanced_trade_approved',
      expect.objectContaining({ tradeId: 'adv-trade-1', approvedBy: expect.any(String) })
    )
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-c',
      'advanced_trade_approved',
      expect.objectContaining({ tradeId: 'adv-trade-1', isSelf: true })
    )
  })

  it('logs approval for non-final approver (2 of 3)', async () => {
    const tradeOnePending = {
      ...pendingTrade,
      user_a_status: 'approved',
      user_b_status: 'pending',
      user_c_status: 'pending',
    }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: tradeOnePending })
      if (callCount === 2) {
        return makeAtomicUpdateChain({
          data: {
            id: 'adv-trade-1',
            user_a_status: 'approved',
            user_b_status: 'approved',
            user_c_status: 'pending',
          },
        })
      }
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Ana' },
          { id: 'user-b', name: 'Bob' },
          { id: 'user-c', name: 'Carol' },
        ],
      })
    })

    const result = await respondToAdvancedTrade('adv-trade-1', 'user-b', 'approve')
    expect(result.success).toBe(true)
    expect(mockEffectuateAdvanced).not.toHaveBeenCalled()

    await new Promise((r) => setTimeout(r, 10))

    // Approval should still be logged
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-b',
      'advanced_trade_approved',
      expect.objectContaining({ tradeId: 'adv-trade-1', isSelf: true })
    )
    expect(mockLogAction).toHaveBeenCalledWith(
      'user-a',
      'advanced_trade_approved',
      expect.objectContaining({ tradeId: 'adv-trade-1', isSelf: false })
    )
  })

  it('includes tradeId in all advanced trade log actions', async () => {
    // Test cancel action includes tradeId
    const tradeForCancel = { ...pendingTrade, requested_by: 'user-a' }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain({ data: tradeForCancel })
      if (callCount === 2) return makeAtomicUpdateChain({ data: { id: 'adv-trade-1' } })
      return makeSelectChain({
        data: [
          { id: 'user-a', name: 'Ana' },
          { id: 'user-b', name: 'Bob' },
          { id: 'user-c', name: 'Carol' },
        ],
      })
    })

    const result = await respondToAdvancedTrade('adv-trade-1', 'user-a', 'cancel')
    expect(result.success).toBe(true)

    await new Promise((r) => setTimeout(r, 10))

    // All cancellation logs should include tradeId
    const cancelCalls = mockLogAction.mock.calls.filter(
      (args: unknown[]) => args[1] === 'advanced_trade_cancelled'
    )
    expect(cancelCalls.length).toBe(3)
    for (const [, , metadata] of cancelCalls) {
      expect(metadata.tradeId).toBe('adv-trade-1')
    }
  })
})
