import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { updateUserName } from '@/actions/updateUserName'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>

describe('updateUserName', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when name is empty', async () => {
    const result = await updateUserName('user-1', '')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/vazio/)
  })

  it('returns error when name is whitespace only', async () => {
    const result = await updateUserName('user-1', '   ')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/vazio/)
  })

  it('accepts a single-word name', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const result = await updateUserName('user-1', 'Lucas')
    expect(result.success).toBe(true)
  })

  it('returns error when name is already taken by another user (case-insensitive)', async () => {
    mockFrom.mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'other-user' } }),
      }
    })

    const result = await updateUserName('user-1', 'Lucas Gentile')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/já está em uso/)
  })

  it('returns error when database update fails', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'db error' } }),
      }
    })

    const result = await updateUserName('user-1', 'Lucas Gentile')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/Erro/)
  })

  it('returns success when name is valid and available', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const result = await updateUserName('user-1', 'Lucas Gentile')
    expect(result.success).toBe(true)
  })

  it('preserves original casing when saving', async () => {
    const updateMock = vi.fn().mockReturnThis()
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }
      }
      return {
        update: updateMock,
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    await updateUserName('user-1', '  Lucas Gentile  ')
    expect(updateMock).toHaveBeenCalledWith({ name: 'Lucas Gentile' })
  })

  it('uses case-insensitive comparison for duplicate check', async () => {
    const ilikeMock = vi.fn().mockReturnThis()
    mockFrom.mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        ilike: ilikeMock,
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'other-user' } }),
      }
    })

    await updateUserName('user-1', 'Lucas Gentile')
    expect(ilikeMock).toHaveBeenCalledWith('name', 'Lucas Gentile')
  })
})
