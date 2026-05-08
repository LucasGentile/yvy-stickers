import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('@/actions/logAction', () => ({
  logAction: vi.fn(),
}))

import { decrementDuplicate } from '@/actions/decrementDuplicate'
import { removeDuplicate } from '@/actions/removeDuplicate'
import { upsertDuplicate } from '@/actions/upsertDuplicate'
import { supabase } from '@/lib/supabase'
import { logAction } from '@/actions/logAction'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>
const mockLogAction = logAction as ReturnType<typeof vi.fn>

/** Chainable mock that resolves when awaited: supports .delete/.update/.eq chains */
function makeChainable(result: unknown = { error: null }) {
  const chain = {
    delete: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown): Promise<unknown> =>
      Promise.resolve(result).then(resolve, reject),
  }
  chain.delete.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  return chain
}

// ─── decrementDuplicate ───────────────────────────────────────────────────────

describe('decrementDuplicate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns early when no record found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })

    await decrementDuplicate('user-1', 'MEX1')
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('deletes the record when count is 1', async () => {
    const chain = makeChainable({ error: null })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { count: 1 } }),
        }
      }
      return chain
    })

    await decrementDuplicate('user-1', 'MEX1')
    expect(chain.delete).toHaveBeenCalled()
  })

  it('updates count-1 when count is greater than 1', async () => {
    const chain = makeChainable({ error: null })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { count: 3 } }),
        }
      }
      return chain
    })

    await decrementDuplicate('user-1', 'MEX1')
    expect(chain.update).toHaveBeenCalledWith({ count: 2 })
  })
})

// ─── removeDuplicate ─────────────────────────────────────────────────────────

describe('removeDuplicate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls delete with correct filters', async () => {
    const chain = makeChainable({ error: null })
    mockFrom.mockReturnValue(chain)

    await removeDuplicate('user-1', 'MEX1')

    expect(mockFrom).toHaveBeenCalledWith('user_duplicates')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.eq).toHaveBeenCalledWith('sticker_id', 'MEX1')
  })

  it('calls logAction after delete', async () => {
    mockFrom.mockReturnValue(makeChainable({ error: null }))

    await removeDuplicate('user-1', 'MEX1')
    expect(mockLogAction).toHaveBeenCalledWith('user-1', 'duplicate_removed', { stickerId: 'MEX1' })
  })
})

// ─── upsertDuplicate ─────────────────────────────────────────────────────────

describe('upsertDuplicate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when count is 0', async () => {
    const result = await upsertDuplicate('user-1', 'MEX1', 0)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/inválida/i)
  })

  it('returns error when count exceeds 100', async () => {
    const result = await upsertDuplicate('user-1', 'MEX1', 101)
    expect(result.success).toBe(false)
  })

  it('returns error for an invalid sticker id', async () => {
    const result = await upsertDuplicate('user-1', 'INVALID_XYZ', 2)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/inválido/i)
  })

  it('returns error when user is not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })

    const result = await upsertDuplicate('user-1', 'MEX1', 2)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/não encontrado/i)
  })

  it('returns error when sticker is not owned in have mode', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // users query
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { input_mode: 'have' } }),
        }
      }
      // user_stickers query — sticker NOT in collection
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      }
    })

    const result = await upsertDuplicate('user-1', 'MEX1', 2)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/não encontrada/i)
  })

  it('returns error when sticker is not owned in need mode (sticker is in user_stickers)', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { input_mode: 'need' } }),
        }
      }
      // sticker IS in user_stickers → user "needs" it → doesn't own it
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'row-1' } }),
      }
    })

    const result = await upsertDuplicate('user-1', 'MEX1', 2)
    expect(result.success).toBe(false)
  })

  it('returns success and calls logAction on valid upsert', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { input_mode: 'have' } }),
        }
      }
      if (callCount === 2) {
        // sticker exists in user_stickers
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'row-1' } }),
        }
      }
      // upsert call
      return {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const result = await upsertDuplicate('user-1', 'MEX1', 3)
    expect(result.success).toBe(true)
    expect(mockLogAction).toHaveBeenCalledWith('user-1', 'duplicate_updated', {
      stickerId: 'MEX1',
      count: 3,
    })
  })

  it('returns error when upsert fails', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { input_mode: 'have' } }),
        }
      }
      if (callCount === 2) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'row-1' } }),
        }
      }
      return {
        upsert: vi.fn().mockResolvedValue({ error: { message: 'db error' } }),
      }
    })

    const result = await upsertDuplicate('user-1', 'MEX1', 3)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('db error')
  })
})
