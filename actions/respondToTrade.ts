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
  const { data: updated } = await supabaseAdmin
    .from('pending_trades')
    .update({ status: newStatus })
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

  // Fire-and-forget: look up partner name and log
  ;(async () => {
    const partnerId = action === 'cancel' ? trade.receiver_id : trade.initiator_id
    const { data: partner } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', partnerId)
      .maybeSingle()
    const partnerName = partner?.name ?? 'Usuário'
    const actionKey = `trade_${newStatus}` as const
    // From receiver's perspective: giving/receiving are swapped vs the trade record
    const givingCount =
      userId === trade.receiver_id ? trade.receiving_ids.length : trade.giving_ids.length
    const receivingCount =
      userId === trade.receiver_id ? trade.giving_ids.length : trade.receiving_ids.length
    const receivingIds = userId === trade.receiver_id ? trade.giving_ids : trade.receiving_ids
    logAction(userId, actionKey, {
      partnerName,
      givingCount,
      receivingCount,
      ...(action === 'accept' ? { receivingIds } : {}),
    })
  })()

  return { success: true }
}
