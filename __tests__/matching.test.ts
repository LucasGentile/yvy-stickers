import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing matching
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { getMatches } from '@/lib/matching'
import { supabase } from '@/lib/supabase'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>

function makeSelectChain(data: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockResolvedValue({ data, error: null }),
  }
  return chain
}

describe('getMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no other users', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_stickers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return makeSelectChain([])
    })

    const results = await getMatches('user-a')
    expect(results).toEqual([])
  })

  it('computes correct matchScore', async () => {
    // user-a owns stickers 1, 2 → missing 3..980
    // user-b owns stickers 3, 4 → user-a needs both → matchScore = 2
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_stickers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ sticker_id: 1 }, { sticker_id: 2 }],
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'user-b',
              display_key: 'b-0101-1',
              phone: '11111111111',
              user_stickers: [{ sticker_id: 3 }, { sticker_id: 4 }],
            },
          ],
          error: null,
        }),
      }
    })

    const results = await getMatches('user-a')
    expect(results[0].matchScore).toBe(2)
  })

  it('computes correct reciprocalScore', async () => {
    // user-a owns 1,2 — user-b missing 1 → reciprocalScore = 1
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_stickers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ sticker_id: 1 }, { sticker_id: 2 }],
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'user-b',
              display_key: 'b-0101-1',
              phone: '11111111111',
              // user-b owns everything except sticker 1
              user_stickers: Array.from({ length: 979 }, (_, i) => ({ sticker_id: i + 2 })),
            },
          ],
          error: null,
        }),
      }
    })

    const results = await getMatches('user-a')
    expect(results[0].reciprocalScore).toBe(1)
  })

  it('sorts by matchScore DESC then reciprocalScore DESC', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_stickers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({
          data: [
            { id: 'b', display_key: 'b-0101-1', phone: '1', user_stickers: [{ sticker_id: 1 }] },
            {
              id: 'c',
              display_key: 'c-0202-2',
              phone: '2',
              user_stickers: [{ sticker_id: 1 }, { sticker_id: 2 }],
            },
          ],
          error: null,
        }),
      }
    })

    // Both b and c own stickers that user-a (owns nothing) needs
    // c has 2 stickers user-a needs, b has 1 → c should be first
    const results = await getMatches('user-a')
    expect(results[0].userId).toBe('c')
    expect(results[1].userId).toBe('b')
  })

  it('filters out users with zero match and zero reciprocal', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_stickers') {
        return {
          select: vi.fn().mockReturnThis(),
          // user-a owns all 980 stickers → missing none
          eq: vi.fn().mockResolvedValue({
            data: Array.from({ length: 980 }, (_, i) => ({ sticker_id: i + 1 })),
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'user-b',
              display_key: 'b-0101-1',
              phone: '1',
              // user-b also owns all 980
              user_stickers: Array.from({ length: 980 }, (_, i) => ({ sticker_id: i + 1 })),
            },
          ],
          error: null,
        }),
      }
    })

    const results = await getMatches('user-a')
    expect(results).toHaveLength(0)
  })
})
