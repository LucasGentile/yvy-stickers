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

  // Check that none of the giving stickers are already reserved in another pending trade
  if (givingIds.length > 0) {
    const { data: existingTrades } = await supabaseAdmin
      .from('pending_trades')
      .select('initiator_id, giving_ids, receiving_ids')
      .or(`initiator_id.eq.${initiatorId},receiver_id.eq.${initiatorId}`)
      .eq('status', 'pending')

    const reservedByMe = new Set<string>()
    for (const trade of existingTrades ?? []) {
      const myGiving =
        trade.initiator_id === initiatorId ? trade.giving_ids : trade.receiving_ids
      for (const id of myGiving ?? []) reservedByMe.add(id)
    }

    const conflicts = givingIds.filter((id) => reservedByMe.has(id))
    if (conflicts.length > 0) {
      return {
        success: false,
        error: `Figurinha${conflicts.length > 1 ? 's' : ''} já reservada${conflicts.length > 1 ? 's' : ''} em outra troca: ${conflicts.join(', ')}`,
      }
    }
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
