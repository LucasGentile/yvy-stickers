import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { getPurchaseRequests, getIncomingPurchaseRequestCount } from '@/actions/getPurchaseRequests'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

// Universal thenable chain — all builder methods return this, then resolves with data
function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const m of ['select', 'eq', 'or', 'order', 'in']) {
    chain[m] = vi.fn().mockReturnThis()
  }
  chain.then = vi
    .fn()
    .mockImplementation((res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve({ data, error }).then(res, rej)
    )
  return chain
}

// Exact-head chain for count queries
function makeCountChain(count: number) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const m of ['select', 'eq']) {
    chain[m] = vi.fn().mockReturnThis()
  }
  chain.then = vi
    .fn()
    .mockImplementation((res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve({ count, error: null }).then(res, rej)
    )
  return chain
}

beforeEach(() => vi.clearAllMocks())

const sellerRow = {
  id: 'req-1',
  buyer_id: 'buyer-1',
  seller_id: 'seller-1',
  sticker_ids: ['BRA5', 'ARG3'],
  status: 'pending',
  message: 'pode buscar no bloco',
  created_at: '2026-06-01T10:00:00Z',
  updated_at: '2026-06-01T10:00:00Z',
}

const buyerRow = {
  id: 'req-2',
  buyer_id: 'seller-1',
  seller_id: 'buyer-1',
  sticker_ids: ['FWC7'],
  status: 'accepted',
  message: null,
  created_at: '2026-06-02T12:00:00Z',
  updated_at: '2026-06-03T08:00:00Z',
}

const usersData = [
  { id: 'buyer-1', name: 'ana souza', apartment: '0801', tower: '1' },
  { id: 'seller-1', name: 'jose lima', apartment: '0302', tower: '2' },
]

describe('getPurchaseRequests', () => {
  it('returns empty without hitting DB when userId is empty', async () => {
    const result = await getPurchaseRequests('')
    expect(result).toEqual({ incoming: [], outgoing: [] })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns empty when DB returns no rows', async () => {
    mockFrom.mockReturnValue(makeChain([]))
    const result = await getPurchaseRequests('user-1')
    expect(result).toEqual({ incoming: [], outgoing: [] })
  })

  it('maps incoming (seller) rows to PurchaseRequest shape', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain([sellerRow]) // incoming (seller_id = user)
      if (callCount === 2) return makeChain([]) // outgoing (buyer_id = user)
      return makeChain(usersData) // users lookup
    })

    const result = await getPurchaseRequests('seller-1')
    expect(result.incoming).toHaveLength(1)
    const r = result.incoming[0]
    expect(r.id).toBe('req-1')
    expect(r.buyerId).toBe('buyer-1')
    expect(r.sellerId).toBe('seller-1')
    expect(r.stickerIds).toEqual(['BRA5', 'ARG3'])
    expect(r.status).toBe('pending')
    expect(r.message).toBe('pode buscar no bloco')
    expect(r.createdAt).toBe('2026-06-01T10:00:00Z')
    // formatName capitalises
    expect(r.buyerName).toMatch(/Ana/)
    expect(r.buyerApartment).toBe('0801')
    expect(r.buyerTower).toBe('1')
  })

  it('maps outgoing (buyer) rows correctly', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain([]) // incoming
      if (callCount === 2) return makeChain([buyerRow]) // outgoing (buyer_id = user)
      return makeChain(usersData)
    })

    const result = await getPurchaseRequests('seller-1')
    expect(result.outgoing).toHaveLength(1)
    const r = result.outgoing[0]
    expect(r.id).toBe('req-2')
    expect(r.status).toBe('accepted')
    expect(r.message).toBeNull()
    expect(r.stickerIds).toEqual(['FWC7'])
    expect(r.sellerName).toMatch(/Ana/) // seller is buyer-1 = ana souza
  })

  it('returns fallback name and empty strings when user is not found in user map', async () => {
    const orphanRow = { ...sellerRow, buyer_id: 'ghost-user' }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain([orphanRow])
      if (callCount === 2) return makeChain([])
      // users lookup — ghost-user is not returned
      return makeChain([{ id: 'seller-1', name: 'jose lima', apartment: '0302', tower: '2' }])
    })

    const result = await getPurchaseRequests('seller-1')
    const r = result.incoming[0]
    expect(r.buyerName).toMatch(/Usuário/)
    expect(r.buyerApartment).toBe('')
    expect(r.buyerTower).toBe('')
  })

  it('handles both incoming and outgoing in the same call', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain([sellerRow]) // incoming
      if (callCount === 2) return makeChain([buyerRow]) // outgoing
      return makeChain(usersData)
    })

    const result = await getPurchaseRequests('seller-1')
    expect(result.incoming).toHaveLength(1)
    expect(result.outgoing).toHaveLength(1)
  })
})

describe('getIncomingPurchaseRequestCount', () => {
  it('returns 0 when userId is empty', async () => {
    const count = await getIncomingPurchaseRequestCount('')
    expect(count).toBe(0)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns the pending count from DB', async () => {
    mockFrom.mockReturnValue(makeCountChain(3))
    const count = await getIncomingPurchaseRequestCount('seller-1')
    expect(count).toBe(3)
  })

  it('returns 0 when count is null (no rows)', async () => {
    // Supabase returns count: null when no rows match
    const chain = makeCountChain(0)
    chain.then = vi
      .fn()
      .mockImplementation((res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve({ count: null, error: null }).then(res, rej)
      )
    mockFrom.mockReturnValue(chain)
    const count = await getIncomingPurchaseRequestCount('seller-1')
    expect(count).toBe(0)
  })
})
