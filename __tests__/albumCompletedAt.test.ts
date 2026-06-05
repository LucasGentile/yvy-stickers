import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use a tiny album so tests can pass a "complete" list without 994 IDs
vi.mock('@/lib/stickers', () => ({
  ALL_STICKER_IDS: ['FWC1', 'FWC2', 'FWC3'],
  STICKER_SET: new Set(['FWC1', 'FWC2', 'FWC3']),
}))

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/actions/logAction', () => ({
  logAction: vi.fn(),
}))

import { saveStickers } from '@/actions/saveStickers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = vi.mocked(supabaseAdmin.from)

function makeSelectChain(existing: string[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      data: existing.map((s) => ({ sticker_id: s })),
      error: null,
    }),
  }
}

function makeDeleteChain() {
  return { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
}

function makeInsertChain() {
  return { insert: vi.fn().mockResolvedValue({ error: null }) }
}

function makeUserUpdateChain(updateSpy: ReturnType<typeof vi.fn>) {
  const chain = {
    update: updateSpy,
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue(undefined),
  }
  updateSpy.mockReturnValue(chain)
  return chain
}

beforeEach(() => vi.clearAllMocks())

describe('saveStickers — album_completed_at invariant', () => {
  it('sets album_completed_at when saving the full album for the first time', async () => {
    const updateSpy = vi.fn()
    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return makeUserUpdateChain(updateSpy) as never
      callCount++
      if (callCount === 1) return makeSelectChain([]) as never
      if (callCount === 2) return makeDeleteChain() as never
      return makeInsertChain() as never
    })

    await saveStickers('user-a', ['FWC1', 'FWC2', 'FWC3'])

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ album_completed_at: expect.any(String) })
    )
    // Must never clear the date
    expect(updateSpy).not.toHaveBeenCalledWith({ album_completed_at: null })
  })

  it('does NOT touch album_completed_at when saving with fewer stickers than the full album', async () => {
    const updateSpy = vi.fn()
    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return makeUserUpdateChain(updateSpy) as never
      callCount++
      if (callCount === 1) return makeSelectChain(['FWC1', 'FWC2', 'FWC3']) as never
      if (callCount === 2) return makeDeleteChain() as never
      if (callCount === 3) return makeInsertChain() as never
      // dupes check for removed sticker FWC3
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
      } as never
    })

    await saveStickers('user-a', ['FWC1', 'FWC2']) // one sticker short

    // The users table must not be touched at all — no date clearing
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('does not overwrite an existing album_completed_at when re-saving the full album', async () => {
    // The .is('album_completed_at', null) guard in the query prevents overwriting.
    // This test verifies the guard is present in the call chain.
    const isChainSpy = vi.fn().mockReturnThis()
    const chainWithIs = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: isChainSpy,
      then: vi.fn().mockResolvedValue(undefined),
    }
    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return chainWithIs as never
      callCount++
      if (callCount === 1) return makeSelectChain([]) as never
      if (callCount === 2) return makeDeleteChain() as never
      return makeInsertChain() as never
    })

    await saveStickers('user-a', ['FWC1', 'FWC2', 'FWC3'])

    expect(isChainSpy).toHaveBeenCalledWith('album_completed_at', null)
  })
})
