import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { importStickerFile } from '@/actions/importStickerFile'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>
const mockAdminFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

function makeChain(resolveValue: unknown) {
  const chain = {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolveValue).then(resolve),
  }
  chain.select.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  return chain
}

describe('importStickerFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // logAction (fire-and-forget) uses supabaseAdmin — provide a no-op chain
    mockAdminFrom.mockReturnValue(makeChain({ error: null }))
  })

  it('returns error when userId is empty', async () => {
    const result = await importStickerFile('', ['MEX1'], { MEX1: 1 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/usuário/i)
  })

  it('returns error when deleting stickers fails', async () => {
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) {
        // select existing
        return makeChain({ data: [] })
      }
      // delete user_stickers — fails
      return makeChain({ error: { message: 'db error' } })
    })

    const result = await importStickerFile('u1', ['MEX1'], { MEX1: 1 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/álbum/i)
  })

  it('succeeds with no duplicates when all stickers appear once', async () => {
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      // 1: select existing stickers
      if (callIndex === 1) return makeChain({ data: [] })
      // 2: delete user_stickers
      if (callIndex === 2) return makeChain({ error: null })
      // 3: insert user_stickers
      if (callIndex === 3) return makeChain({ error: null })
      // 4: delete user_duplicates
      if (callIndex === 4) return makeChain({ error: null })
      // no insert for duplicates (none)
      return makeChain({ error: null })
    })

    const result = await importStickerFile('u1', ['MEX1', 'MEX2'], { MEX1: 1, MEX2: 1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.totalStickers).toBe(2)
      expect(result.newDuplicates).toBe(0)
      expect(result.totalDuplicateCopies).toBe(0)
      expect(result.failedStickers).toEqual([])
      expect(result.failedDuplicates).toEqual([])
    }
  })

  it('succeeds and computes duplicates when stickers appear more than once', async () => {
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) return makeChain({ data: [] })
      if (callIndex === 2) return makeChain({ error: null }) // delete stickers
      if (callIndex === 3) return makeChain({ error: null }) // insert stickers
      if (callIndex === 4) return makeChain({ error: null }) // delete dupes
      if (callIndex === 5) return makeChain({ error: null }) // insert dupes
      return makeChain({ error: null })
    })

    // MEX1 appears 3 times → 1 in album, 2 duplicates; BRA5 appears 2 times → 1 in album, 1 duplicate
    const result = await importStickerFile('u1', ['MEX1', 'BRA5'], { MEX1: 3, BRA5: 2 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.newDuplicates).toBe(2)
      expect(result.totalDuplicateCopies).toBe(3) // 2 + 1
    }
  })

  it('computes addedToAlbum and removedFromAlbum correctly', async () => {
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      // existing stickers: MEX1 and MEX2
      if (callIndex === 1)
        return makeChain({ data: [{ sticker_id: 'MEX1' }, { sticker_id: 'MEX2' }] })
      if (callIndex === 2) return makeChain({ error: null }) // delete stickers
      if (callIndex === 3) return makeChain({ error: null }) // insert stickers (MEX1, BRA5)
      if (callIndex === 4) return makeChain({ error: null }) // delete dupes
      return makeChain({ error: null })
    })

    // New file has MEX1 (kept) + BRA5 (added); MEX2 was removed
    const result = await importStickerFile('u1', ['MEX1', 'BRA5'], { MEX1: 1, BRA5: 1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.addedToAlbum).toBe(1) // BRA5 is new
      expect(result.removedFromAlbum).toBe(1) // MEX2 removed
    }
  })

  it('falls back to individual inserts and reports failed stickers on bulk failure', async () => {
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) return makeChain({ data: [] }) // select existing
      if (callIndex === 2) return makeChain({ error: null }) // delete stickers
      if (callIndex === 3) return makeChain({ error: { message: 'bulk failed' } }) // bulk insert fails
      // individual inserts: MEX1 succeeds, MEX2 fails
      if (callIndex === 4) return makeChain({ error: null })
      if (callIndex === 5) return makeChain({ error: { message: 'row error' } })
      if (callIndex === 6) return makeChain({ error: null }) // delete dupes
      return makeChain({ error: null })
    })

    const result = await importStickerFile('u1', ['MEX1', 'MEX2'], { MEX1: 1, MEX2: 1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.failedStickers).toContain('MEX2')
      expect(result.failedStickers).not.toContain('MEX1')
    }
  })
})
