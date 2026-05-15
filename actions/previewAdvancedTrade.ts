'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { findAllAdvancedTrades } from '@/lib/advancedMatching'
import { formatName } from '@/lib/format'

export type AdvancedTradePreview = {
  userA: { id: string; name: string }
  userB: { id: string; name: string }
  userC: { id: string; name: string }
  aGivesIds: string[]
  bGivesIds: string[]
  cGivesIds: string[]
  score: number
  previouslyCanceled: boolean
}

export type PreviewAdvancedTradeResult =
  | { found: true; previews: AdvancedTradePreview[] }
  | { found: false; error?: string }

export async function previewAdvancedTrade(userId: string): Promise<PreviewAdvancedTradeResult> {
  if (!userId) return { found: false, error: 'Usuário inválido.' }

  const proposals = await findAllAdvancedTrades(userId)
  if (proposals.length === 0) return { found: false }

  // Collect all unique user IDs to resolve names in one query
  const allIds = new Set<string>()
  for (const p of proposals) {
    allIds.add(p.userAId)
    allIds.add(p.userBId)
    allIds.add(p.userCId)
  }

  const [{ data: users }, { data: canceledAdvanced }] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', [...allIds]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin as any)
      .from('advanced_trades')
      .select('user_a_id, user_b_id, user_c_id')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId},user_c_id.eq.${userId}`)
      .in('status', ['cancelled', 'rejected']),
  ])

  const canceledTrios = new Set<string>(
    (
      (canceledAdvanced ?? []) as Array<{ user_a_id: string; user_b_id: string; user_c_id: string }>
    ).map((t) => [t.user_a_id, t.user_b_id, t.user_c_id].sort().join(':'))
  )

  const nameMap = Object.fromEntries(
    (users ?? []).map((u: { id: string; name: string }) => [u.id, formatName(u.name)])
  )

  const previews: AdvancedTradePreview[] = proposals.map((p) => {
    const trioKey = [p.userAId, p.userBId, p.userCId].sort().join(':')
    return {
      userA: { id: p.userAId, name: nameMap[p.userAId] ?? 'Usuário' },
      userB: { id: p.userBId, name: nameMap[p.userBId] ?? 'Usuário' },
      userC: { id: p.userCId, name: nameMap[p.userCId] ?? 'Usuário' },
      aGivesIds: p.aGivesIds,
      bGivesIds: p.bGivesIds,
      cGivesIds: p.cGivesIds,
      score: p.score,
      previouslyCanceled: canceledTrios.has(trioKey),
    }
  })

  return { found: true, previews }
}
