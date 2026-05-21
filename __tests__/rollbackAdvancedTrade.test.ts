import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/actions/logAction', () => ({
  logAction: vi.fn(),
}))

import { rollbackAdvancedTrade } from '@/actions/rollbackAdvancedTrade'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

function makeSelectChain(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return chain
}

function makeUpdateChain(result: unknown = { error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  return chain
}

function makeInsertChain(result: unknown = { error: null }) {
  return { insert: vi.fn().mockResolvedValue(result) }
}

function makeDeleteChain(result: unknown = { error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockResolvedValue(result)
  return chain
}

function makeTrade(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trade-1',
    status: 'accepted',
    user_a_id: 'user-a',
    user_b_id: 'user-b',
    user_c_id: 'user-c',
    a_gives_ids: ['S1', 'S2'],
    b_gives_ids: ['S3', 'S4'],
    c_gives_ids: ['S5', 'S6'],
    rollback_requested_by: null,
    rollback_requested_at: null,
    rollback_a_status: 'none',
    rollback_b_status: 'none',
    rollback_c_status: 'none',
    ...overrides,
  }
}

describe('rollbackAdvancedTrade', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error for empty parameters', async () => {
    const result = await rollbackAdvancedTrade('', 'user-a', 'request')
    expect(result).toEqual({ success: false, error: 'Parâmetros inválidos.' })
  })

  it('returns error when trade not found', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: null }))
    const result = await rollbackAdvancedTrade('trade-1', 'user-a', 'request')
    expect(result).toEqual({ success: false, error: 'Troca não encontrada ou já processada.' })
  })

  it('returns error when user is not a participant', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: makeTrade() }))
    const result = await rollbackAdvancedTrade('trade-1', 'outsider', 'request')
    expect(result).toEqual({ success: false, error: 'Você não faz parte desta troca.' })
  })

  describe('request action', () => {
    it('sets rollback_requested_by and marks requester as approved', async () => {
      const trade = makeTrade()
      const updateChain = makeUpdateChain({ error: null })
      const usersChain = makeSelectChain({
        data: [
          { id: 'user-a', name: 'Alice' },
          { id: 'user-b', name: 'Bob' },
          { id: 'user-c', name: 'Carol' },
        ],
      })

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'advanced_trades') {
          callCount++
          if (callCount === 1) return makeSelectChain({ data: trade })
          return updateChain
        }
        if (table === 'users') return usersChain
        return makeSelectChain({ data: null })
      })

      const result = await rollbackAdvancedTrade('trade-1', 'user-a', 'request')
      expect(result).toEqual({ success: true })
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          rollback_requested_by: 'user-a',
          rollback_a_status: 'approved',
        })
      )
    })

    it('returns error if rollback already requested', async () => {
      const trade = makeTrade({ rollback_requested_by: 'user-b' })
      mockFrom.mockReturnValue(makeSelectChain({ data: trade }))

      const result = await rollbackAdvancedTrade('trade-1', 'user-a', 'request')
      expect(result).toEqual({ success: false, error: 'Desfazimento já solicitado.' })
    })
  })

  describe('deny action', () => {
    it('clears all rollback state when a participant denies', async () => {
      const trade = makeTrade({
        rollback_requested_by: 'user-a',
        rollback_a_status: 'approved',
      })
      const updateChain = makeUpdateChain({ error: null })
      const usersChain = makeSelectChain({
        data: [
          { id: 'user-a', name: 'Alice' },
          { id: 'user-b', name: 'Bob' },
          { id: 'user-c', name: 'Carol' },
        ],
      })

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'advanced_trades') {
          callCount++
          if (callCount === 1) return makeSelectChain({ data: trade })
          return updateChain
        }
        if (table === 'users') return usersChain
        return makeSelectChain({ data: null })
      })

      const result = await rollbackAdvancedTrade('trade-1', 'user-b', 'deny')
      expect(result).toEqual({ success: true })
      expect(updateChain.update).toHaveBeenCalledWith({
        rollback_requested_by: null,
        rollback_requested_at: null,
        rollback_a_status: 'none',
        rollback_b_status: 'none',
        rollback_c_status: 'none',
      })
    })

    it('returns error if user tries to deny their own request', async () => {
      const trade = makeTrade({
        rollback_requested_by: 'user-a',
        rollback_a_status: 'approved',
      })
      mockFrom.mockReturnValue(makeSelectChain({ data: trade }))

      const result = await rollbackAdvancedTrade('trade-1', 'user-a', 'deny')
      expect(result).toEqual({
        success: false,
        error: 'Você não pode negar sua própria solicitação.',
      })
    })

    it('returns error if no rollback pending', async () => {
      const trade = makeTrade()
      mockFrom.mockReturnValue(makeSelectChain({ data: trade }))

      const result = await rollbackAdvancedTrade('trade-1', 'user-b', 'deny')
      expect(result).toEqual({ success: false, error: 'Nenhuma solicitação pendente.' })
    })
  })

  describe('confirm action', () => {
    it('marks user as approved and returns success when not all approved yet', async () => {
      const trade = makeTrade({
        rollback_requested_by: 'user-a',
        rollback_a_status: 'approved',
        rollback_b_status: 'none',
        rollback_c_status: 'none',
      })

      const updatedData = {
        data: {
          id: 'trade-1',
          rollback_a_status: 'approved',
          rollback_b_status: 'approved',
          rollback_c_status: 'none',
        },
      }
      const updateChain = makeUpdateChain(updatedData)

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'advanced_trades') {
          callCount++
          if (callCount === 1) return makeSelectChain({ data: trade })
          return updateChain
        }
        return makeSelectChain({ data: null })
      })

      const result = await rollbackAdvancedTrade('trade-1', 'user-b', 'confirm')
      expect(result).toEqual({ success: true })
    })

    it('executes rollback when all 3 participants approve', async () => {
      const trade = makeTrade({
        rollback_requested_by: 'user-a',
        rollback_a_status: 'approved',
        rollback_b_status: 'approved',
        rollback_c_status: 'none',
      })

      const updatedData = {
        data: {
          id: 'trade-1',
          rollback_a_status: 'approved',
          rollback_b_status: 'approved',
          rollback_c_status: 'approved',
        },
      }
      const updateChain = makeUpdateChain(updatedData)
      const statusUpdateChain = makeUpdateChain({ data: { id: 'trade-1' } })
      const usersChain = makeSelectChain({
        data: [
          { id: 'user-a', name: 'Alice' },
          { id: 'user-b', name: 'Bob' },
          { id: 'user-c', name: 'Carol' },
        ],
      })

      let advancedCallCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'advanced_trades') {
          advancedCallCount++
          if (advancedCallCount === 1) return makeSelectChain({ data: trade })
          if (advancedCallCount === 2) return updateChain
          return statusUpdateChain
        }
        if (table === 'users') return usersChain
        if (table === 'user_duplicates')
          return {
            ...makeSelectChain({ data: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        if (table === 'user_stickers') return makeDeleteChain()
        return makeSelectChain({ data: null })
      })

      const result = await rollbackAdvancedTrade('trade-1', 'user-c', 'confirm')
      expect(result).toEqual({ success: true })
    })

    it('returns error if user already confirmed', async () => {
      const trade = makeTrade({
        rollback_requested_by: 'user-a',
        rollback_a_status: 'approved',
        rollback_b_status: 'approved',
      })
      mockFrom.mockReturnValue(makeSelectChain({ data: trade }))

      const result = await rollbackAdvancedTrade('trade-1', 'user-b', 'confirm')
      expect(result).toEqual({ success: false, error: 'Você já confirmou o desfazimento.' })
    })
  })

  describe('force action', () => {
    it('returns error if not the requester', async () => {
      const trade = makeTrade({
        rollback_requested_by: 'user-a',
        rollback_requested_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      })
      mockFrom.mockReturnValue(makeSelectChain({ data: trade }))

      const result = await rollbackAdvancedTrade('trade-1', 'user-b', 'force')
      expect(result).toEqual({
        success: false,
        error: 'Apenas quem solicitou o desfazimento pode forçá-lo.',
      })
    })

    it('returns error if less than 7 days have passed', async () => {
      const trade = makeTrade({
        rollback_requested_by: 'user-a',
        rollback_requested_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      })
      mockFrom.mockReturnValue(makeSelectChain({ data: trade }))

      const result = await rollbackAdvancedTrade('trade-1', 'user-a', 'force')
      expect(result).toEqual({
        success: false,
        error: 'Aguarde 7 dias após a solicitação para forçar o desfazimento.',
      })
    })

    it('executes rollback when 7 days have passed', async () => {
      const trade = makeTrade({
        rollback_requested_by: 'user-a',
        rollback_requested_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        rollback_a_status: 'approved',
      })
      const statusUpdateChain = makeUpdateChain({ data: { id: 'trade-1' } })
      const usersChain = makeSelectChain({
        data: [
          { id: 'user-a', name: 'Alice' },
          { id: 'user-b', name: 'Bob' },
          { id: 'user-c', name: 'Carol' },
        ],
      })

      let advancedCallCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'advanced_trades') {
          advancedCallCount++
          if (advancedCallCount === 1) return makeSelectChain({ data: trade })
          return statusUpdateChain
        }
        if (table === 'users') return usersChain
        if (table === 'user_duplicates')
          return {
            ...makeSelectChain({ data: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        if (table === 'user_stickers') return makeDeleteChain()
        return makeSelectChain({ data: null })
      })

      const result = await rollbackAdvancedTrade('trade-1', 'user-a', 'force')
      expect(result).toEqual({ success: true })
    })
  })
})
