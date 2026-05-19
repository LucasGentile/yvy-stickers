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
const FORCE_UNDO_DELAY_MS = 3 * 24 * 60 * 60 * 1000

export async function rollbackTrade(
  tradeId: string,
  userId: string,
  action: 'request' | 'confirm' | 'deny' | 'force',
  partialGivingIds?: string[],
  partialReceivingIds?: string[]
): Promise<RollbackResult> {
  if (!tradeId || !userId) return { success: false, error: 'Parâmetros inválidos.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: trade } = await (supabaseAdmin as any)
    .from('pending_trades')
    .select(
      'id, initiator_id, receiver_id, giving_ids, receiving_ids, status, accepted_at, rollback_requested_by, rollback_requested_at, rollback_giving_ids, rollback_receiving_ids'
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

    const updatePayload: Record<string, unknown> = {
      rollback_requested_by: userId,
      rollback_requested_at: new Date().toISOString(),
    }
    if (isPartial) {
      updatePayload.rollback_giving_ids = partialGivingIds ?? []
      updatePayload.rollback_receiving_ids = partialReceivingIds ?? []
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from('pending_trades')
      .update(updatePayload)
      .eq('id', tradeId)
      .eq('status', 'accepted')
    if (error) return { success: false, error: 'Erro ao solicitar desfazimento.' }

    // Log rollback request for both parties
    const givingToLog = isPartial ? (partialGivingIds ?? []) : trade.giving_ids
    const receivingToLog = isPartial ? (partialReceivingIds ?? []) : trade.receiving_ids
    ;(async () => {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, name')
        .in('id', [trade.initiator_id, trade.receiver_id])
      const initiatorName = formatName(
        users?.find((u) => u.id === trade.initiator_id)?.name ?? 'Usuário'
      )
      const receiverName = formatName(
        users?.find((u) => u.id === trade.receiver_id)?.name ?? 'Usuário'
      )
      const requesterName = userId === trade.initiator_id ? initiatorName : receiverName
      const otherPartyId = userId === trade.initiator_id ? trade.receiver_id : trade.initiator_id
      const otherName = userId === trade.initiator_id ? receiverName : initiatorName
      logAction(userId, 'trade_rollback_requested', {
        tradeId: trade.id,
        partnerName: otherName,
        requestedBy: requesterName,
        partial: isPartial,
        givingIds: userId === trade.initiator_id ? givingToLog : receivingToLog,
        receivingIds: userId === trade.initiator_id ? receivingToLog : givingToLog,
      })
      logAction(otherPartyId, 'trade_rollback_requested', {
        tradeId: trade.id,
        partnerName: requesterName,
        requestedBy: requesterName,
        partial: isPartial,
        givingIds: otherPartyId === trade.initiator_id ? givingToLog : receivingToLog,
        receivingIds: otherPartyId === trade.initiator_id ? receivingToLog : givingToLog,
      })
    })()

    return { success: true }
  }

  if (action === 'deny') {
    if (trade.rollback_requested_by === userId) {
      return { success: false, error: 'Você não pode negar sua própria solicitação.' }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from('pending_trades')
      .update({
        rollback_requested_by: null,
        rollback_requested_at: null,
        rollback_giving_ids: null,
        rollback_receiving_ids: null,
      })
      .eq('id', tradeId)
    if (error)
      return { success: false, error: 'Erro ao recusar desfazimento.' }

      // Log rollback denied for both parties
    ;(async () => {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, name')
        .in('id', [trade.initiator_id, trade.receiver_id])
      const initiatorName = formatName(
        users?.find((u) => u.id === trade.initiator_id)?.name ?? 'Usuário'
      )
      const receiverName = formatName(
        users?.find((u) => u.id === trade.receiver_id)?.name ?? 'Usuário'
      )
      const denierName = userId === trade.initiator_id ? initiatorName : receiverName
      const otherPartyId = userId === trade.initiator_id ? trade.receiver_id : trade.initiator_id
      const otherName = userId === trade.initiator_id ? receiverName : initiatorName
      logAction(userId, 'trade_rollback_denied', {
        tradeId: trade.id,
        partnerName: otherName,
        deniedBy: denierName,
      })
      logAction(otherPartyId, 'trade_rollback_denied', {
        tradeId: trade.id,
        partnerName: denierName,
        deniedBy: denierName,
      })
    })()

    return { success: true }
  }

  if (action === 'force') {
    if (!trade.rollback_requested_by) {
      return { success: false, error: 'Nenhuma solicitação de desfazimento pendente.' }
    }
    if (trade.rollback_requested_by !== userId) {
      return { success: false, error: 'Apenas quem solicitou o desfazimento pode forçá-lo.' }
    }
    const requestedAt = trade.rollback_requested_at
      ? new Date(trade.rollback_requested_at).getTime()
      : 0
    if (Date.now() - requestedAt < FORCE_UNDO_DELAY_MS) {
      return {
        success: false,
        error: 'Aguarde 3 dias após a solicitação para forçar o desfazimento.',
      }
    }
    // Fall through to the same rollback execution as 'confirm'
  }

  // action === 'confirm' or 'force' (after 3 days)
  if (!trade.rollback_requested_by) {
    return { success: false, error: 'Nenhuma solicitação de desfazimento pendente.' }
  }
  if (action === 'confirm' && trade.rollback_requested_by === userId) {
    return { success: false, error: 'Aguardando confirmação do outro participante.' }
  }

  // Atomic transition to rolled_back
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated } = await (supabaseAdmin as any)
    .from('pending_trades')
    .update({ status: 'rolled_back' })
    .eq('id', tradeId)
    .eq('status', 'accepted')
    .select('id')
    .maybeSingle()

  if (!updated) return { success: false, error: 'Troca já foi processada em outro dispositivo.' }

  const isForced = action === 'force'

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
    const initiatorName = formatName(
      users?.find((u) => u.id === trade.initiator_id)?.name ?? 'Usuário'
    )
    const receiverName = formatName(
      users?.find((u) => u.id === trade.receiver_id)?.name ?? 'Usuário'
    )
    const forcerName = isForced
      ? userId === trade.initiator_id
        ? initiatorName
        : receiverName
      : undefined
    logAction(trade.initiator_id, 'trade_rolled_back', {
      tradeId: trade.id,
      partnerName: receiverName,
      partial: isPartial,
      givingIds: givingToRevert,
      receivingIds: receivingToRevert,
      ...(isForced && { forcedBy: forcerName }),
    })
    logAction(trade.receiver_id, 'trade_rolled_back', {
      tradeId: trade.id,
      partnerName: initiatorName,
      partial: isPartial,
      givingIds: receivingToRevert,
      receivingIds: givingToRevert,
      ...(isForced && { forcedBy: forcerName }),
    })
  })()

  return { success: true }
}
