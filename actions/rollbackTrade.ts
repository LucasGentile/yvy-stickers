'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { logAction } from './logAction'
import { formatName } from '@/lib/format'

export type RollbackResult = { success: true } | { success: false; error: string }

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

// partialGivingIds / partialReceivingIds are from the trade's initiator perspective.
// Pass them (even as []) to request a partial rollback; omit both for a full rollback.
export async function rollbackTrade(
  tradeId: string,
  userId: string,
  action: 'request' | 'confirm' | 'deny',
  partialGivingIds?: string[],
  partialReceivingIds?: string[]
): Promise<RollbackResult> {
  if (!tradeId || !userId) return { success: false, error: 'Parâmetros inválidos.' }

  const { data: trade } = await (supabaseAdmin as any)
    .from('pending_trades')
    .select(
      'id, initiator_id, receiver_id, giving_ids, receiving_ids, status, accepted_at, rollback_requested_by, rollback_giving_ids, rollback_receiving_ids'
    )
    .eq('id', tradeId)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!trade) return { success: false, error: 'Troca não encontrada ou já processada.' }

  const isParty = trade.initiator_id === userId || trade.receiver_id === userId
  if (!isParty) return { success: false, error: 'Você não faz parte desta troca.' }

  if (action === 'request') {
    if (trade.rollback_requested_by) {
      return { success: false, error: 'Desfazimento já solicitado.' }
    }

    const isPartial = partialGivingIds !== undefined || partialReceivingIds !== undefined
    if (isPartial) {
      const pGiving = partialGivingIds ?? []
      const pReceiving = partialReceivingIds ?? []
      if (pGiving.length === 0 && pReceiving.length === 0) {
        return { success: false, error: 'Selecione pelo menos uma figurinha para desfazer.' }
      }
      const invalidGiving = pGiving.filter((id) => !trade.giving_ids.includes(id))
      const invalidReceiving = pReceiving.filter((id) => !trade.receiving_ids.includes(id))
      if (invalidGiving.length > 0 || invalidReceiving.length > 0) {
        return { success: false, error: 'Figurinhas inválidas para esta troca.' }
      }
    }

    const updatePayload: Record<string, unknown> = { rollback_requested_by: userId }
    if (isPartial) {
      updatePayload.rollback_giving_ids = partialGivingIds ?? []
      updatePayload.rollback_receiving_ids = partialReceivingIds ?? []
    }
    const { error } = await (supabaseAdmin as any)
      .from('pending_trades')
      .update(updatePayload)
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
      .update({ rollback_requested_by: null, rollback_giving_ids: null, rollback_receiving_ids: null })
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

  // NULL means "revert all"; an explicit array (even empty) limits the scope
  const givingToRevert: string[] = trade.rollback_giving_ids ?? trade.giving_ids
  const receivingToRevert: string[] = trade.rollback_receiving_ids ?? trade.receiving_ids
  const isPartial = trade.rollback_giving_ids !== null || trade.rollback_receiving_ids !== null

  await Promise.all([
    restoreDupe(trade.initiator_id, givingToRevert),
    removeFromCollection(trade.initiator_id, receivingToRevert),
    restoreDupe(trade.receiver_id, receivingToRevert),
    removeFromCollection(trade.receiver_id, givingToRevert),
  ])

  ;(async () => {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', [trade.initiator_id, trade.receiver_id])
    const initiatorName = formatName(users?.find((u) => u.id === trade.initiator_id)?.name ?? 'Usuário')
    const receiverName = formatName(users?.find((u) => u.id === trade.receiver_id)?.name ?? 'Usuário')
    logAction(trade.initiator_id, 'trade_rolled_back', { partnerName: receiverName, partial: isPartial })
    logAction(trade.receiver_id, 'trade_rolled_back', { partnerName: initiatorName, partial: isPartial })
  })()

  return { success: true }
}
