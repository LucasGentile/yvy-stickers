import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { getReservedStickerIds } from '@/actions/getReservedStickerIds'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

// Universal thenable chain — every builder method returns this, resolves with data
function makeChain(data: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const m of ['select', 'eq', 'or', 'in']) {
    chain[m] = vi.fn().mockReturnThis()
  }
  chain.then = vi
    .fn()
    .mockImplementation((res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve({ data, error: null }).then(res, rej)
    )
  return chain
}

// Call order inside Promise.all:
//   1. pending_trades    → .select().or().eq()
//   2. advanced_trades   → .select().or().eq()
//   3. purchase_requests → .select().eq().eq()
function mockAllThree(
  trades: unknown[] = [],
  advancedTrades: unknown[] = [],
  purchaseReqs: unknown[] = []
) {
  let callCount = 0
  mockFrom.mockImplementation(() => {
    callCount++
    if (callCount === 1) return makeChain(trades)
    if (callCount === 2) return makeChain(advancedTrades)
    return makeChain(purchaseReqs)
  })
}

beforeEach(() => vi.clearAllMocks())

describe('getReservedStickerIds', () => {
  it('returns empty object without hitting DB when userId is empty', async () => {
    const result = await getReservedStickerIds('')
    expect(result).toEqual({})
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns empty object when all sources return no data', async () => {
    mockAllThree([], [], [])
    const result = await getReservedStickerIds('user-1')
    expect(result).toEqual({})
  })

  it('counts stickers from pending_trades where user is initiator', async () => {
    mockAllThree(
      [
        {
          initiator_id: 'user-1',
          receiver_id: 'user-2',
          giving_ids: ['BRA5', 'FWC3'],
          receiving_ids: [],
        },
      ],
      [],
      []
    )
    const result = await getReservedStickerIds('user-1')
    expect(result['BRA5']).toBe(1)
    expect(result['FWC3']).toBe(1)
  })

  it('counts stickers from pending_trades where user is receiver', async () => {
    mockAllThree(
      [{ initiator_id: 'user-2', receiver_id: 'user-1', giving_ids: [], receiving_ids: ['ARG3'] }],
      [],
      []
    )
    const result = await getReservedStickerIds('user-1')
    expect(result['ARG3']).toBe(1)
  })

  // ── purchase_requests branch ────────────────────────────────────────────────

  it('counts sticker_ids from pending purchase_requests where user is seller', async () => {
    mockAllThree([], [], [{ sticker_ids: ['BRA5', 'ARG3'] }])
    const result = await getReservedStickerIds('seller-1')
    expect(result['BRA5']).toBe(1)
    expect(result['ARG3']).toBe(1)
  })

  it('counts each purchase_request row independently — two requests reserve two copies', async () => {
    mockAllThree([], [], [{ sticker_ids: ['BRA5'] }, { sticker_ids: ['BRA5'] }])
    const result = await getReservedStickerIds('seller-1')
    expect(result['BRA5']).toBe(2)
  })

  it('accumulates counts from both pending_trades and purchase_requests', async () => {
    mockAllThree(
      [{ initiator_id: 'user-1', receiver_id: 'user-2', giving_ids: ['BRA5'], receiving_ids: [] }],
      [],
      [{ sticker_ids: ['BRA5', 'FWC7'] }]
    )
    const result = await getReservedStickerIds('user-1')
    // BRA5 is reserved once in a trade + once in a purchase request
    expect(result['BRA5']).toBe(2)
    expect(result['FWC7']).toBe(1)
  })

  it('handles null sticker_ids in a purchase_request row gracefully', async () => {
    mockAllThree([], [], [{ sticker_ids: null }])
    const result = await getReservedStickerIds('user-1')
    expect(result).toEqual({})
  })

  it('handles multiple purchase_requests with overlapping stickers', async () => {
    mockAllThree([], [], [{ sticker_ids: ['CC3', 'CC5'] }, { sticker_ids: ['CC5', 'FWC1'] }])
    const result = await getReservedStickerIds('user-1')
    expect(result['CC3']).toBe(1)
    expect(result['CC5']).toBe(2)
    expect(result['FWC1']).toBe(1)
  })
})
