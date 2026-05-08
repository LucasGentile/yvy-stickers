import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { getMatches } from '@/lib/matching'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>
const mockAdminFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

// Chain for: from('users').select(...).eq(...).maybeSingle()
function makeMyUserChain(inputMode: string) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: { input_mode: inputMode }, error: null }),
    }),
  }
}

// Chain for: from('user_stickers' | 'user_duplicates').select(...).eq(...)  → resolves directly
function makeEqChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data, error: null }),
  }
}

// Chain for: from('users').select(...).neq(...).eq('approved', true)  → resolves
function makeOthersChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  }
}

type PendingTradeMock = {
  initiator_id: string
  receiver_id: string
  giving_ids: string[]
  receiving_ids: string[]
}

type SetupOptions = {
  myMode?: string
  myStickers?: { sticker_id: string }[]
  myDupes?: { sticker_id: string; count: number }[]
  others?: {
    id: string
    display_key: string
    phone: string
    input_mode: string
    user_stickers: { sticker_id: string }[]
    user_duplicates: { sticker_id: string; count: number }[]
  }[]
  pendingTrades?: PendingTradeMock[]
}

function setupMocks({
  myMode = 'have',
  myStickers = [],
  myDupes = [],
  others = [],
  pendingTrades = [],
}: SetupOptions) {
  let usersCallCount = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      usersCallCount++
      return usersCallCount === 1 ? makeMyUserChain(myMode) : makeOthersChain(others)
    }
    if (table === 'user_stickers') return makeEqChain(myStickers)
    if (table === 'user_duplicates') return makeEqChain(myDupes)
    return makeEqChain([])
  })

  // Admin mock for pending_trades reservation query
  mockAdminFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: pendingTrades, error: null }),
  })
}

describe('getMatches', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when there are no other users', async () => {
    setupMocks({})
    const results = await getMatches('user-a')
    expect(results).toEqual([])
  })

  it('matchScore = count of other user dupes that I need', async () => {
    // user-a owns MEX1,MEX2 → needs everything else including BRA1,BRA2
    // user-b owns BRA1,BRA2 and has dupes of both → matchScore = 2
    setupMocks({
      myStickers: [{ sticker_id: 'MEX1' }, { sticker_id: 'MEX2' }],
      others: [
        {
          id: 'user-b',
          display_key: 'b-0101-1',
          phone: '11111111111',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'BRA1' }, { sticker_id: 'BRA2' }],
          user_duplicates: [
            { sticker_id: 'BRA1', count: 2 },
            { sticker_id: 'BRA2', count: 1 },
          ],
        },
      ],
    })

    const results = await getMatches('user-a')
    expect(results).toHaveLength(1)
    expect(results[0].matchScore).toBe(2)
    expect(results[0].matchStickers).toEqual(['BRA1', 'BRA2'])
  })

  it('reciprocalScore = count of my dupes that the other user needs', async () => {
    // user-a owns BRA1, has dupe of BRA1; needs MEX1,MEX2,...
    // user-b owns MEX1,MEX2, has dupe of MEX1 → matchScore = 1
    // user-b needs BRA1,... → user-a has dupe of BRA1 → reciprocalScore = 1
    setupMocks({
      myStickers: [{ sticker_id: 'BRA1' }],
      myDupes: [{ sticker_id: 'BRA1', count: 2 }],
      others: [
        {
          id: 'user-b',
          display_key: 'b-0101-1',
          phone: '11111111111',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'MEX1' }, { sticker_id: 'MEX2' }],
          user_duplicates: [{ sticker_id: 'MEX1', count: 1 }],
        },
      ],
    })

    const results = await getMatches('user-a')
    expect(results).toHaveLength(1)
    expect(results[0].matchScore).toBe(1)
    expect(results[0].reciprocalScore).toBe(1)
  })

  it('sorts by matchScore DESC then reciprocalScore DESC', async () => {
    // user-a owns nothing, needs everything
    // user-b has 1 dupe → matchScore 1
    // user-c has 2 dupes → matchScore 2 → should appear first
    setupMocks({
      others: [
        {
          id: 'user-b',
          display_key: 'b-0101-1',
          phone: '1',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'MEX1' }],
          user_duplicates: [{ sticker_id: 'MEX1', count: 1 }],
        },
        {
          id: 'user-c',
          display_key: 'c-0202-2',
          phone: '2',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'MEX1' }, { sticker_id: 'MEX2' }],
          user_duplicates: [
            { sticker_id: 'MEX1', count: 1 },
            { sticker_id: 'MEX2', count: 3 },
          ],
        },
      ],
    })

    const results = await getMatches('user-a')
    expect(results[0].userId).toBe('user-c')
    expect(results[1].userId).toBe('user-b')
  })

  it('still shows users who have no tradeable duplicates', async () => {
    // user-b owns stickers user-a needs but has NO duplicates → matchScore 0, but still shown
    setupMocks({
      myStickers: [{ sticker_id: 'MEX1' }, { sticker_id: 'MEX2' }],
      others: [
        {
          id: 'user-b',
          display_key: 'b-0101-1',
          phone: '1',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'BRA1' }, { sticker_id: 'BRA2' }],
          user_duplicates: [],
        },
      ],
    })

    const results = await getMatches('user-a')
    expect(results).toHaveLength(1)
    expect(results[0].matchScore).toBe(0)
  })

  it('excludes reserved stickers from reciprocalStickers when my dupe is in a pending trade', async () => {
    // user-a has BRA1 dupe but it is reserved in a pending trade (giving to user-c)
    // user-b needs BRA1 → but reciprocalScore should be 0 because BRA1 is reserved
    setupMocks({
      myStickers: [{ sticker_id: 'BRA1' }],
      myDupes: [{ sticker_id: 'BRA1', count: 2 }],
      others: [
        {
          id: 'user-b',
          display_key: 'b-0101-1',
          phone: '1',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'MEX1' }],
          user_duplicates: [],
        },
      ],
      pendingTrades: [
        {
          initiator_id: 'user-a',
          receiver_id: 'user-c',
          giving_ids: ['BRA1'],
          receiving_ids: [],
        },
      ],
    })

    const results = await getMatches('user-a')
    expect(results[0].reciprocalScore).toBe(0)
    expect(results[0].reciprocalStickers).toEqual([])
  })

  it('excludes reserved stickers from matchStickers when their dupe is in a pending trade', async () => {
    // user-a needs BRA1; user-b has BRA1 dupe but it's reserved for another trade
    setupMocks({
      myStickers: [{ sticker_id: 'MEX1' }], // user-a owns MEX1, needs BRA1
      others: [
        {
          id: 'user-b',
          display_key: 'b-0101-1',
          phone: '1',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'BRA1' }],
          user_duplicates: [{ sticker_id: 'BRA1', count: 2 }],
        },
      ],
      pendingTrades: [
        {
          initiator_id: 'user-b',
          receiver_id: 'user-c',
          giving_ids: ['BRA1'],
          receiving_ids: [],
        },
      ],
    })

    const results = await getMatches('user-a')
    expect(results[0].matchScore).toBe(0)
    expect(results[0].matchStickers).toEqual([])
  })

  it('keeps non-reserved dupes available even when some are reserved', async () => {
    // user-a has MEX1 and MEX2 dupes; MEX1 is reserved, MEX2 is free
    // user-b needs both → only MEX2 should appear in reciprocalStickers
    setupMocks({
      myStickers: [{ sticker_id: 'MEX1' }, { sticker_id: 'MEX2' }],
      myDupes: [
        { sticker_id: 'MEX1', count: 2 },
        { sticker_id: 'MEX2', count: 1 },
      ],
      others: [
        {
          id: 'user-b',
          display_key: 'b-0101-1',
          phone: '1',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'BRA1' }],
          user_duplicates: [],
        },
      ],
      pendingTrades: [
        {
          initiator_id: 'user-a',
          receiver_id: 'user-c',
          giving_ids: ['MEX1'],
          receiving_ids: [],
        },
      ],
    })

    const results = await getMatches('user-a')
    expect(results[0].reciprocalStickers).toEqual(['MEX2'])
    expect(results[0].reciprocalScore).toBe(1)
  })
})
