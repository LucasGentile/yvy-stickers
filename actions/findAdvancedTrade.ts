'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { findBestAdvancedTrade, type AdvancedTradeProposal } from '@/lib/advancedMatching'
import { logAction } from './logAction'
import { formatName } from '@/lib/format'

export type FindAdvancedTradeResult =
  | { found: true; tradeId: string; proposal: AdvancedTradeProposal }
  | { found: false; error?: string }

export async function findAdvancedTrade(
  userId: string,
  selectedProposal?: AdvancedTradeProposal
): Promise<FindAdvancedTradeResult> {
  if (!userId) return { found: false, error: 'Usuário inválido.' }

  const proposal = selectedProposal ?? (await findBestAdvancedTrade(userId))
  if (!proposal) return { found: false }

  const userAStatus = proposal.userAId === userId ? 'approved' : 'pending'
  const userBStatus = proposal.userBId === userId ? 'approved' : 'pending'
  const userCStatus = proposal.userCId === userId ? 'approved' : 'pending'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from('advanced_trades')
    .insert({
      user_a_id: proposal.userAId,
      user_b_id: proposal.userBId,
      user_c_id: proposal.userCId,
      a_gives_ids: proposal.aGivesIds,
      b_gives_ids: proposal.bGivesIds,
      c_gives_ids: proposal.cGivesIds,
      user_a_status: userAStatus,
      user_b_status: userBStatus,
      user_c_status: userCStatus,
      requested_by: userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { found: false, error: 'Erro ao criar proposta de troca avançada.' }
  }

  // Fire-and-forget: log for all participants
  ;(async () => {
    try {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, name')
        .in('id', [proposal.userAId, proposal.userBId, proposal.userCId])
      const nameMap = Object.fromEntries((users ?? []).map((u) => [u.id, formatName(u.name)]))
      const participants = [proposal.userAId, proposal.userBId, proposal.userCId]
      for (const pid of participants) {
        const others = participants.filter((id) => id !== pid).map((id) => nameMap[id] ?? 'Usuário')
        logAction(pid, 'advanced_trade_proposed', {
          tradeId: data.id,
          partners: others,
          isRequester: pid === userId,
        })
      }
    } catch {
      /* logging is best-effort */
    }
  })()

  return { found: true, tradeId: data.id, proposal }
}
