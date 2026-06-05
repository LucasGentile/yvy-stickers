import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { checkStickerListAvailability } from '@/actions/checkStickerListAvailability'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = vi.mocked(supabaseAdmin.from)

// Call order within Promise.all:
//   1. from('user_stickers')  → .select().eq().in()  → resolves { data }
//   2. from('user_duplicates') → .select().eq().in() → resolves { data }
//   3. from('pending_trades') → .select().or().eq()  → resolves { data }

function makeOwnedChain(data: { sticker_id: string }[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data }),
  }
}

function makeDupesChain(data: { sticker_id: string; count: number }[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data }),
  }
}

function makeTradesChain(
  data: {
    initiator_id: string
    receiver_id: string
    giving_ids: string[]
    receiving_ids: string[]
  }[]
) {
  return {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data }),
  }
}

function mockThreeCalls(
  owned: { sticker_id: string }[],
  dupes: { sticker_id: string; count: number }[],
  trades: {
    initiator_id: string
    receiver_id: string
    giving_ids: string[]
    receiving_ids: string[]
  }[] = []
) {
  let callCount = 0
  mockFrom.mockImplementation(() => {
    callCount++
    if (callCount === 1) return makeOwnedChain(owned) as never
    if (callCount === 2) return makeDupesChain(dupes) as never
    return makeTradesChain(trades) as never
  })
}

beforeEach(() => vi.clearAllMocks())

describe('checkStickerListAvailability', () => {
  it('returns invalid entries for empty userId without hitting the DB', async () => {
    const result = await checkStickerListAvailability('', ['FWC1'])
    expect(result).toEqual([{ stickerId: 'FWC1', status: 'invalid' }])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('marks unknown sticker codes as invalid', async () => {
    mockThreeCalls([], [], [])
    const result = await checkStickerListAvailability('user-a', ['NOTREAL', 'FAKE123'])
    expect(result).toEqual([
      { stickerId: 'NOTREAL', status: 'invalid' },
      { stickerId: 'FAKE123', status: 'invalid' },
    ])
  })

  it('deduplicates repeated IDs — only one result per unique sticker', async () => {
    mockThreeCalls([{ sticker_id: 'FWC1' }], [{ sticker_id: 'FWC1', count: 1 }], [])
    const result = await checkStickerListAvailability('user-a', ['FWC1', 'FWC1', 'FWC1'])
    expect(result).toHaveLength(1)
    expect(result[0].stickerId).toBe('FWC1')
  })

  it('normalizes "00" to "FWC00"', async () => {
    mockThreeCalls([{ sticker_id: 'FWC00' }], [{ sticker_id: 'FWC00', count: 2 }], [])
    const result = await checkStickerListAvailability('user-a', ['00'])
    expect(result[0].stickerId).toBe('FWC00')
    expect(result[0].status).toBe('available')
  })

  it('returns not_owned for stickers absent from user_stickers', async () => {
    mockThreeCalls([], [], [])
    const result = await checkStickerListAvailability('user-a', ['FWC1'])
    expect(result).toEqual([{ stickerId: 'FWC1', status: 'not_owned' }])
  })

  it('returns no_dupes for stickers owned with 0 duplicates', async () => {
    mockThreeCalls([{ sticker_id: 'FWC1' }], [], [])
    const result = await checkStickerListAvailability('user-a', ['FWC1'])
    expect(result).toEqual([{ stickerId: 'FWC1', status: 'no_dupes' }])
  })

  it('returns available for stickers with duplicates and no pending trades', async () => {
    mockThreeCalls([{ sticker_id: 'FWC1' }], [{ sticker_id: 'FWC1', count: 2 }], [])
    const result = await checkStickerListAvailability('user-a', ['FWC1'])
    expect(result[0]).toMatchObject({
      stickerId: 'FWC1',
      status: 'available',
      dupeCount: 2,
      reservedCount: 0,
      availableCount: 2,
    })
  })

  it('returns partial when some duplicates are reserved in pending trades', async () => {
    mockThreeCalls(
      [{ sticker_id: 'FWC1' }],
      [{ sticker_id: 'FWC1', count: 3 }],
      [{ initiator_id: 'user-a', receiver_id: 'user-b', giving_ids: ['FWC1'], receiving_ids: [] }]
    )
    const result = await checkStickerListAvailability('user-a', ['FWC1'])
    expect(result[0]).toMatchObject({
      stickerId: 'FWC1',
      status: 'partial',
      dupeCount: 3,
      reservedCount: 1,
      availableCount: 2,
    })
  })

  it('returns fully_reserved when all duplicates are reserved', async () => {
    mockThreeCalls(
      [{ sticker_id: 'FWC1' }],
      [{ sticker_id: 'FWC1', count: 1 }],
      [{ initiator_id: 'user-a', receiver_id: 'user-b', giving_ids: ['FWC1'], receiving_ids: [] }]
    )
    const result = await checkStickerListAvailability('user-a', ['FWC1'])
    expect(result[0]).toMatchObject({
      stickerId: 'FWC1',
      status: 'fully_reserved',
      dupeCount: 1,
      reservedCount: 1,
      availableCount: 0,
    })
  })

  it('counts reserved stickers from trades where user is the receiver side', async () => {
    // user-a is receiver: receiving_ids are what they give
    mockThreeCalls(
      [{ sticker_id: 'FWC2' }],
      [{ sticker_id: 'FWC2', count: 1 }],
      [{ initiator_id: 'user-b', receiver_id: 'user-a', giving_ids: [], receiving_ids: ['FWC2'] }]
    )
    const result = await checkStickerListAvailability('user-a', ['FWC2'])
    expect(result[0].status).toBe('fully_reserved')
  })

  it('returns mixed statuses for a list with different sticker states', async () => {
    mockThreeCalls(
      [{ sticker_id: 'FWC1' }, { sticker_id: 'FWC2' }],
      [{ sticker_id: 'FWC1', count: 2 }], // FWC2 has 0 dupes
      []
    )
    const result = await checkStickerListAvailability('user-a', ['FWC1', 'FWC2', 'FWC3', 'NOTREAL'])
    const byId = Object.fromEntries(result.map((r) => [r.stickerId, r.status]))
    expect(byId['FWC1']).toBe('available') // owned + dupes + no trades
    expect(byId['FWC2']).toBe('no_dupes') // owned + 0 dupes
    expect(byId['FWC3']).toBe('not_owned') // not in user_stickers
    expect(byId['NOTREAL']).toBe('invalid') // not a real sticker
  })
})
