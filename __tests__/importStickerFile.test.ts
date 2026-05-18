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
    upsert: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolveValue).then(resolve),
  }
  chain.select.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.upsert.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  return chain
}

describe('importStickerFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdminFrom.mockReturnValue(makeChain({ error: null }))
  })

  it('returns error when userId is empty', async () => {
    const result = await importStickerFile('', ['MEX1'], { MEX1: 1 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/usuário/i)
  })

  it('adds only new stickers — never removes existing album stickers', async () => {
    // User already has MEX1 and MEX2 in album.
    // File contains MEX1 (overlap) + BRA5 (new). MEX2 is NOT in file.
    // Expected: BRA5 added, MEX2 KEPT (not removed), MEX1 overlap → +1 duplicate.
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1)
        return makeChain({ data: [{ sticker_id: 'MEX1' }, { sticker_id: 'MEX2' }] }) // existing stickers
      if (callIndex === 2) return makeChain({ data: [] }) // existing dupes
      if (callIndex === 3) return makeChain({ error: null }) // insert new stickers (BRA5)
      return makeChain({ error: null }) // upsert dupes
    })

    const result = await importStickerFile('u1', ['MEX1', 'BRA5'], { MEX1: 1, BRA5: 1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.addedToAlbum).toBe(1) // only BRA5
      expect(result.removedFromAlbum).toBe(0) // MEX2 NOT removed
    }
  })

  it('overlap sticker (in file + already in album) generates +1 duplicate', async () => {
    // MEX1 in album + MEX1 in file (once) → MEX1 stays in album, gains 1 duplicate
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) return makeChain({ data: [{ sticker_id: 'MEX1' }] }) // existing stickers
      if (callIndex === 2) return makeChain({ data: [] }) // existing dupes
      if (callIndex === 3) return makeChain({ error: null }) // insert new stickers (none)
      return makeChain({ error: null }) // upsert dupes
    })

    const result = await importStickerFile('u1', ['MEX1'], { MEX1: 1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.addedToAlbum).toBe(0) // MEX1 already in album
      expect(result.newDuplicates).toBe(1) // MEX1 becomes 1 duplicate
      expect(result.totalDuplicateCopies).toBe(1)
    }
  })

  it('merges new duplicates with pre-existing duplicate counts', async () => {
    // MEX1 already in album + already has 3 duplicates.
    // File contains MEX1 once → overlap adds +1.
    // Expected: MEX1 duplicate count becomes 4.
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) return makeChain({ data: [{ sticker_id: 'MEX1' }] }) // existing stickers
      if (callIndex === 2) return makeChain({ data: [{ sticker_id: 'MEX1', count: 3 }] }) // existing dupes
      if (callIndex === 3) return makeChain({ error: null }) // insert new stickers (none)
      return makeChain({ error: null }) // upsert dupes
    })

    const result = await importStickerFile('u1', ['MEX1'], { MEX1: 1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.newDuplicates).toBe(1) // 1 sticker code updated
      expect(result.totalDuplicateCopies).toBe(1) // +1 new copy added
    }
  })

  it('multi-occurrence sticker in file generates count-1 duplicates', async () => {
    // No existing stickers. File has MEX1×3, BRA5×2.
    // MEX1 → 1 in album + 2 duplicates; BRA5 → 1 in album + 1 duplicate.
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) return makeChain({ data: [] }) // no existing stickers
      if (callIndex === 2) return makeChain({ data: [] }) // no existing dupes
      if (callIndex === 3) return makeChain({ error: null }) // insert stickers
      return makeChain({ error: null }) // upsert dupes
    })

    const result = await importStickerFile('u1', ['MEX1', 'BRA5'], { MEX1: 3, BRA5: 2 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.addedToAlbum).toBe(2)
      expect(result.newDuplicates).toBe(2) // 2 sticker codes got duplicates
      expect(result.totalDuplicateCopies).toBe(3) // 2 + 1
    }
  })

  it('totalLines equals sum of all counts (unique + extra copies)', async () => {
    // MEX1×3 + BRA5×2 = 5 lines, 2 unique IDs
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) return makeChain({ data: [] })
      if (callIndex === 2) return makeChain({ data: [] })
      if (callIndex === 3) return makeChain({ error: null })
      return makeChain({ error: null })
    })

    const result = await importStickerFile('u1', ['MEX1', 'BRA5'], { MEX1: 3, BRA5: 2 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.totalStickers).toBe(2) // 2 unique IDs
      expect(result.totalDuplicateCopies).toBe(3) // 5 lines - 2 unique = 3 extra
    }
  })

  it('overlap + multi-occurrence combined: adds correctly', async () => {
    // MEX1 already in album with 1 existing duplicate.
    // File has MEX1×2: overlap (+1) + count-1 (+1) = +2 new copies.
    // Expected: MEX1 duplicate count goes from 1 to 3.
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) return makeChain({ data: [{ sticker_id: 'MEX1' }] })
      if (callIndex === 2) return makeChain({ data: [{ sticker_id: 'MEX1', count: 1 }] })
      if (callIndex === 3) return makeChain({ error: null })
      return makeChain({ error: null })
    })

    const result = await importStickerFile('u1', ['MEX1'], { MEX1: 2 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.totalDuplicateCopies).toBe(2) // +1 overlap + +1 from count-1
    }
  })

  it('falls back to individual inserts and reports failed stickers on bulk failure', async () => {
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) return makeChain({ data: [] })
      if (callIndex === 2) return makeChain({ data: [] })
      if (callIndex === 3) return makeChain({ error: { message: 'bulk failed' } }) // bulk insert fails
      if (callIndex === 4) return makeChain({ error: null }) // MEX1 ok
      if (callIndex === 5) return makeChain({ error: { message: 'row error' } }) // MEX2 fails
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
