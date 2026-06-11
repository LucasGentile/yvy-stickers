import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { searchCommunityDuplicates } from '@/actions/searchCommunityDuplicates'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

function makeInNeqChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockResolvedValue({ data, error: null }),
  }
}

function makeInEqChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data, error: null }),
  }
}

function makeEqChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data, error: null }),
  }
}

type SetupOptions = {
  dupes?: { user_id: string; sticker_id: string; count: number }[]
  users?: { id: string; name: string; apartment: string; tower: string }[]
  pendingAsInitiator?: { initiator_id: string; giving_ids: string[] }[]
  pendingAsReceiver?: { receiver_id: string; receiving_ids: string[] }[]
  purchaseReqs?: { seller_id: string; sticker_ids: string[] }[]
  advancedTrades?: {
    user_a_id: string
    user_b_id: string
    user_c_id: string
    a_gives_ids: string[]
    b_gives_ids: string[]
    c_gives_ids: string[]
  }[]
}

function setupMocks({
  dupes = [],
  users = [],
  pendingAsInitiator = [],
  pendingAsReceiver = [],
  purchaseReqs = [],
  advancedTrades = [],
}: SetupOptions) {
  let pendingTradesCallCount = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'user_duplicates') return makeInNeqChain(dupes)
    if (table === 'users') return makeInEqChain(users)
    if (table === 'pending_trades') {
      pendingTradesCallCount++
      return pendingTradesCallCount === 1
        ? makeInEqChain(pendingAsInitiator)
        : makeInEqChain(pendingAsReceiver)
    }
    if (table === 'purchase_requests') return makeInEqChain(purchaseReqs)
    if (table === 'advanced_trades') return makeEqChain(advancedTrades)
    return makeEqChain([])
  })
}

describe('searchCommunityDuplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // reset pending_trades call count via fresh mock
  })

  it('returns empty when no duplicates found', async () => {
    setupMocks({ dupes: [] })
    const results = await searchCommunityDuplicates('current-user', ['MEX1'])
    expect(results).toEqual([])
  })

  it('returns a user with an available sticker when not reserved', async () => {
    setupMocks({
      dupes: [{ user_id: 'user-b', sticker_id: 'MEX1', count: 2 }],
      users: [{ id: 'user-b', name: 'Bob Silva', apartment: '101', tower: '1' }],
    })
    const results = await searchCommunityDuplicates('current-user', ['MEX1'])
    expect(results).toHaveLength(1)
    expect(results[0].availableStickers).toContain('MEX1')
  })

  it('hides a sticker fully reserved by a pending direct trade (initiator)', async () => {
    setupMocks({
      dupes: [{ user_id: 'user-b', sticker_id: 'MEX1', count: 1 }],
      users: [{ id: 'user-b', name: 'Bob Silva', apartment: '101', tower: '1' }],
      pendingAsInitiator: [{ initiator_id: 'user-b', giving_ids: ['MEX1'] }],
    })
    const results = await searchCommunityDuplicates('current-user', ['MEX1'])
    expect(results).toHaveLength(0)
  })

  it('hides a sticker fully reserved by a pending direct trade (receiver)', async () => {
    setupMocks({
      dupes: [{ user_id: 'user-b', sticker_id: 'MEX1', count: 1 }],
      users: [{ id: 'user-b', name: 'Bob Silva', apartment: '101', tower: '1' }],
      pendingAsReceiver: [{ receiver_id: 'user-b', receiving_ids: ['MEX1'] }],
    })
    const results = await searchCommunityDuplicates('current-user', ['MEX1'])
    expect(results).toHaveLength(0)
  })

  it('hides a sticker fully reserved in a pending advanced trade', async () => {
    setupMocks({
      dupes: [{ user_id: 'user-b', sticker_id: 'MEX1', count: 1 }],
      users: [{ id: 'user-b', name: 'Bob Silva', apartment: '101', tower: '1' }],
      advancedTrades: [
        {
          user_a_id: 'user-b',
          user_b_id: 'user-c',
          user_c_id: 'user-d',
          a_gives_ids: ['MEX1'],
          b_gives_ids: ['BRA1'],
          c_gives_ids: ['ARG1'],
        },
      ],
    })
    const results = await searchCommunityDuplicates('current-user', ['MEX1'])
    expect(results).toHaveLength(0)
  })

  it('still shows sticker when user has more copies than reserved in advanced trade', async () => {
    setupMocks({
      dupes: [{ user_id: 'user-b', sticker_id: 'MEX1', count: 2 }],
      users: [{ id: 'user-b', name: 'Bob Silva', apartment: '101', tower: '1' }],
      advancedTrades: [
        {
          user_a_id: 'user-b',
          user_b_id: 'user-c',
          user_c_id: 'user-d',
          a_gives_ids: ['MEX1'],
          b_gives_ids: ['BRA1'],
          c_gives_ids: ['ARG1'],
        },
      ],
    })
    const results = await searchCommunityDuplicates('current-user', ['MEX1'])
    expect(results).toHaveLength(1)
    expect(results[0].availableStickers).toContain('MEX1')
  })

  it('only reserves stickers for the correct leg in an advanced trade', async () => {
    setupMocks({
      dupes: [
        { user_id: 'user-b', sticker_id: 'MEX1', count: 1 },
        { user_id: 'user-c', sticker_id: 'BRA1', count: 1 },
      ],
      users: [
        { id: 'user-b', name: 'Bob Silva', apartment: '101', tower: '1' },
        { id: 'user-c', name: 'Carol Lima', apartment: '201', tower: '2' },
      ],
      advancedTrades: [
        {
          user_a_id: 'user-b',
          user_b_id: 'user-c',
          user_c_id: 'user-d',
          a_gives_ids: ['MEX1'],
          b_gives_ids: ['BRA1'],
          c_gives_ids: ['ARG1'],
        },
      ],
    })
    // user-b's MEX1 is reserved (they give it) → not available
    // user-c's BRA1 is reserved (they give it) → not available
    const results = await searchCommunityDuplicates('current-user', ['MEX1', 'BRA1'])
    expect(results).toHaveLength(0)
  })
})
