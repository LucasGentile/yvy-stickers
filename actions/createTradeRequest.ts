'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { logAction } from './logAction'

export type CreateTradeResult =
  | { success: true; tradeId: string }
  | { success: false; error: string }

export async function createTradeRequest(
  initiatorId: string,
  receiverId: string,
  givingIds: string[],
  receivingIds: string[]
): Promise<CreateTradeResult> {
  if (!initiatorId || !receiverId) {
    return { success: false, error: 'Usuários inválidos.' }
  }
  if (initiatorId === receiverId) {
    return { success: false, error: 'Não é possível criar uma troca consigo mesmo.' }
  }
  if (givingIds.length === 0 && receivingIds.length === 0) {
    return { success: false, error: 'Nenhuma figurinha selecionada.' }
  }

  const { data, error } = await supabaseAdmin
    .from('pending_trades')
    .insert({
      initiator_id: initiatorId,
      receiver_id: receiverId,
      giving_ids: givingIds,
      receiving_ids: receivingIds,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: 'Erro ao criar pedido de troca.' }
  }

  // Fire-and-forget: look up receiver name and log
  ;(async () => {
    const { data: receiver } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', receiverId)
      .maybeSingle()
    logAction(initiatorId, 'trade_sent', {
      partnerName: receiver?.name ?? 'Usuário',
      givingCount: givingIds.length,
      receivingCount: receivingIds.length,
    })
  })()

  return { success: true, tradeId: data.id }
}
