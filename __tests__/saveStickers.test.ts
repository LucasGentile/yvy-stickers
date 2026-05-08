import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('@/actions/logAction', () => ({
  logAction: vi.fn(),
}))

import { saveStickers } from '@/actions/saveStickers'
import { supabase } from '@/lib/supabase'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>

// saveStickers now makes 3 from() calls:
// 1. select existing stickers (to compute delta)
// 2. delete existing stickers
// 3. insert new stickers (only when list is non-empty)

function makeSelectChain(existing: string[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: existing.map((s) => ({ sticker_id: s })), error: null }),
  }
}

function makeDeleteChain(error: unknown = null) {
  return {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error }),
  }
}

describe('saveStickers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when userId is empty', async () => {
    const result = await saveStickers('', ['MEX1', 'MEX2', 'MEX3'])
    expect(result.success).toBe(false)
  })

  it('deletes existing stickers and inserts new ones', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain([])
      if (callCount === 2) return makeDeleteChain()
      return { insert: insertMock }
    })

    const result = await saveStickers('user-a', ['MEX1', 'MEX2', 'MEX3'])
    expect(result.success).toBe(true)
    if (result.success) expect(result.count).toBe(3)
  })

  it('returns success with count 0 for empty sticker list', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain([])
      return makeDeleteChain()
    })

    const result = await saveStickers('user-a', [])
    expect(result.success).toBe(true)
    if (result.success) expect(result.count).toBe(0)
  })

  it('returns error when delete fails', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain([])
      return makeDeleteChain({ message: 'db error' })
    })

    const result = await saveStickers('user-a', ['MEX1', 'MEX2'])
    expect(result.success).toBe(false)
  })

  it('logs only the added count, not total', async () => {
    const { logAction } = await import('@/actions/logAction')
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      // existing: MEX1 already saved
      if (callCount === 1) return makeSelectChain(['MEX1'])
      if (callCount === 2) return makeDeleteChain()
      return { insert: insertMock }
    })

    await saveStickers('user-a', ['MEX1', 'MEX2', 'MEX3'])
    expect(logAction).toHaveBeenCalledWith(
      'user-a',
      'stickers_saved',
      expect.objectContaining({ added: 2, total: 3 })
    )
  })
})
