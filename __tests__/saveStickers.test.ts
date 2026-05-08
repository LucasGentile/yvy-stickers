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

describe('saveStickers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when userId is empty', async () => {
    const result = await saveStickers('', ['MEX1', 'MEX2', 'MEX3'])
    expect(result.success).toBe(false)
  })

  it('deletes existing stickers and inserts new ones', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
      insert: insertMock,
    })

    const result = await saveStickers('user-a', ['MEX1', 'MEX2', 'MEX3'])
    expect(result.success).toBe(true)
    if (result.success) expect(result.count).toBe(3)
  })

  it('returns success with count 0 for empty sticker list', async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const result = await saveStickers('user-a', [])
    expect(result.success).toBe(true)
    if (result.success) expect(result.count).toBe(0)
  })

  it('returns error when delete fails', async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'db error' } }),
    })

    const result = await saveStickers('user-a', ['MEX1', 'MEX2'])
    expect(result.success).toBe(false)
  })
})
