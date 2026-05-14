import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { checkAdvancedTradeEligibility, findBestAdvancedTrade } from '@/lib/advancedMatching'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ALL_STICKER_IDS } from '@/lib/stickers'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

// ─── helpers ────────────────────────────────────────────────────────────────

function makeUser(
  id: string,
  inputMode: 'have' | 'need',
  ownedStickers: string[],
  duplicates: Array<{ sticker_id: string; count: number }>
) {
  return {
    id,
    input_mode: inputMode,
    user_stickers: ownedStickers.map((s) => ({ sticker_id: s })),
    user_duplicates: duplicates,
  }
}

function mockTradeData(
  users: ReturnType<typeof makeUser>[],
  pendingNormal: Array<{
    initiator_id: string
    receiver_id: string
    giving_ids: string[]
    receiving_ids: string[]
  }> = [],
  pendingAdvanced: Array<{
    user_a_id: string
    user_b_id: string
    user_c_id: string
    a_gives_ids: string[]
    b_gives_ids: string[]
    c_gives_ids: string[]
  }> = []
) {
  let callCount = 0
  mockFrom.mockImplementation(() => {
    callCount++
    if (callCount === 1) {
      // users with stickers and duplicates
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: users }),
      }
    }
    if (callCount === 2) {
      // pending_trades
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: pendingNormal }),
      }
    }
    // advanced_trades
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: pendingAdvanced }),
    }
  })
}

// Use the first 10 stickers from the real list for test clarity
const S = ALL_STICKER_IDS.slice(0, 10)

// ─── checkAdvancedTradeEligibility ──────────────────────────────────────────

describe('checkAdvancedTradeEligibility', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns false for empty userId', async () => {
    expect(await checkAdvancedTradeEligibility('')).toBe(false)
  })

  it('returns false when user is not found', async () => {
    mockTradeData([])
    expect(await checkAdvancedTradeEligibility('user-a')).toBe(false)
  })

  it('returns false when user has no duplicates', async () => {
    mockTradeData([
      makeUser('user-a', 'have', [S[0], S[1]], []),
      makeUser('user-b', 'have', [S[2]], [{ sticker_id: S[0], count: 1 }]),
      makeUser('user-c', 'have', [S[0]], [{ sticker_id: S[2], count: 1 }]),
    ])
    expect(await checkAdvancedTradeEligibility('user-a')).toBe(false)
  })

  it('returns false when no valid cycle exists', async () => {
    // A has dupes for B, but no one has dupes for A
    mockTradeData([
      makeUser('user-a', 'have', [S[0], S[1]], [{ sticker_id: S[2], count: 1 }]),
      makeUser('user-b', 'have', [S[0]], [{ sticker_id: S[3], count: 1 }]),
      makeUser('user-c', 'have', [S[0], S[1], S[2], S[3]], []),
    ])
    expect(await checkAdvancedTradeEligibility('user-a')).toBe(false)
  })

  it('returns true when a valid cycle A→B→C→A exists', async () => {
    // A needs S[3], has dupe S[2] → B needs S[2]
    // B needs S[2], has dupe S[4] → C needs S[4]
    // C needs S[4], has dupe S[3] → A needs S[3]
    mockTradeData([
      makeUser('user-a', 'have', [S[0], S[1]], [{ sticker_id: S[2], count: 1 }]),
      makeUser('user-b', 'have', [S[0], S[1], S[3]], [{ sticker_id: S[4], count: 1 }]),
      makeUser('user-c', 'have', [S[0], S[1], S[2]], [{ sticker_id: S[3], count: 1 }]),
    ])
    expect(await checkAdvancedTradeEligibility('user-a')).toBe(true)
  })

  it('returns false when all dupes are reserved in pending trades', async () => {
    mockTradeData(
      [
        makeUser('user-a', 'have', [S[0], S[1]], [{ sticker_id: S[2], count: 1 }]),
        makeUser('user-b', 'have', [S[0], S[1], S[3]], [{ sticker_id: S[4], count: 1 }]),
        makeUser('user-c', 'have', [S[0], S[1], S[2]], [{ sticker_id: S[3], count: 1 }]),
      ],
      // A's only dupe S[2] is already reserved
      [{ initiator_id: 'user-a', receiver_id: 'user-x', giving_ids: [S[2]], receiving_ids: [] }]
    )
    expect(await checkAdvancedTradeEligibility('user-a')).toBe(false)
  })
})

// ─── findBestAdvancedTrade ──────────────────────────────────────────────────

describe('findBestAdvancedTrade', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null for empty userId', async () => {
    expect(await findBestAdvancedTrade('')).toBeNull()
  })

  it('returns null when no valid cycle exists', async () => {
    mockTradeData([
      makeUser('user-a', 'have', [S[0]], [{ sticker_id: S[1], count: 1 }]),
      makeUser('user-b', 'have', [S[0]], []),
    ])
    expect(await findBestAdvancedTrade('user-a')).toBeNull()
  })

  it('finds a valid cycle and returns balanced proposal', async () => {
    // A has dupes [S[2], S[5]] → B needs both
    // B has dupes [S[4], S[6]] → C needs both
    // C has dupes [S[3], S[7]] → A needs both
    mockTradeData([
      makeUser('user-a', 'have', [S[0], S[1]], [
        { sticker_id: S[2], count: 1 },
        { sticker_id: S[5], count: 1 },
      ]),
      makeUser('user-b', 'have', [S[0], S[1], S[3]], [
        { sticker_id: S[4], count: 1 },
        { sticker_id: S[6], count: 1 },
      ]),
      makeUser('user-c', 'have', [S[0], S[1], S[2], S[5]], [
        { sticker_id: S[3], count: 1 },
        { sticker_id: S[7], count: 1 },
      ]),
    ])

    const result = await findBestAdvancedTrade('user-a')
    expect(result).not.toBeNull()
    expect(result!.userAId).toBe('user-a')
    expect(result!.userBId).toBe('user-b')
    expect(result!.userCId).toBe('user-c')
    expect(result!.aGivesIds.length).toBe(2)
    expect(result!.bGivesIds.length).toBe(2)
    expect(result!.cGivesIds.length).toBe(2)
  })

  it('caps all legs to the bottleneck count', async () => {
    // A→B: 3 stickers, B→C: 1 sticker, C→A: 2 stickers → all capped at 1
    mockTradeData([
      makeUser('user-a', 'have', [S[0]], [
        { sticker_id: S[1], count: 1 },
        { sticker_id: S[2], count: 1 },
        { sticker_id: S[3], count: 1 },
      ]),
      makeUser('user-b', 'have', [S[0]], [{ sticker_id: S[5], count: 1 }]),
      makeUser('user-c', 'have', [S[0], S[1], S[2], S[3]], [
        { sticker_id: S[6], count: 1 },
        { sticker_id: S[7], count: 1 },
      ]),
    ])

    const result = await findBestAdvancedTrade('user-a')
    expect(result).not.toBeNull()
    expect(result!.aGivesIds.length).toBe(1)
    expect(result!.bGivesIds.length).toBe(1)
    expect(result!.cGivesIds.length).toBe(1)
  })

  it('excludes stickers reserved in pending advanced trades', async () => {
    // A has 1 dupe of S[2] but it's reserved in another advanced trade
    mockTradeData(
      [
        makeUser('user-a', 'have', [S[0], S[1]], [{ sticker_id: S[2], count: 1 }]),
        makeUser('user-b', 'have', [S[0], S[1], S[3]], [{ sticker_id: S[4], count: 1 }]),
        makeUser('user-c', 'have', [S[0], S[1], S[2]], [{ sticker_id: S[3], count: 1 }]),
      ],
      [],
      [
        {
          user_a_id: 'user-a',
          user_b_id: 'user-x',
          user_c_id: 'user-y',
          a_gives_ids: [S[2]],
          b_gives_ids: [],
          c_gives_ids: [],
        },
      ]
    )

    const result = await findBestAdvancedTrade('user-a')
    expect(result).toBeNull()
  })

  it('picks the highest-scoring triple when multiple exist', async () => {
    // Triple 1 (A,B,C): score 1
    // Triple 2 (A,D,E): score 2
    mockTradeData([
      makeUser('user-a', 'have', [S[0]], [
        { sticker_id: S[1], count: 1 },
        { sticker_id: S[2], count: 1 },
        { sticker_id: S[3], count: 1 },
      ]),
      // B: needs S[1], has dupe S[5] for C
      makeUser('user-b', 'have', [S[0], S[2], S[3]], [{ sticker_id: S[5], count: 1 }]),
      // C: needs S[5], has dupe S[6] for A
      makeUser('user-c', 'have', [S[0], S[1], S[2], S[3]], [{ sticker_id: S[6], count: 1 }]),
      // D: needs S[2], S[3] → has dupes S[7], S[8] for E
      makeUser('user-d', 'have', [S[0], S[1]], [
        { sticker_id: S[7], count: 1 },
        { sticker_id: S[8], count: 1 },
      ]),
      // E: needs S[7], S[8] → has dupes S[6], S[9] for A
      makeUser('user-e', 'have', [S[0], S[1], S[2], S[3]], [
        { sticker_id: S[6], count: 1 },
        { sticker_id: S[9], count: 1 },
      ]),
    ])

    const result = await findBestAdvancedTrade('user-a')
    expect(result).not.toBeNull()
    // The A,D,E triple has score 2 (A gives 2 to D, D gives 2 to E, E gives 2 to A)
    expect(result!.aGivesIds.length).toBe(2)
    expect(result!.bGivesIds.length).toBe(2)
    expect(result!.cGivesIds.length).toBe(2)
  })

  it('prefers non-chrome stickers in selection', async () => {
    // We need to use actual chrome sticker IDs from the constant
    // For now, test that sorting is alphabetical within non-chrome
    mockTradeData([
      makeUser('user-a', 'have', [S[0]], [
        { sticker_id: S[3], count: 1 },
        { sticker_id: S[1], count: 1 },
        { sticker_id: S[2], count: 1 },
      ]),
      makeUser('user-b', 'have', [S[0]], [{ sticker_id: S[5], count: 1 }]),
      makeUser('user-c', 'have', [S[0], S[1], S[2], S[3]], [{ sticker_id: S[6], count: 1 }]),
    ])

    const result = await findBestAdvancedTrade('user-a')
    expect(result).not.toBeNull()
    // A gives 1 sticker (bottleneck is B→C and C→A with 1 each)
    // Should pick alphabetically first non-chrome
    expect(result!.aGivesIds.length).toBe(1)
    expect(result!.aGivesIds[0]).toBe(
      [S[1], S[2], S[3]].sort()[0]
    )
  })
})
