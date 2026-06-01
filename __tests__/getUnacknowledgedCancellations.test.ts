import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { getUnacknowledgedCancellations } from '@/actions/getUnacknowledgedCancellations'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = vi.mocked(supabaseAdmin.from)

function makeTradeChain(data: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data }),
  }
  return chain
}

function makeUsersChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data }),
  }
}

beforeEach(() => vi.clearAllMocks())

describe('getUnacknowledgedCancellations', () => {
  it('returns empty array when userId is empty', async () => {
    const result = await getUnacknowledgedCancellations('')
    expect(result).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns empty array when no trades found', async () => {
    mockFrom.mockReturnValueOnce(makeTradeChain([]) as never)
    const result = await getUnacknowledgedCancellations('user-a')
    expect(result).toEqual([])
  })

  it('returns cancellations where user is the receiver (cancelled trade)', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeTradeChain([
          {
            id: 'trade-1',
            initiator_id: 'user-b',
            receiver_id: 'user-a',
            giving_ids: ['BRA1'],
            receiving_ids: ['ARG1'],
            status: 'cancelled',
          },
        ]) as never
      )
      .mockReturnValueOnce(makeUsersChain([{ id: 'user-b', name: 'Diego Estima' }]) as never)

    const result = await getUnacknowledgedCancellations('user-a')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('trade-1')
    expect(result[0].otherUserName).toBe('Diego Estima')
    expect(result[0].myGivingIds).toEqual(['ARG1']) // user-a was receiver, giving receiving_ids
    expect(result[0].status).toBe('cancelled')
  })

  it('returns cancellations where user is the initiator (rejected trade)', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeTradeChain([
          {
            id: 'trade-2',
            initiator_id: 'user-a',
            receiver_id: 'user-b',
            giving_ids: ['MEX1'],
            receiving_ids: ['BRA1'],
            status: 'rejected',
          },
        ]) as never
      )
      .mockReturnValueOnce(makeUsersChain([{ id: 'user-b', name: 'Alice Souza' }]) as never)

    const result = await getUnacknowledgedCancellations('user-a')

    expect(result).toHaveLength(1)
    expect(result[0].myGivingIds).toEqual(['MEX1']) // user-a was initiator
    expect(result[0].status).toBe('rejected')
  })

  it('skips trades where user had no stickers to give', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeTradeChain([
          {
            id: 'trade-3',
            initiator_id: 'user-b',
            receiver_id: 'user-a',
            giving_ids: ['BRA1'],
            receiving_ids: [], // user-a (receiver) has nothing to give back
            status: 'cancelled',
          },
        ]) as never
      )
      .mockReturnValueOnce(makeUsersChain([{ id: 'user-b', name: 'Bob' }]) as never)

    const result = await getUnacknowledgedCancellations('user-a')
    expect(result).toEqual([])
  })

  it('returns empty array on error', async () => {
    mockFrom.mockImplementationOnce(() => {
      throw new Error('DB error')
    })
    const result = await getUnacknowledgedCancellations('user-a')
    expect(result).toEqual([])
  })
})
