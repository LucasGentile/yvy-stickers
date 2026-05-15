import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { getTradeTimeline } from '@/actions/getTradeTimeline'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

describe('getTradeTimeline', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when entryId is empty', async () => {
    const result = await getTradeTimeline('', 'user-1')
    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns null when userId is empty', async () => {
    const result = await getTradeTimeline('entry-1', '')
    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns null when entry not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })

    const result = await getTradeTimeline('entry-1', 'user-1')
    expect(result).toBeNull()
  })

  it('returns null when entry has no tradeId in metadata', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'entry-1',
          action: 'stickers_saved',
          metadata: { total: 10 },
          created_at: '2026-05-10T10:00:00Z',
          user_id: 'user-1',
        },
      }),
    })

    const result = await getTradeTimeline('entry-1', 'user-1')
    expect(result).toBeNull()
  })

  it('fetches all related entries by tradeId and returns timeline', async () => {
    const relatedEntries = [
      {
        id: 'entry-3',
        action: 'trade_accepted',
        metadata: { tradeId: 'trade-abc', partnerName: 'Ana' },
        created_at: '2026-05-10T12:00:00Z',
      },
      {
        id: 'entry-1',
        action: 'trade_sent',
        metadata: { tradeId: 'trade-abc', partnerName: 'Ana' },
        created_at: '2026-05-10T10:00:00Z',
      },
    ]

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'entry-3',
              action: 'trade_accepted',
              metadata: { tradeId: 'trade-abc', partnerName: 'Ana' },
              created_at: '2026-05-10T12:00:00Z',
              user_id: 'user-1',
            },
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: relatedEntries }),
      }
    })

    const result = await getTradeTimeline('entry-3', 'user-1')
    expect(result).not.toBeNull()
    expect(result!.focusedEntryId).toBe('entry-3')
    expect(result!.tradeId).toBe('trade-abc')
    expect(result!.entries).toHaveLength(2)
    expect(result!.entries[0].action).toBe('trade_accepted')
    expect(result!.entries[1].action).toBe('trade_sent')
  })

  it('returns entries in descending order (newest first)', async () => {
    const relatedEntries = [
      {
        id: 'entry-4',
        action: 'trade_rolled_back',
        metadata: { tradeId: 'trade-xyz', partnerName: 'João' },
        created_at: '2026-05-12T14:00:00Z',
      },
      {
        id: 'entry-3',
        action: 'trade_accepted',
        metadata: { tradeId: 'trade-xyz', partnerName: 'João' },
        created_at: '2026-05-11T10:00:00Z',
      },
      {
        id: 'entry-2',
        action: 'trade_received',
        metadata: { tradeId: 'trade-xyz', partnerName: 'João' },
        created_at: '2026-05-10T09:00:00Z',
      },
    ]

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'entry-3',
              action: 'trade_accepted',
              metadata: { tradeId: 'trade-xyz', partnerName: 'João' },
              created_at: '2026-05-11T10:00:00Z',
              user_id: 'user-1',
            },
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: relatedEntries }),
      }
    })

    const result = await getTradeTimeline('entry-3', 'user-1')
    expect(result!.entries[0].created_at).toBe('2026-05-12T14:00:00Z')
    expect(result!.entries[2].created_at).toBe('2026-05-10T09:00:00Z')
  })

  it('only returns entries for the requesting user', async () => {
    let callCount = 0
    const eqCalls: [string, string][] = []

    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn((...args: [string, string]) => {
            eqCalls.push(args)
            return {
              eq: vi.fn((...innerArgs: [string, string]) => {
                eqCalls.push(innerArgs)
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'entry-1',
                      action: 'trade_sent',
                      metadata: { tradeId: 'trade-123' },
                      created_at: '2026-05-10T10:00:00Z',
                      user_id: 'user-1',
                    },
                  }),
                }
              }),
            }
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((...args: [string, string]) => {
          eqCalls.push(args)
          return {
            filter: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [] }),
          }
        }),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [] }),
      }
    })

    await getTradeTimeline('entry-1', 'user-1')
    const userIdCalls = eqCalls.filter(([col]) => col === 'user_id')
    expect(userIdCalls.length).toBeGreaterThanOrEqual(1)
    expect(userIdCalls.every(([, val]) => val === 'user-1')).toBe(true)
  })

  it('filters by metadata tradeId using JSONB filter', async () => {
    let filterArgs: [string, string, string] | null = null

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'entry-1',
              action: 'trade_sent',
              metadata: { tradeId: 'trade-filter-test' },
              created_at: '2026-05-10T10:00:00Z',
              user_id: 'user-1',
            },
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn((...args: [string, string, string]) => {
          filterArgs = args
          return {
            order: vi.fn().mockResolvedValue({ data: [] }),
          }
        }),
        order: vi.fn().mockResolvedValue({ data: [] }),
      }
    })

    await getTradeTimeline('entry-1', 'user-1')
    expect(filterArgs).toEqual(['metadata->>tradeId', 'eq', 'trade-filter-test'])
  })
})
