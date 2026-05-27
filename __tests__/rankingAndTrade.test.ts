import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
}))

import { getRanking } from '@/actions/getRanking'
import { getDuplicates } from '@/actions/getDuplicates'
import { effectuateTrade } from '@/actions/effectuateTrade'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ALL_STICKER_IDS } from '@/lib/stickers'

const mockAdminFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>
// ─── getRanking ───────────────────────────────────────────────────────────────

describe('getRanking', () => {
  beforeEach(() => vi.clearAllMocks())

  // Helper: mock the two DB calls getRanking makes:
  //   1. users table (.select().eq()) → approved users
  //   2. get_sticker_counts_by_user RPC → [{ user_id, sticker_count }]
  function mockRanking(
    users: { id: string; name: string; apartment: string; tower: string }[],
    counts: { user_id: string; sticker_count: number }[]
  ) {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: users }),
        }
      }
      // Should not be called — RPC goes through supabaseAdmin.rpc, not .from()
      return { select: vi.fn().mockResolvedValue({ data: [] }) }
    })
    ;(supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: counts })
  }

  it('returns empty array when no approved users', async () => {
    mockRanking([], [])
    const result = await getRanking()
    expect(result).toEqual([])
  })

  it('computes completionPct as sticker count / total', async () => {
    const total = ALL_STICKER_IDS.length
    mockRanking(
      [{ id: 'u1', name: 'Ana', apartment: '101', tower: 'A' }],
      [{ user_id: 'u1', sticker_count: 3 }]
    )

    const result = await getRanking()
    expect(result).toHaveLength(1)
    expect(result[0].ownedCount).toBe(3)
    expect(result[0].totalCount).toBe(total)
    expect(result[0].completionPct).toBe(Math.round((3 / total) * 100))
  })

  it('sorts users by sticker count descending', async () => {
    const total = ALL_STICKER_IDS.length
    mockRanking(
      [
        { id: 'u1', name: 'Ana', apartment: '101', tower: 'A' },
        { id: 'u2', name: 'Bob', apartment: '202', tower: 'B' },
      ],
      [
        { user_id: 'u1', sticker_count: 10 },
        { user_id: 'u2', sticker_count: 50 },
      ]
    )

    const result = await getRanking()
    expect(result[0].id).toBe('u2')
    expect(result[1].id).toBe('u1')
    expect(result[0].ownedCount).toBeGreaterThan(result[1].ownedCount)
    expect(result[0].totalCount).toBe(total)
  })

  it('excludes users with zero sticker rows', async () => {
    const total = ALL_STICKER_IDS.length
    mockRanking(
      [
        { id: 'u1', name: 'Ana', apartment: '101', tower: 'A' },
        { id: 'u2', name: 'Bob', apartment: '202', tower: 'B' },
      ],
      [{ user_id: 'u2', sticker_count: 5 }] // u1 absent from RPC result
    )

    const result = await getRanking()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('u2')
    expect(result[0].ownedCount).toBe(5)
    expect(result[0].totalCount).toBe(total)
  })

  it('breaks ties in sticker count alphabetically by name', async () => {
    mockRanking(
      [
        { id: 'u1', name: 'Zara', apartment: '101', tower: 'A' },
        { id: 'u2', name: 'Ana', apartment: '202', tower: 'B' },
      ],
      [
        { user_id: 'u1', sticker_count: 10 },
        { user_id: 'u2', sticker_count: 10 },
      ]
    )

    const result = await getRanking()
    expect(result[0].name).toBe('Ana')
    expect(result[1].name).toBe('Zara')
  })
})

// ─── getDuplicates ────────────────────────────────────────────────────────────

describe('getDuplicates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when no duplicates exist', async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null }),
    })

    const result = await getDuplicates('user-1')
    expect(result).toEqual([])
  })

  it('maps sticker_id to stickerId', async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { sticker_id: 'MEX1', count: 2 },
          { sticker_id: 'BRA5', count: 1 },
        ],
      }),
    })

    const result = await getDuplicates('user-1')
    expect(result).toEqual([
      { stickerId: 'MEX1', count: 2 },
      { stickerId: 'BRA5', count: 1 },
    ])
  })

  it('queries for the correct user_id', async () => {
    const eqMock = vi.fn().mockReturnThis()
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: eqMock,
      order: vi.fn().mockResolvedValue({ data: [] }),
    })

    await getDuplicates('user-xyz')
    expect(eqMock).toHaveBeenCalledWith('user_id', 'user-xyz')
  })
})

// ─── effectuateTrade ─────────────────────────────────────────────────────────

describe('effectuateTrade', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when no stickers are selected', async () => {
    const result = await effectuateTrade('u1', 'u2', [], [])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/nenhuma/i)
  })

  it('returns error when fewer than 2 users are found', async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [{ id: 'u1', input_mode: 'have' }] }),
    })

    const result = await effectuateTrade('u1', 'u2', ['MEX1'], [])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/usuários/i)
  })

  it('returns success and decrements/adds correctly for have/have modes', async () => {
    // Both legs run in parallel via Promise.all. decrementDupes inner fns start synchronously
    // (inside Array.map) so leg1's user_duplicates select fires before leg2's, giving a
    // deterministic per-table call order: u1/MEX1 select → u2/BRA5 select → u1 update → u2 delete
    // → u1 user_stickers select → u2 user_stickers select → u1 upsert → u2 upsert.
    function makeEqChain(result: unknown) {
      const chain = {
        delete: vi.fn(),
        update: vi.fn(),
        eq: vi.fn(),
        then: (
          resolve: (v: unknown) => unknown,
          reject?: (e: unknown) => unknown
        ): Promise<unknown> => Promise.resolve(result).then(resolve, reject),
      }
      chain.delete.mockReturnValue(chain)
      chain.update.mockReturnValue(chain)
      chain.eq.mockReturnValue(chain)
      return chain
    }

    const tableMocks: Record<string, unknown[]> = {
      users: [
        {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'u1', input_mode: 'have' },
              { id: 'u2', input_mode: 'have' },
            ],
          }),
        },
      ],
      user_duplicates: [
        // idx 0: leg1 decrementDupes — u1/MEX1 select (count=2, will update)
        {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { count: 2 } }),
        },
        // idx 1: leg2 decrementDupes — u2/BRA5 select (count=1, will delete)
        {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { count: 1 } }),
        },
        // idx 2: u1/MEX1 update (count 2→1)
        makeEqChain({ error: null }),
        // idx 3: u2/BRA5 delete
        makeEqChain({ error: null }),
      ],
      user_stickers: [
        // idx 0: leg1 addToCollection — u1 checks BRA5 (not owned)
        {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [] }),
        },
        // idx 1: leg2 addToCollection — u2 checks MEX1 (not owned)
        {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [] }),
        },
        // idx 2: upsert BRA5 for u1
        { upsert: vi.fn().mockResolvedValue({ error: null }) },
        // idx 3: upsert MEX1 for u2
        { upsert: vi.fn().mockResolvedValue({ error: null }) },
      ],
    }

    const tableCallIndex: Record<string, number> = {}
    mockAdminFrom.mockImplementation((table: string) => {
      const idx = tableCallIndex[table] ?? 0
      tableCallIndex[table] = idx + 1
      return tableMocks[table]?.[idx] ?? {}
    })

    const result = await effectuateTrade('u1', 'u2', ['MEX1'], ['BRA5'])
    expect(result.success).toBe(true)
  })

  it('routes received sticker to user_duplicates when receiver already owns it', async () => {
    // givingIds=[], receivingIds=['BRA5']
    // leg1 (u1): decrementDupes([]) → no DB calls; addToCollection(u1,'have',['BRA5']) → BRA5 already owned → incrementDuplicate
    // leg2 (u2): decrementDupes(['BRA5']) → select (data=null, skip); addToCollection([]) → no calls
    // leg2's decrementDupes inner fn fires synchronously before leg1's addToCollection,
    // so user_duplicates call order is: u2/BRA5 select → u1/BRA5 incrementDuplicate select → update
    function makeEqChain(result: unknown) {
      const chain = {
        delete: vi.fn(),
        update: vi.fn(),
        eq: vi.fn(),
        then: (
          resolve: (v: unknown) => unknown,
          reject?: (e: unknown) => unknown
        ): Promise<unknown> => Promise.resolve(result).then(resolve, reject),
      }
      chain.delete.mockReturnValue(chain)
      chain.update.mockReturnValue(chain)
      chain.eq.mockReturnValue(chain)
      return chain
    }

    const tableMocks: Record<string, unknown[]> = {
      users: [
        {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'u1', input_mode: 'have' },
              { id: 'u2', input_mode: 'have' },
            ],
          }),
        },
      ],
      user_duplicates: [
        // idx 0: leg2 decrementDupes — u2/BRA5 select (not found, skip)
        {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        },
        // idx 1: leg1 incrementDuplicate — u1/BRA5 select (count=1 → update to 2)
        {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { count: 1 } }),
        },
        // idx 2: update u1/BRA5 count 1→2
        makeEqChain({ error: null }),
      ],
      user_stickers: [
        // idx 0: leg1 addToCollection — u1 checks BRA5 (already owned)
        {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [{ sticker_id: 'BRA5' }] }),
        },
      ],
    }

    const tableCallIndex: Record<string, number> = {}
    mockAdminFrom.mockImplementation((table: string) => {
      const idx = tableCallIndex[table] ?? 0
      tableCallIndex[table] = idx + 1
      return tableMocks[table]?.[idx] ?? {}
    })

    const result = await effectuateTrade('u1', 'u2', [], ['BRA5'])
    expect(result.success).toBe(true)
  })

  it('uses delete for need mode addToCollection', async () => {
    // givingIds=[], receivingIds=['BRA5'], both users in 'need' mode
    // leg1 (u1): decrementDupes([]) → no DB calls; addToCollection(u1,'need',['BRA5']) → delete from user_stickers
    // leg2 (u2): decrementDupes(['BRA5']) → select (data=null, skip); addToCollection([]) → no calls
    // leg2's decrementDupes inner fn fires synchronously (before any awaits), so user_duplicates
    // call 0 is u2/BRA5 select; user_stickers calls come after from leg1's addToCollection.
    const deleteMock = vi.fn()
    const eqMock = vi.fn()
    const inMock = vi.fn()

    function makeNeedDeleteChain() {
      const chain = { delete: deleteMock, eq: eqMock, in: inMock }
      deleteMock.mockReturnValue(chain)
      eqMock.mockReturnValue(chain)
      inMock.mockResolvedValue({ error: null })
      return chain
    }

    const tableMocks: Record<string, unknown[]> = {
      users: [
        {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'u1', input_mode: 'need' },
              { id: 'u2', input_mode: 'need' },
            ],
          }),
        },
      ],
      user_duplicates: [
        // idx 0: leg2 decrementDupes — u2/BRA5 select (not found, skip)
        {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        },
      ],
      user_stickers: [
        // idx 0: leg1 addToCollection — u1 checks BRA5 (in needs list → stillNeeded)
        {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [{ sticker_id: 'BRA5' }] }),
        },
        // idx 1: delete BRA5 from u1's needs
        makeNeedDeleteChain(),
      ],
    }

    const tableCallIndex: Record<string, number> = {}
    mockAdminFrom.mockImplementation((table: string) => {
      const idx = tableCallIndex[table] ?? 0
      tableCallIndex[table] = idx + 1
      return tableMocks[table]?.[idx] ?? {}
    })

    const result = await effectuateTrade('u1', 'u2', [], ['BRA5'])
    expect(result.success).toBe(true)
    expect(deleteMock).toHaveBeenCalled()
  })
})
