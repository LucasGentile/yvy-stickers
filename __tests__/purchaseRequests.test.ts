import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/actions/logAction', () => ({
  logAction: vi.fn(),
}))

vi.mock('@/actions/tradeOps', () => ({
  decrementDupes: vi.fn().mockResolvedValue(undefined),
  addToCollection: vi.fn().mockResolvedValue(undefined),
}))

import { createPurchaseRequest } from '@/actions/createPurchaseRequest'
import { respondToPurchaseRequest } from '@/actions/respondToPurchaseRequest'
import { searchCommunityDuplicates } from '@/actions/searchCommunityDuplicates'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { decrementDupes, addToCollection } from '@/actions/tradeOps'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>
const mockDecrement = decrementDupes as ReturnType<typeof vi.fn>
const mockAddToCollection = addToCollection as ReturnType<typeof vi.fn>

// ─── chain helpers ───────────────────────────────────────────────────────────

function makeChain(resolved: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const methods = [
    'select',
    'eq',
    'neq',
    'in',
    'or',
    'order',
    'maybeSingle',
    'single',
    'insert',
    'update',
    'upsert',
  ]
  for (const m of methods) chain[m] = vi.fn().mockReturnThis()
  chain.maybeSingle = vi.fn().mockResolvedValue(resolved)
  chain.single = vi.fn().mockResolvedValue(resolved)
  chain.then = vi
    .fn()
    .mockImplementation((res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(resolved).then(res, rej)
    )
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDecrement.mockResolvedValue(undefined)
  mockAddToCollection.mockResolvedValue(undefined)
})

// ─── createPurchaseRequest ────────────────────────────────────────────────────

describe('createPurchaseRequest', () => {
  it('returns error when buyerId is empty', async () => {
    const result = await createPurchaseRequest('', { sellerId: 'seller-1', stickerIds: ['BRA5'] })
    expect(result.success).toBe(false)
  })

  it('returns error when sellerId equals buyerId', async () => {
    const result = await createPurchaseRequest('user-1', {
      sellerId: 'user-1',
      stickerIds: ['BRA5'],
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('si mesmo')
  })

  it('returns error when stickerIds is empty', async () => {
    const result = await createPurchaseRequest('buyer-1', { sellerId: 'seller-1', stickerIds: [] })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('figurinha')
  })

  it('returns error when a pending request already exists for same buyer+seller', async () => {
    // maybeSingle returns an existing row
    mockFrom.mockReturnValue(makeChain({ data: { id: 'existing-id' }, error: null }))
    const result = await createPurchaseRequest('buyer-1', {
      sellerId: 'seller-1',
      stickerIds: ['BRA5'],
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('pendente')
  })

  it('happy path — inserts and returns requestId', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // maybeSingle for existing check → no existing
        return makeChain({ data: null, error: null })
      }
      if (callCount === 2) {
        // insert → single
        const chain = makeChain({ data: { id: 'new-req-id' }, error: null })
        chain.insert = vi.fn().mockReturnThis()
        chain.select = vi.fn().mockReturnThis()
        return chain
      }
      // users lookup for logAction (fire-and-forget) — don't care
      return makeChain({ data: [], error: null })
    })

    const result = await createPurchaseRequest('buyer-1', {
      sellerId: 'seller-2',
      stickerIds: ['BRA5', 'ARG3'],
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.requestId).toBe('new-req-id')
  })
})

// ─── respondToPurchaseRequest ─────────────────────────────────────────────────

describe('respondToPurchaseRequest', () => {
  const pendingReq = {
    id: 'req-1',
    buyer_id: 'buyer-1',
    seller_id: 'seller-1',
    sticker_ids: ['BRA5', 'ARG3'],
    status: 'pending',
  }

  function setupReqFetch(req: typeof pendingReq | null) {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: req, error: null }) // maybeSingle for req
      // subsequent calls: users lookup or update — return safe defaults
      const chain = makeChain({
        data: [
          { id: 'seller-1', input_mode: 'have', name: 'Alice' },
          { id: 'buyer-1', input_mode: 'have', name: 'Bob' },
        ],
        error: null,
      })
      chain.update = vi.fn().mockReturnThis()
      return chain
    })
  }

  it('returns error when requestId is empty', async () => {
    const result = await respondToPurchaseRequest('user-1', { requestId: '', action: 'accept' })
    expect(result.success).toBe(false)
  })

  it('returns error when request not found', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    const result = await respondToPurchaseRequest('seller-1', {
      requestId: 'missing',
      action: 'accept',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('não encontrado')
  })

  it('returns error when buyer tries to accept', async () => {
    setupReqFetch(pendingReq)
    const result = await respondToPurchaseRequest('buyer-1', {
      requestId: 'req-1',
      action: 'accept',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('vendedor')
  })

  it('returns error when seller tries to cancel', async () => {
    setupReqFetch(pendingReq)
    const result = await respondToPurchaseRequest('seller-1', {
      requestId: 'req-1',
      action: 'cancel',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('fez o pedido')
  })

  it('accept — calls decrementDupes and addToCollection', async () => {
    setupReqFetch(pendingReq)
    const result = await respondToPurchaseRequest('seller-1', {
      requestId: 'req-1',
      action: 'accept',
    })
    expect(result.success).toBe(true)
    expect(mockDecrement).toHaveBeenCalledWith('seller-1', ['BRA5', 'ARG3'])
    expect(mockAddToCollection).toHaveBeenCalledWith('buyer-1', 'have', ['BRA5', 'ARG3'])
  })

  it('reject — does not call decrementDupes or addToCollection', async () => {
    setupReqFetch(pendingReq)
    const result = await respondToPurchaseRequest('seller-1', {
      requestId: 'req-1',
      action: 'reject',
    })
    expect(result.success).toBe(true)
    expect(mockDecrement).not.toHaveBeenCalled()
    expect(mockAddToCollection).not.toHaveBeenCalled()
  })

  it('cancel — buyer can cancel, does not call decrementDupes', async () => {
    setupReqFetch(pendingReq)
    const result = await respondToPurchaseRequest('buyer-1', {
      requestId: 'req-1',
      action: 'cancel',
    })
    expect(result.success).toBe(true)
    expect(mockDecrement).not.toHaveBeenCalled()
  })
})

// ─── searchCommunityDuplicates ────────────────────────────────────────────────

describe('searchCommunityDuplicates', () => {
  it('returns empty when codes list is empty', async () => {
    const result = await searchCommunityDuplicates('user-1', [])
    expect(result).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns empty when no users have matching dupes', async () => {
    // user_duplicates → empty
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }))
    const result = await searchCommunityDuplicates('user-1', ['BRA5', 'ARG3'])
    expect(result).toEqual([])
  })

  it('returns matching user with available stickers', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // user_duplicates
        return makeChain({
          data: [
            { user_id: 'seller-1', sticker_id: 'BRA5', count: 2 },
            { user_id: 'seller-1', sticker_id: 'ARG3', count: 1 },
          ],
          error: null,
        })
      }
      if (callCount === 2) {
        // users info
        return makeChain({
          data: [{ id: 'seller-1', name: 'alice silva', apartment: '0801', tower: '1' }],
          error: null,
        })
      }
      // trades/purchase_requests → empty (no reservations)
      return makeChain({ data: [], error: null })
    })

    const result = await searchCommunityDuplicates('user-1', ['BRA5', 'ARG3'])
    expect(result).toHaveLength(1)
    expect(result[0].userId).toBe('seller-1')
    expect(result[0].availableStickers).toEqual(expect.arrayContaining(['BRA5', 'ARG3']))
  })

  it('excludes stickers fully reserved in pending_trades', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // user_duplicates: seller has 1 copy of BRA5
        return makeChain({
          data: [{ user_id: 'seller-1', sticker_id: 'BRA5', count: 1 }],
          error: null,
        })
      }
      if (callCount === 2) {
        // users info
        return makeChain({
          data: [{ id: 'seller-1', name: 'alice', apartment: '0801', tower: '1' }],
          error: null,
        })
      }
      if (callCount === 3) {
        // tradesAsInitiator: BRA5 is reserved as giving
        return makeChain({
          data: [{ initiator_id: 'seller-1', giving_ids: ['BRA5'] }],
          error: null,
        })
      }
      // tradesAsReceiver + purchaseReqs → empty
      return makeChain({ data: [], error: null })
    })

    const result = await searchCommunityDuplicates('user-1', ['BRA5'])
    // count=1, reserved=1 → available=0 → user excluded
    expect(result).toHaveLength(0)
  })

  it('excludes stickers fully reserved in pending purchase_requests', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // user_duplicates: seller has 1 copy of ARG3
        return makeChain({
          data: [{ user_id: 'seller-1', sticker_id: 'ARG3', count: 1 }],
          error: null,
        })
      }
      if (callCount === 2) {
        // users info
        return makeChain({
          data: [{ id: 'seller-1', name: 'alice', apartment: '0801', tower: '1' }],
          error: null,
        })
      }
      if (callCount === 3) return makeChain({ data: [], error: null }) // tradesAsInitiator
      if (callCount === 4) return makeChain({ data: [], error: null }) // tradesAsReceiver
      if (callCount === 5) {
        // purchaseReqs: ARG3 reserved
        return makeChain({
          data: [{ seller_id: 'seller-1', sticker_ids: ['ARG3'] }],
          error: null,
        })
      }
      return makeChain({ data: [], error: null })
    })

    const result = await searchCommunityDuplicates('user-1', ['ARG3'])
    expect(result).toHaveLength(0)
  })

  it('excludes the current user from results', async () => {
    // user_duplicates query uses .neq('user_id', currentUserId) — mock returns empty
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }))
    const result = await searchCommunityDuplicates('user-1', ['BRA5'])
    expect(result).toHaveLength(0)
  })
})
