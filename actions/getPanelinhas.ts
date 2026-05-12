'use server'

import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { formatName } from '@/lib/format'

export type Panelinha = {
  rank: number
  user1Name: string
  user2Name: string
  tradeCount: number
}

async function computePanelinhas(): Promise<Panelinha[]> {
  const { data: trades, error } = await supabaseAdmin
    .from('pending_trades')
    .select('initiator_id, receiver_id')
    .eq('status', 'accepted')

  if (error || !trades || trades.length === 0) return []

  // Normalize pairs so (A,B) and (B,A) are treated as the same
  const pairCounts: Record<string, { user1: string; user2: string; count: number }> = {}
  for (const trade of trades) {
    const [u1, u2] = [trade.initiator_id, trade.receiver_id].sort()
    const key = `${u1}:${u2}`
    if (!pairCounts[key]) pairCounts[key] = { user1: u1, user2: u2, count: 0 }
    pairCounts[key].count++
  }

  const pairs = Object.values(pairCounts).sort((a, b) => b.count - a.count)
  if (pairs.length === 0) return []

  // Fetch all involved user names in one query
  const allUserIds = [...new Set(pairs.flatMap((p) => [p.user1, p.user2]))]
  const { data: users } = await supabaseAdmin.from('users').select('id, name').in('id', allUserIds)

  const nameMap = Object.fromEntries((users ?? []).map((u) => [u.id, formatName(u.name)]))

  return pairs.map((p, i) => ({
    rank: i + 1,
    user1Name: nameMap[p.user1] ?? 'Usuário',
    user2Name: nameMap[p.user2] ?? 'Usuário',
    tradeCount: p.count,
  }))
}

const cachedPanelinhas = unstable_cache(computePanelinhas, ['panelinhas'], { revalidate: 300 })

export async function getPanelinhas(): Promise<Panelinha[]> {
  return cachedPanelinhas()
}
