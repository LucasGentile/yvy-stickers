'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { decrementDupes, addToCollection } from './tradeOps'

export type AdvancedTradeEffectuateResult = { success: true } | { success: false; error: string }

export async function effectuateAdvancedTrade(
  userAId: string,
  userBId: string,
  userCId: string,
  aGivesIds: string[],
  bGivesIds: string[],
  cGivesIds: string[]
): Promise<AdvancedTradeEffectuateResult> {
  if (aGivesIds.length === 0 && bGivesIds.length === 0 && cGivesIds.length === 0) {
    return { success: false, error: 'Nenhuma figurinha na troca.' }
  }

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, input_mode')
    .in('id', [userAId, userBId, userCId])

  if (!users || users.length < 3) {
    return { success: false, error: 'Usuários não encontrados.' }
  }

  const modeMap = Object.fromEntries(users.map((u) => [u.id, u.input_mode]))

  // Validate all three givers in parallel
  const allConflicts = (
    await Promise.all(
      (
        [
          [userAId, aGivesIds],
          [userBId, bGivesIds],
          [userCId, cGivesIds],
        ] as [string, string[]][]
      ).map(async ([giverId, ids]) => {
        const [{ data: dupes }, { data: pendingTrades }] = await Promise.all([
          supabaseAdmin
            .from('user_duplicates')
            .select('sticker_id, count')
            .eq('user_id', giverId)
            .in('sticker_id', ids),
          supabaseAdmin
            .from('pending_trades')
            .select('initiator_id, giving_ids, receiving_ids')
            .or(`initiator_id.eq.${giverId},receiver_id.eq.${giverId}`)
            .eq('status', 'pending'),
        ])
        const dupeMap = Object.fromEntries((dupes ?? []).map((d) => [d.sticker_id, d.count]))
        const reserved: Record<string, number> = {}
        for (const trade of pendingTrades ?? []) {
          const giving = trade.initiator_id === giverId ? trade.giving_ids : trade.receiving_ids
          for (const id of giving ?? []) reserved[id] = (reserved[id] ?? 0) + 1
        }
        return ids.filter((id) => (dupeMap[id] ?? 0) - (reserved[id] ?? 0) <= 0)
      })
    )
  ).flat()

  if (allConflicts.length > 0) {
    return {
      success: false,
      error: `Figurinha(s) não disponível(eis): ${allConflicts.join(', ')}`,
    }
  }

  // Execute all six legs in parallel — each touches disjoint (user_id, sticker_id) rows
  await Promise.all([
    decrementDupes(userAId, aGivesIds),
    addToCollection(userBId, modeMap[userBId], aGivesIds),
    decrementDupes(userBId, bGivesIds),
    addToCollection(userCId, modeMap[userCId], bGivesIds),
    decrementDupes(userCId, cGivesIds),
    addToCollection(userAId, modeMap[userAId], cGivesIds),
  ])

  return { success: true }
}
