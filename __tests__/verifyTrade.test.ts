import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { verifyTrade } from '@/actions/verifyTrade'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

function makeVerifyChain(data: unknown) {
  const chain: Record<string, unknown> = {}
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error: null })
  return chain
}

describe('verifyTrade', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns invalid params error when tradeId is empty', async () => {
    const result = await verifyTrade('', 'user-1', 'normal')
    expect(result).toEqual({ success: false, error: 'Parâmetros inválidos.' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns invalid params error when userId is empty', async () => {
    const result = await verifyTrade('trade-1', '', 'normal')
    expect(result).toEqual({ success: false, error: 'Parâmetros inválidos.' })
  })

  it('returns success for a normal accepted trade', async () => {
    const chain = makeVerifyChain({ id: 'trade-1' })
    mockFrom.mockReturnValue(chain)
    const result = await verifyTrade('trade-1', 'user-1', 'normal')
    expect(result).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('pending_trades')
  })

  it('returns success for an advanced accepted trade', async () => {
    const chain = makeVerifyChain({ id: 'adv-1' })
    mockFrom.mockReturnValue(chain)
    const result = await verifyTrade('adv-1', 'user-1', 'advanced')
    expect(result).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('advanced_trades')
  })

  it('accepts a partially-rolled-back trade (rolled_back status)', async () => {
    const chain = makeVerifyChain({ id: 'trade-rb' })
    mockFrom.mockReturnValue(chain)
    const result = await verifyTrade('trade-rb', 'user-1', 'normal')
    expect(result).toEqual({ success: true })
    expect(chain.in).toHaveBeenCalledWith('status', ['accepted', 'rolled_back'])
  })

  it('filters by both accepted and rolled_back statuses', async () => {
    const chain = makeVerifyChain({ id: 'trade-1' })
    mockFrom.mockReturnValue(chain)
    await verifyTrade('trade-1', 'user-1', 'normal')
    expect(chain.in).toHaveBeenCalledWith('status', ['accepted', 'rolled_back'])
  })

  it('returns not found error when data is null (already verified or wrong status)', async () => {
    const chain = makeVerifyChain(null)
    mockFrom.mockReturnValue(chain)
    const result = await verifyTrade('trade-1', 'user-1', 'normal')
    expect(result).toEqual({
      success: false,
      error: 'Troca não encontrada ou já verificada.',
    })
  })

  it('only marks as verified when verified_at is null', async () => {
    const chain = makeVerifyChain({ id: 'trade-1' })
    mockFrom.mockReturnValue(chain)
    await verifyTrade('trade-1', 'user-1', 'normal')
    expect(chain.is).toHaveBeenCalledWith('verified_at', null)
  })
})
