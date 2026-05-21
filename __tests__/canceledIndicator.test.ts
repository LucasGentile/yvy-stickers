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

function makeMyUserChain(inputMode: string) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: { input_mode: inputMode }, error: null }),
    }),
  }
}

function makeEqChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data, error: null }),
  }
}

function makeOthersChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  }
}

type CanceledTrade = {
  initiator_id: string
  receiver_id: string
  giving_ids: string[]
  receiving_ids: string[]
}

function setupMocks({
  myStickers = [] as { sticker_id: string }[],
  myDupes = [] as { sticker_id: string; count: number }[],
  others = [] as {
    id: string
    display_key: string
    name: string
    apartment: string
    tower: string
    phone: string
    input_mode: string
    user_stickers: { sticker_id: string }[]
    user_duplicates: { sticker_id: string; count: number }[]
  }[],
  pendingTrades = [] as {
    id: string
    initiator_id: string
    receiver_id: string
    giving_ids: string[]
    receiving_ids: string[]
  }[],
  canceledTrades = [] as CanceledTrade[],
}) {
  let usersCallCount = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      usersCallCount++
      return usersCallCount === 1 ? makeMyUserChain('have') : makeOthersChain(others)
    }
    if (table === 'user_stickers') return makeEqChain(myStickers)
    if (table === 'user_duplicates') return makeEqChain(myDupes)
    return makeEqChain([])
  })

  let adminCallCount = 0
  mockAdminFrom.mockImplementation(() => {
    adminCallCount++
    if (adminCallCount === 1) {
      // pending_trades (status = 'pending')
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: pendingTrades, error: null }),
      }
    }
    if (adminCallCount === 2) {
      // advanced_trades (status = 'pending')
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    }
    // canceled pending_trades
    return {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: canceledTrades, error: null }),
      }),
    }
  })
}

describe('getMatches — canceledTrades details', () => {
  beforeEach(() => vi.clearAllMocks())

  it('includes canceled trade details when a trade with this partner was previously canceled', async () => {
    setupMocks({
      myStickers: [{ sticker_id: 'MEX1' }],
      myDupes: [{ sticker_id: 'MEX1', count: 2 }],
      others: [
        {
          id: 'user-b',
          display_key: 'b',
          name: 'Bob Silva',
          apartment: '101',
          tower: 'A',
          phone: '5599999',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'BRA1' }],
          user_duplicates: [{ sticker_id: 'BRA1', count: 2 }],
        },
      ],
      canceledTrades: [
        {
          initiator_id: 'user-a',
          receiver_id: 'user-b',
          giving_ids: ['MEX1'],
          receiving_ids: ['BRA1'],
        },
      ],
    })

    const results = await getMatches('user-a')
    expect(results).toHaveLength(1)
    expect(results[0].canceledTrades).toHaveLength(1)
    expect(results[0].canceledTrades[0]).toEqual({ giving: ['MEX1'], receiving: ['BRA1'] })
  })

  it('normalizes sticker perspective when current user was the receiver', async () => {
    setupMocks({
      myStickers: [{ sticker_id: 'MEX1' }],
      myDupes: [{ sticker_id: 'MEX1', count: 2 }],
      others: [
        {
          id: 'user-b',
          display_key: 'b',
          name: 'Bob Silva',
          apartment: '101',
          tower: 'A',
          phone: '5599999',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'BRA1' }],
          user_duplicates: [{ sticker_id: 'BRA1', count: 2 }],
        },
      ],
      canceledTrades: [
        {
          initiator_id: 'user-b',
          receiver_id: 'user-a',
          giving_ids: ['BRA1'],
          receiving_ids: ['MEX1'],
        },
      ],
    })

    const results = await getMatches('user-a')
    expect(results).toHaveLength(1)
    expect(results[0].canceledTrades).toHaveLength(1)
    expect(results[0].canceledTrades[0]).toEqual({ giving: ['MEX1'], receiving: ['BRA1'] })
  })

  it('returns empty canceledTrades array when no prior canceled trade exists', async () => {
    setupMocks({
      myStickers: [{ sticker_id: 'MEX1' }],
      myDupes: [{ sticker_id: 'MEX1', count: 2 }],
      others: [
        {
          id: 'user-b',
          display_key: 'b',
          name: 'Bob Silva',
          apartment: '101',
          tower: 'A',
          phone: '5599999',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'BRA1' }],
          user_duplicates: [{ sticker_id: 'BRA1', count: 2 }],
        },
      ],
      canceledTrades: [],
    })

    const results = await getMatches('user-a')
    expect(results).toHaveLength(1)
    expect(results[0].canceledTrades).toHaveLength(0)
  })

  it('only attaches canceled trades to the correct partner', async () => {
    setupMocks({
      myStickers: [{ sticker_id: 'MEX1' }],
      myDupes: [{ sticker_id: 'MEX1', count: 3 }],
      others: [
        {
          id: 'user-b',
          display_key: 'b',
          name: 'Bob Silva',
          apartment: '101',
          tower: 'A',
          phone: '5599999',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'BRA1' }],
          user_duplicates: [{ sticker_id: 'BRA1', count: 2 }],
        },
        {
          id: 'user-c',
          display_key: 'c',
          name: 'Carlos Lima',
          apartment: '201',
          tower: 'B',
          phone: '5588888',
          input_mode: 'have',
          user_stickers: [{ sticker_id: 'ARG1' }],
          user_duplicates: [{ sticker_id: 'ARG1', count: 2 }],
        },
      ],
      canceledTrades: [
        {
          initiator_id: 'user-a',
          receiver_id: 'user-b',
          giving_ids: ['MEX1'],
          receiving_ids: ['BRA1'],
        },
      ],
    })

    const results = await getMatches('user-a')
    expect(results).toHaveLength(2)
    const bob = results.find((r) => r.userId === 'user-b')!
    const carlos = results.find((r) => r.userId === 'user-c')!
    expect(bob.canceledTrades).toHaveLength(1)
    expect(carlos.canceledTrades).toHaveLength(0)
  })
})
