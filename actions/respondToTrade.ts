'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { effectuateTrade } from './effectuateTrade'
import { logAction } from './logAction'
import { formatName } from '@/lib/format'

export type RespondResult = { success: true } | { success: false; error: string }

export async function respondToTrade(
  tradeId: string,
  userId: string,
  action: 'accept' | 'reject' | 'cancel',
  partialMyGivingIds?: string[],
  partialMyReceivingIds?: string[]
): Promise<RespondResult> {
  if (!tradeId || !userId) {
    return { success: false, error: 'Parâmetros inválidos.' }
  }

  const { data: trade } = await supabaseAdmin
    .from('pending_trades')
    .select('id, initiator_id, receiver_id, giving_ids, receiving_ids, status')
    .eq('id', tradeId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!trade) {
    return { success: false, error: 'Pedido não encontrado ou já processado.' }
  }

  if (action === 'cancel' && trade.initiator_id !== userId) {
    return { success: false, error: 'Apenas quem criou o pedido pode cancelá-lo.' }
  }
  if ((action === 'accept' || action === 'reject') && trade.receiver_id !== userId) {
    return { success: false, error: 'Apenas o destinatário pode aceitar ou recusar.' }
  }

  // Resolve the effective giving/receiving IDs for partial acceptance.
  // DB perspective: giving_ids = what initiator gives, receiving_ids = what initiator wants.
  // Caller perspective (receiver): myGivingIds = trade.receiving_ids, myReceivingIds = trade.giving_ids.
  // So we translate:
  //   new DB giving_ids   = partialMyReceivingIds (what receiver gets = what initiator originally offered)
  //   new DB receiving_ids = partialMyGivingIds   (what receiver gives = what initiator originally wanted)
  let effectiveGivingIds = trade.giving_ids
  let effectiveReceivingIds = trade.receiving_ids

  if (action === 'accept' && (partialMyGivingIds !== undefined || partialMyReceivingIds !== undefined)) {
    const resolvedMyGiving = partialMyGivingIds ?? []
    const resolvedMyReceiving = partialMyReceivingIds ?? []

    if (resolvedMyGiving.length === 0 && resolvedMyReceiving.length === 0) {
      return { success: false, error: 'Selecione ao menos uma figurinha.' }
    }

    // Validate subsets (caller perspective):
    // myGivingIds (caller) = trade.receiving_ids (DB); myReceivingIds (caller) = trade.giving_ids (DB)
    const originalMyGiving = new Set(trade.receiving_ids)
    const originalMyReceiving = new Set(trade.giving_ids)

    for (const id of resolvedMyGiving) {
      if (!originalMyGiving.has(id)) {
        return { success: false, error: 'IDs inválidos em partialMyGivingIds.' }
      }
    }
    for (const id of resolvedMyReceiving) {
      if (!originalMyReceiving.has(id)) {
        return { success: false, error: 'IDs inválidos em partialMyReceivingIds.' }
      }
    }

    // Translate back to DB (initiator) perspective
    effectiveGivingIds = resolvedMyReceiving   // what initiator gives = what receiver receives
    effectiveReceivingIds = resolvedMyGiving   // what initiator wants = what receiver gives
  }

  const statusMap = { accept: 'accepted', reject: 'rejected', cancel: 'cancelled' } as const
  const newStatus = statusMap[action]

  // Atomic status transition: only one concurrent call can win this update.
  // If the trade was already processed on another device, `updated` will be null.
  const updatePayload: Record<string, unknown> = { status: newStatus }
  if (action === 'accept') {
    updatePayload.accepted_at = new Date().toISOString()
    // If partial, persist the accepted subset in the DB record
    if (partialMyGivingIds !== undefined || partialMyReceivingIds !== undefined) {
      updatePayload.giving_ids = effectiveGivingIds
      updatePayload.receiving_ids = effectiveReceivingIds
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated } = await (supabaseAdmin as any)
    .from('pending_trades')
    .update(updatePayload)
    .eq('id', tradeId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (!updated) {
    return { success: false, error: 'Pedido já foi processado em outro dispositivo.' }
  }

  if (action === 'accept') {
    const tradeResult = await effectuateTrade(
      trade.initiator_id,
      trade.receiver_id,
      effectiveGivingIds,
      effectiveReceivingIds
    )
    if (!tradeResult.success) {
      // Revert status so the user can retry
      await supabaseAdmin.from('pending_trades').update({ status: 'pending' }).eq('id', tradeId)
      return { success: false, error: tradeResult.error }
    }
  }

  // Fire-and-forget: look up both names and log for all affected parties
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

    if (action === 'accept') {
      // Log for both parties so each has a checklist entry in their history
      // Use effectiveGivingIds/effectiveReceivingIds so partial trades log correctly
      logAction(trade.receiver_id, 'trade_accepted', {
        tradeId: trade.id,
        partnerName: initiatorName,
        givingIds: effectiveReceivingIds, // receiver gives what initiator requested
        receivingIds: effectiveGivingIds, // receiver gets what initiator offered
      })
      logAction(trade.initiator_id, 'trade_accepted', {
        tradeId: trade.id,
        partnerName: receiverName,
        givingIds: effectiveGivingIds,
        receivingIds: effectiveReceivingIds,
      })
    } else if (action === 'reject') {
      logAction(userId, 'trade_rejected', { partnerName: initiatorName })
    } else {
      logAction(userId, 'trade_cancelled', { partnerName: receiverName })
    }
  })()

  return { success: true }
}
