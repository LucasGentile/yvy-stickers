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

  try {
    console.log('[findAdvancedTrade] Starting for userId:', userId)

    // Check if user already has a pending advanced trade
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: existingError } = await (supabaseAdmin as any)
      .from('advanced_trades')
      .select('id')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId},user_c_id.eq.${userId}`)
      .eq('status', 'pending')
      .limit(1)

    if (existingError) {
      console.error('[findAdvancedTrade] Error checking existing trades:', existingError)
      return { found: false, error: `Erro ao verificar trocas existentes: ${existingError.message}` }
    }

    if (existing && existing.length > 0) {
      console.log('[findAdvancedTrade] User already has pending advanced trade:', existing[0].id)
      return { found: false, error: 'Você já tem uma troca avançada pendente.' }
    }

    console.log('[findAdvancedTrade] No existing pending trades, resolving proposal...')
    const proposal = selectedProposal ?? await findBestAdvancedTrade(userId)

    if (!proposal) {
      console.log('[findAdvancedTrade] No valid cycle found')
      return { found: false }
    }

    console.log('[findAdvancedTrade] Proposal found:', {
      userA: proposal.userAId,
      userB: proposal.userBId,
      userC: proposal.userCId,
      aGives: proposal.aGivesIds,
      bGives: proposal.bGivesIds,
      cGives: proposal.cGivesIds,
    })

    // Determine which slot the requester occupies and auto-approve
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
      console.error('[findAdvancedTrade] Insert error:', error)
      return { found: false, error: `Erro ao criar proposta: ${error?.message ?? 'dados nulos'}` }
    }

    console.log('[findAdvancedTrade] Trade created successfully:', data.id)

    // Fire-and-forget: log for all participants
    ;(async () => {
      try {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, name')
          .in('id', [proposal.userAId, proposal.userBId, proposal.userCId])
        const nameMap = Object.fromEntries(
          (users ?? []).map((u) => [u.id, formatName(u.name)])
        )
        const participants = [proposal.userAId, proposal.userBId, proposal.userCId]
        for (const pid of participants) {
          const others = participants.filter((id) => id !== pid).map((id) => nameMap[id] ?? 'Usuário')
          logAction(pid, 'advanced_trade_proposed', {
            tradeId: data.id,
            partners: others,
            isRequester: pid === userId,
          })
        }
      } catch (e) {
        console.error('[findAdvancedTrade] Logging error:', e)
      }
    })()

    return { found: true, tradeId: data.id, proposal }
  } catch (e) {
    console.error('[findAdvancedTrade] Unexpected error:', e)
    return { found: false, error: `Erro inesperado: ${e instanceof Error ? e.message : String(e)}` }
  }
}
