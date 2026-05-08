'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { effectuateTrade } from './effectuateTrade'
import { logAction } from './logAction'

export type RespondResult = { success: true } | { success: false; error: string }

export async function respondToTrade(
  tradeId: string,
  userId: string,
  action: 'accept' | 'reject' | 'cancel'
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

  const statusMap = { accept: 'accepted', reject: 'rejected', cancel: 'cancelled' } as const
  const newStatus = statusMap[action]

  // Atomic status transition: only one concurrent call can win this update.
  // If the trade was already processed on another device, `updated` will be null.
  const updatePayload: Record<string, unknown> = { status: newStatus }
  if (action === 'accept') updatePayload.accepted_at = new Date().toISOString()

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
      trade.giving_ids,
      trade.receiving_ids
    )
    if (!tradeResult.success) {
      // Revert status so the user can retry
      await supabaseAdmin
        .from('pending_trades')
        .update({ status: 'pending' })
        .eq('id', tradeId)
      return { success: false, error: tradeResult.error }
    }
  }

  // Fire-and-forget: look up both names and log for all affected parties
  ;(async () => {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', [trade.initiator_id, trade.receiver_id])
    const initiatorName = users?.find((u) => u.id === trade.initiator_id)?.name ?? 'Usuário'
    const receiverName = users?.find((u) => u.id === trade.receiver_id)?.name ?? 'Usuário'

    if (action === 'accept') {
      // Log for both parties so each has a checklist entry in their history
      logAction(trade.receiver_id, 'trade_accepted', {
        tradeId: trade.id,
        partnerName: initiatorName,
        givingIds: trade.receiving_ids, // receiver gives what initiator requested
        receivingIds: trade.giving_ids, // receiver gets what initiator offered
      })
      logAction(trade.initiator_id, 'trade_accepted', {
        tradeId: trade.id,
        partnerName: receiverName,
        givingIds: trade.giving_ids,
        receivingIds: trade.receiving_ids,
      })
    } else if (action === 'reject') {
      logAction(userId, 'trade_rejected', { partnerName: initiatorName })
    } else {
      logAction(userId, 'trade_cancelled', { partnerName: receiverName })
    }
  })()

  return { success: true }
}
