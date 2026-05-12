import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { logAction } from '@/actions/logAction'
import { getAuditLog } from '@/actions/getAuditLog'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

// ─── logAction ───────────────────────────────────────────────────────────────

describe('logAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls supabase insert with correct fields', async () => {
    const insertMock = vi.fn().mockReturnValue({ then: vi.fn() })
    mockFrom.mockReturnValue({ insert: insertMock })

    logAction('user-1', 'stickers_saved', { total: 42 })

    expect(mockFrom).toHaveBeenCalledWith('audit_log')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        action: 'stickers_saved',
        metadata: expect.objectContaining({ total: 42 }),
      })
    )
  })

  it('uses empty object as default metadata', () => {
    const insertMock = vi.fn().mockReturnValue({ then: vi.fn() })
    mockFrom.mockReturnValue({ insert: insertMock })

    logAction('user-1', 'duplicate_removed')

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ metadata: {} }))
  })

  it('does not throw when supabase fails', () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({ then: vi.fn().mockReturnValue({ catch: vi.fn() }) }),
    })

    expect(() => logAction('user-1', 'stickers_saved')).not.toThrow()
  })
})

// ─── getAuditLog ─────────────────────────────────────────────────────────────

describe('getAuditLog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when no entries exist', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const result = await getAuditLog('user-1')
    expect(result).toEqual([])
  })

  it('returns entries ordered by created_at desc', async () => {
    const entries = [
      {
        id: 'a',
        action: 'stickers_saved',
        metadata: { total: 10 },
        created_at: '2026-05-08T10:00:00Z',
      },
      {
        id: 'b',
        action: 'duplicate_updated',
        metadata: { stickerId: 'BRA1', count: 2 },
        created_at: '2026-05-07T10:00:00Z',
      },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: entries, error: null }),
    })

    const result = await getAuditLog('user-1')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('a')
    expect(result[0].action).toBe('stickers_saved')
  })

  it('queries for the correct user_id', async () => {
    const eqMock = vi.fn().mockReturnThis()
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: eqMock,
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    await getAuditLog('user-xyz')
    expect(eqMock).toHaveBeenCalledWith('user_id', 'user-xyz')
  })

  it('limits to 100 entries', async () => {
    const limitMock = vi.fn().mockResolvedValue({ data: [], error: null })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: limitMock,
    })

    await getAuditLog('user-1')
    expect(limitMock).toHaveBeenCalledWith(100)
  })
})
