import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { loginByPhone } from '@/actions/loginByPhone'
import { getUserData } from '@/actions/getUserData'
import { setInputMode } from '@/actions/setInputMode'
import { supabase } from '@/lib/supabase'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>

// ─── loginByPhone ─────────────────────────────────────────────────────────────

describe('loginByPhone', () => {
  beforeEach(() => vi.clearAllMocks())

  function makeFormData(phone: string) {
    const fd = new FormData()
    fd.append('phone', phone)
    return fd
  }

  it('returns error when phone is empty', async () => {
    const result = await loginByPhone(makeFormData(''))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/whatsapp/i)
  })

  it('returns error when phone is whitespace only', async () => {
    const result = await loginByPhone(makeFormData('   '))
    expect(result.success).toBe(false)
  })

  it('returns error when user is not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })

    const result = await loginByPhone(makeFormData('11999998888'))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/não encontrado/i)
  })

  it('returns userId and displayKey when user is found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: 'user-1', display_key: 'DISP123' } }),
    })

    const result = await loginByPhone(makeFormData('11999998888'))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.userId).toBe('user-1')
      expect(result.displayKey).toBe('DISP123')
    }
  })
})

// ─── getUserData ──────────────────────────────────────────────────────────────

describe('getUserData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when user is not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })

    const result = await getUserData('user-1')
    expect(result).toBeNull()
  })

  it('returns UserData with sticker ids', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { input_mode: 'have', approved: true } }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi
          .fn()
          .mockResolvedValue({ data: [{ sticker_id: 'MEX1' }, { sticker_id: 'BRA5' }] }),
      }
    })

    const result = await getUserData('user-1')
    expect(result).not.toBeNull()
    expect(result!.inputMode).toBe('have')
    expect(result!.approved).toBe(true)
    expect(result!.stickerIds).toEqual(['MEX1', 'BRA5'])
  })

  it('returns empty stickerIds when user has no stickers', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { input_mode: 'need', approved: false } }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null }),
      }
    })

    const result = await getUserData('user-1')
    expect(result!.stickerIds).toEqual([])
    expect(result!.approved).toBe(false)
    expect(result!.inputMode).toBe('need')
  })
})

// ─── setInputMode ─────────────────────────────────────────────────────────────

describe('setInputMode', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns success when update succeeds', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const result = await setInputMode('user-1', 'have')
    expect(result.success).toBe(true)
  })

  it('returns error when update fails', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'db error' } }),
    })

    const result = await setInputMode('user-1', 'need')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/modo/i)
  })

  it('passes the correct mode to update', async () => {
    const updateMock = vi.fn().mockReturnThis()
    mockFrom.mockReturnValue({
      update: updateMock,
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    await setInputMode('user-1', 'need')
    expect(updateMock).toHaveBeenCalledWith({ input_mode: 'need' })
  })
})
