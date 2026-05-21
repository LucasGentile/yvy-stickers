import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { updateUserName } from '@/actions/updateUserName'
import { supabase } from '@/lib/supabase'

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

  it('returns error when name has only one word', async () => {
    const result = await updateUserName('user-1', 'Lucas')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/sobrenome/)
  })

  it('returns error when name is already taken by another user', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'other-user' } }),
        }
      }
      return {}
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
          eq: vi.fn().mockReturnThis(),
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
          eq: vi.fn().mockReturnThis(),
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

  it('normalizes the name before saving', async () => {
    const updateMock = vi.fn().mockReturnThis()
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
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
    expect(updateMock).toHaveBeenCalledWith({ name: 'lucas gentile' })
  })
})
