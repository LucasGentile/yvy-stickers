import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { getRanking } from '@/actions/getRanking'
import { getDuplicates } from '@/actions/getDuplicates'
import { effectuateTrade } from '@/actions/effectuateTrade'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { supabase } from '@/lib/supabase'
import { ALL_STICKER_IDS } from '@/lib/stickers'

const mockAdminFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>
const mockFrom = supabase.from as ReturnType<typeof vi.fn>

// ─── getRanking ───────────────────────────────────────────────────────────────

describe('getRanking', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when no approved users', async () => {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [] }),
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [] }) }
    })

    const result = await getRanking()
    expect(result).toEqual([])
  })

  it('computes completionPct correctly in have mode', async () => {
    const total = ALL_STICKER_IDS.length
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'u1', name: 'Ana', apartment: '101', tower: 'A', input_mode: 'have' }],
          }),
        }
      }
      return {
        select: vi.fn().mockResolvedValue({
          data: [{ user_id: 'u1' }, { user_id: 'u1' }, { user_id: 'u1' }],
        }),
      }
    })

    const result = await getRanking()
    expect(result).toHaveLength(1)
    expect(result[0].ownedCount).toBe(3)
    expect(result[0].totalCount).toBe(total)
    expect(result[0].completionPct).toBe(Math.round((3 / total) * 100))
  })

  it('computes completionPct correctly in need mode (inverts count)', async () => {
    const total = ALL_STICKER_IDS.length
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'u1', name: 'Bob', apartment: '202', tower: 'B', input_mode: 'need' }],
          }),
        }
      }
      // 5 stickers in user_stickers → user "needs" 5 → owns total-5
      return {
        select: vi.fn().mockResolvedValue({
          data: Array.from({ length: 5 }, () => ({ user_id: 'u1' })),
        }),
      }
    })

    const result = await getRanking()
    expect(result[0].ownedCount).toBe(total - 5)
  })

  it('sorts users by completionPct descending', async () => {
    const total = ALL_STICKER_IDS.length
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [
              { id: 'u1', name: 'Ana', apartment: '101', tower: 'A', input_mode: 'have' },
              { id: 'u2', name: 'Bob', apartment: '202', tower: 'B', input_mode: 'have' },
            ],
          }),
        }
      }
      // u1 has 10 stickers, u2 has 50
      return {
        select: vi.fn().mockResolvedValue({
          data: [
            ...Array.from({ length: 10 }, () => ({ user_id: 'u1' })),
            ...Array.from({ length: 50 }, () => ({ user_id: 'u2' })),
          ],
        }),
      }
    })

    const result = await getRanking()
    expect(result[0].id).toBe('u2')
    expect(result[1].id).toBe('u1')
    expect(result[0].completionPct).toBeGreaterThan(result[1].completionPct)
    expect(result[0].totalCount).toBe(total)
  })
})

// ─── getDuplicates ────────────────────────────────────────────────────────────

describe('getDuplicates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when no duplicates exist', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null }),
    })

    const result = await getDuplicates('user-1')
    expect(result).toEqual([])
  })

  it('maps sticker_id to stickerId', async () => {
    mockFrom.mockReturnValue({
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
    mockFrom.mockReturnValue({
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
    // Calls:
    // 0. users query (in)
    // 1. decrementDupes u1 giving MEX1 — select+maybeSingle
    // 2. update count (count=2 → 1) — needs chained .eq().eq()
    // 3. addToCollection u1 receiving BRA5 — upsert
    // 4. decrementDupes u2 giving BRA5 — select+maybeSingle (count=1 → delete)
    // 5. delete — needs chained .eq().eq()
    // 6. addToCollection u2 receiving MEX1 — upsert
    let callIndex = 0

    function makeMultiEqChain(result: unknown) {
      const chain: any = {
        delete: vi.fn(),
        update: vi.fn(),
        eq: vi.fn(),
        then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject),
      }
      chain.delete.mockReturnValue(chain)
      chain.update.mockReturnValue(chain)
      chain.eq.mockReturnValue(chain)
      return chain
    }

    mockAdminFrom.mockImplementation(() => {
      const call = callIndex++

      if (call === 0) {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'u1', input_mode: 'have' },
              { id: 'u2', input_mode: 'have' },
            ],
          }),
        }
      }
      if (call === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { count: 2 } }),
        }
      }
      if (call === 2) return makeMultiEqChain({ error: null }) // update chain
      if (call === 3) return { upsert: vi.fn().mockResolvedValue({ error: null }) }
      if (call === 4) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { count: 1 } }),
        }
      }
      if (call === 5) return makeMultiEqChain({ error: null }) // delete chain
      return { upsert: vi.fn().mockResolvedValue({ error: null }) }
    })

    const result = await effectuateTrade('u1', 'u2', ['MEX1'], ['BRA5'])
    expect(result.success).toBe(true)
  })

  it('uses delete for need mode addToCollection', async () => {
    // effectuateTrade('u1', 'u2', givingIds=[], receivingIds=['BRA5'])
    // u1: no giving → no decrementDupes; receives BRA5 (need mode → delete from user_stickers)
    // u2: gives BRA5 → decrementDupes; receives nothing (givingIds=[])
    // Calls:
    // 0. users query
    // 1. addToCollection u1 receiving BRA5 (need → .delete().eq().in())
    // 2. decrementDupes u2 giving BRA5 — select+maybeSingle (data=null → skip)
    // (no call for addToCollection u2 since receivingIds=[] → length===0 → early return)
    let callIndex = 0
    const deleteMock = vi.fn()
    const eqMock = vi.fn()
    const inMock = vi.fn()

    function makeNeedDeleteChain() {
      const chain: any = { delete: deleteMock, eq: eqMock, in: inMock }
      deleteMock.mockReturnValue(chain)
      eqMock.mockReturnValue(chain)
      inMock.mockResolvedValue({ error: null })
      return chain
    }

    mockAdminFrom.mockImplementation(() => {
      const call = callIndex++

      if (call === 0) {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'u1', input_mode: 'need' },
              { id: 'u2', input_mode: 'need' },
            ],
          }),
        }
      }

      if (call === 1) {
        // addToCollection u1 (need mode → delete)
        return makeNeedDeleteChain()
      }

      if (call === 2) {
        // decrementDupes u2 giving BRA5 — not found, skips
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }
      }

      return makeNeedDeleteChain()
    })

    const result = await effectuateTrade('u1', 'u2', [], ['BRA5'])
    expect(result.success).toBe(true)
    expect(deleteMock).toHaveBeenCalled()
  })
})
