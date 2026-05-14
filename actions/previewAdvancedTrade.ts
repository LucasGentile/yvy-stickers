'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { findBestAdvancedTrade } from '@/lib/advancedMatching'
import { formatName } from '@/lib/format'

export type AdvancedTradePreview = {
  userA: { id: string; name: string }
  userB: { id: string; name: string }
  userC: { id: string; name: string }
  aGivesIds: string[]
  bGivesIds: string[]
  cGivesIds: string[]
}

export type PreviewAdvancedTradeResult =
  | { found: true; preview: AdvancedTradePreview }
  | { found: false; error?: string }

export async function previewAdvancedTrade(
  userId: string
): Promise<PreviewAdvancedTradeResult> {
  if (!userId) return { found: false, error: 'Usuário inválido.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabaseAdmin as any)
    .from('advanced_trades')
    .select('id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId},user_c_id.eq.${userId}`)
    .eq('status', 'pending')
    .limit(1)

  if (existing && existing.length > 0) {
    return { found: false, error: 'Você já tem uma troca avançada pendente.' }
  }

  const proposal = await findBestAdvancedTrade(userId)
  if (!proposal) return { found: false }

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name')
    .in('id', [proposal.userAId, proposal.userBId, proposal.userCId])

  const nameMap = Object.fromEntries(
    (users ?? []).map((u) => [u.id, formatName(u.name)])
  )

  return {
    found: true,
    preview: {
      userA: { id: proposal.userAId, name: nameMap[proposal.userAId] ?? 'Usuário' },
      userB: { id: proposal.userBId, name: nameMap[proposal.userBId] ?? 'Usuário' },
      userC: { id: proposal.userCId, name: nameMap[proposal.userCId] ?? 'Usuário' },
      aGivesIds: proposal.aGivesIds,
      bGivesIds: proposal.bGivesIds,
      cGivesIds: proposal.cGivesIds,
    },
  }
}
