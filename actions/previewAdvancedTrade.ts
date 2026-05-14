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
}

export type PreviewAdvancedTradeResult =
  | { found: true; previews: AdvancedTradePreview[] }
  | { found: false; error?: string }

export async function previewAdvancedTrade(
  userId: string
): Promise<PreviewAdvancedTradeResult> {
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

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name')
    .in('id', [...allIds])

  const nameMap = Object.fromEntries(
    (users ?? []).map((u) => [u.id, formatName(u.name)])
  )

  const previews: AdvancedTradePreview[] = proposals.map((p) => ({
    userA: { id: p.userAId, name: nameMap[p.userAId] ?? 'Usuário' },
    userB: { id: p.userBId, name: nameMap[p.userBId] ?? 'Usuário' },
    userC: { id: p.userCId, name: nameMap[p.userCId] ?? 'Usuário' },
    aGivesIds: p.aGivesIds,
    bGivesIds: p.bGivesIds,
    cGivesIds: p.cGivesIds,
    score: p.score,
  }))

  return { found: true, previews }
}
