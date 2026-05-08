import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { registerUser } from '@/actions/registerUser'
import { supabase } from '@/lib/supabase'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

function makeChain(maybeSingleData: unknown, insertData: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: maybeSingleData, error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi
      .fn()
      .mockResolvedValue({ data: insertData, error: insertData ? null : { message: 'err' } }),
  }
}

describe('registerUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when required fields are missing', async () => {
    const result = await registerUser(formData({ name: '', apartment: '', tower: '', phone: '' }))
    expect(result.success).toBe(false)
  })

  it('returns error for invalid apartment (not 4 digits)', async () => {
    const result = await registerUser(
      formData({ name: 'Lucas Gentile', apartment: '12', tower: '1', phone: '11999998888' })
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/apartamento/i)
  })

  it('returns error for invalid tower (more than 2 digits)', async () => {
    const result = await registerUser(
      formData({ name: 'Lucas Gentile', apartment: '0806', tower: '123', phone: '11999998888' })
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/torre/i)
  })

  it('returns existing user when phone already registered', async () => {
    mockFrom.mockReturnValue(makeChain({ id: 'existing-id', display_key: 'lucas gentile-0806-2' }))
    const result = await registerUser(
      formData({ name: 'Lucas Gentile', apartment: '0806', tower: '2', phone: '11999998888' })
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.userId).toBe('existing-id')
      expect(result.displayKey).toBe('lucas gentile-0806-2')
    }
  })

  it('creates new user for new phone', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'new-id', display_key: 'lucas gentile-0806-2' },
        error: null,
      }),
    }
    mockFrom.mockReturnValue(chain)

    const result = await registerUser(
      formData({ name: 'Lucas Gentile', apartment: '0806', tower: '2', phone: '11999998888' })
    )
    expect(result.success).toBe(true)
    if (result.success) expect(result.userId).toBe('new-id')
  })
})
