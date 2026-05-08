'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { logAction } from './logAction'

export type RollbackResult = { success: true } | { success: false; error: string }

const ROLLBACK_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

function isWithinWindow(acceptedAt: string): boolean {
  return Date.now() - new Date(acceptedAt).getTime() < ROLLBACK_WINDOW_MS
}

async function restoreDupe(userId: string, ids: string[]) {
  for (const sid of ids) {
    const { data } = await supabaseAdmin
      .from('user_duplicates')
      .select('count')
      .eq('user_id', userId)
      .eq('sticker_id', sid)
      .maybeSingle()
    if (data) {
      await supabaseAdmin
        .from('user_duplicates')
        .update({ count: data.count + 1 })
        .eq('user_id', userId)
        .eq('sticker_id', sid)
    } else {
      await supabaseAdmin
        .from('user_duplicates')
        .insert({ user_id: userId, sticker_id: sid, count: 1 })
    }
  }
}

async function removeFromCollection(userId: string, ids: string[]) {
  if (ids.length === 0) return
  await supabaseAdmin.from('user_stickers').delete().eq('user_id', userId).in('sticker_id', ids)
}

export async function rollbackTrade(
  tradeId: string,
  userId: string,
  action: 'request' | 'confirm' | 'deny'
): Promise<RollbackResult> {
  if (!tradeId || !userId) return { success: false, error: 'Parâmetros inválidos.' }

  const { data: trade } = await (supabaseAdmin as any)
    .from('pending_trades')
    .select(
      'id, initiator_id, receiver_id, giving_ids, receiving_ids, status, accepted_at, rollback_requested_by'
    )
    .eq('id', tradeId)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!trade) return { success: false, error: 'Troca não encontrada ou já processada.' }

  if (!trade.accepted_at || !isWithinWindow(trade.accepted_at)) {
    return { success: false, error: 'Prazo de 10 minutos para desfazer a troca expirou.' }
  }

  const isParty = trade.initiator_id === userId || trade.receiver_id === userId
  if (!isParty) return { success: false, error: 'Você não faz parte desta troca.' }

  if (action === 'request') {
    if (trade.rollback_requested_by) {
      return { success: false, error: 'Desfazimento já solicitado.' }
    }
    const { error } = await (supabaseAdmin as any)
      .from('pending_trades')
      .update({ rollback_requested_by: userId })
      .eq('id', tradeId)
      .eq('status', 'accepted')
    if (error) return { success: false, error: 'Erro ao solicitar desfazimento.' }
    return { success: true }
  }

  if (action === 'deny') {
    if (trade.rollback_requested_by === userId) {
      return { success: false, error: 'Você não pode negar sua própria solicitação.' }
    }
    const { error } = await (supabaseAdmin as any)
      .from('pending_trades')
      .update({ rollback_requested_by: null })
      .eq('id', tradeId)
    if (error) return { success: false, error: 'Erro ao recusar desfazimento.' }
    return { success: true }
  }

  // action === 'confirm'
  if (!trade.rollback_requested_by) {
    return { success: false, error: 'Nenhuma solicitação de desfazimento pendente.' }
  }
  if (trade.rollback_requested_by === userId) {
    return { success: false, error: 'Aguardando confirmação do outro participante.' }
  }

  // Atomic transition to rolled_back
  const { data: updated } = await (supabaseAdmin as any)
    .from('pending_trades')
    .update({ status: 'rolled_back' })
    .eq('id', tradeId)
    .eq('status', 'accepted')
    .select('id')
    .maybeSingle()

  if (!updated) return { success: false, error: 'Troca já foi processada em outro dispositivo.' }

  // Reverse the trade:
  // Initiator gave giving_ids → restore to their dupes; received receiving_ids → remove from their collection
  // Receiver gave receiving_ids → restore to their dupes; received giving_ids → remove from their collection
  await Promise.all([
    restoreDupe(trade.initiator_id, trade.giving_ids),
    removeFromCollection(trade.initiator_id, trade.receiving_ids),
    restoreDupe(trade.receiver_id, trade.receiving_ids),
    removeFromCollection(trade.receiver_id, trade.giving_ids),
  ])

  // Log for both parties
  ;(async () => {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', [trade.initiator_id, trade.receiver_id])
    const initiatorName = users?.find((u) => u.id === trade.initiator_id)?.name ?? 'Usuário'
    const receiverName = users?.find((u) => u.id === trade.receiver_id)?.name ?? 'Usuário'
    logAction(trade.initiator_id, 'trade_rolled_back', { partnerName: receiverName })
    logAction(trade.receiver_id, 'trade_rolled_back', { partnerName: initiatorName })
  })()

  return { success: true }
}
