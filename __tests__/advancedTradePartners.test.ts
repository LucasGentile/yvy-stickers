import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/lib/format', () => ({
  formatName: (name: string) => name.toLowerCase(),
}))

import { getAdvancedTradePartners } from '@/actions/getAdvancedTradePartners'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

type Row = { id: string; name: string; user_duplicates: { count: number }[] }

function makeQueryChain(data: Row[]) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.neq = vi.fn().mockResolvedValue({ data, error: null })
  return chain
}

describe('getAdvancedTradePartners', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when userId is falsy', async () => {
    const result = await getAdvancedTradePartners('')
    expect(result).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('filters out users with no duplicates', async () => {
    mockFrom.mockReturnValue(
      makeQueryChain([
        { id: 'user-2', name: 'alice', user_duplicates: [] },
        { id: 'user-3', name: 'bob', user_duplicates: [{ count: 0 }] },
      ])
    )
    const result = await getAdvancedTradePartners('user-1')
    expect(result).toEqual([])
  })

  it('includes users with at least one duplicate of count ≥ 1', async () => {
    mockFrom.mockReturnValue(
      makeQueryChain([
        { id: 'user-2', name: 'charlie', user_duplicates: [{ count: 1 }] },
        { id: 'user-3', name: 'bob', user_duplicates: [] },
      ])
    )
    const result = await getAdvancedTradePartners('user-1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('user-2')
  })

  it('returns partners sorted alphabetically by formatted name', async () => {
    mockFrom.mockReturnValue(
      makeQueryChain([
        { id: 'user-z', name: 'zara', user_duplicates: [{ count: 2 }] },
        { id: 'user-a', name: 'ana', user_duplicates: [{ count: 1 }] },
        { id: 'user-m', name: 'marco', user_duplicates: [{ count: 3 }] },
      ])
    )
    const result = await getAdvancedTradePartners('user-1')
    expect(result.map((r) => r.id)).toEqual(['user-a', 'user-m', 'user-z'])
  })

  it('applies formatName to each result', async () => {
    mockFrom.mockReturnValue(
      makeQueryChain([{ id: 'user-2', name: 'ALICE SILVA', user_duplicates: [{ count: 1 }] }])
    )
    const result = await getAdvancedTradePartners('user-1')
    expect(result[0].name).toBe('alice silva')
  })

  it('queries with correct filters excluding the requesting user', async () => {
    const chain = makeQueryChain([])
    mockFrom.mockReturnValue(chain)
    await getAdvancedTradePartners('user-1')
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(chain.neq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('returns empty array when database returns null', async () => {
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.neq = vi.fn().mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chain)
    const result = await getAdvancedTradePartners('user-1')
    expect(result).toEqual([])
  })
})
