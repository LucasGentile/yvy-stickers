'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type CreateTradeResult =
  | { success: true; tradeId: string }
  | { success: false; error: string }

export async function createTradeRequest(
  initiatorId: string,
  receiverId: string,
  givingIds: string[],
  receivingIds: string[],
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

  return { success: true, tradeId: data.id }
}
