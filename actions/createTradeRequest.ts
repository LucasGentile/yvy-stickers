'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { logAction } from './logAction'
import { formatName } from '@/lib/format'

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

  // Check that giving stickers have enough free copies (not fully reserved in other pending trades)
  if (givingIds.length > 0) {
    const [{ data: existingTrades }, { data: dupes }] = await Promise.all([
      supabaseAdmin
        .from('pending_trades')
        .select('initiator_id, giving_ids, receiving_ids')
        .or(`initiator_id.eq.${initiatorId},receiver_id.eq.${initiatorId}`)
        .eq('status', 'pending'),
      supabaseAdmin
        .from('user_duplicates')
        .select('sticker_id, count')
        .eq('user_id', initiatorId)
        .in('sticker_id', givingIds),
    ])

    // Count how many copies of each sticker are already committed to pending trades
    const reservedCounts: Record<string, number> = {}
    for (const trade of existingTrades ?? []) {
      const myGiving = trade.initiator_id === initiatorId ? trade.giving_ids : trade.receiving_ids
      for (const id of myGiving ?? []) reservedCounts[id] = (reservedCounts[id] ?? 0) + 1
    }

    const dupeCount: Record<string, number> = {}
    for (const d of dupes ?? []) dupeCount[d.sticker_id] = d.count

    // Block only if sticker is reserved AND has no free copies left
    const conflicts = givingIds.filter((id) => {
      const reserved = reservedCounts[id] ?? 0
      return reserved > 0 && reserved >= (dupeCount[id] ?? 0)
    })
    if (conflicts.length > 0) {
      return {
        success: false,
        error: `Figurinha${conflicts.length > 1 ? 's' : ''} já reservada${conflicts.length > 1 ? 's' : ''} em outra troca: ${conflicts.join(', ')}`,
      }
    }
  }

  // Check that the receiver has enough free copies of the stickers they are expected to give
  if (receivingIds.length > 0) {
    const [{ data: receiverTrades }, { data: receiverDupes }] = await Promise.all([
      supabaseAdmin
        .from('pending_trades')
        .select('initiator_id, giving_ids, receiving_ids')
        .or(`initiator_id.eq.${receiverId},receiver_id.eq.${receiverId}`)
        .eq('status', 'pending'),
      supabaseAdmin
        .from('user_duplicates')
        .select('sticker_id, count')
        .eq('user_id', receiverId)
        .in('sticker_id', receivingIds),
    ])

    const receiverReserved: Record<string, number> = {}
    for (const trade of receiverTrades ?? []) {
      const theirGiving = trade.initiator_id === receiverId ? trade.giving_ids : trade.receiving_ids
      for (const id of theirGiving ?? []) receiverReserved[id] = (receiverReserved[id] ?? 0) + 1
    }

    const receiverDupeCount: Record<string, number> = {}
    for (const d of receiverDupes ?? []) receiverDupeCount[d.sticker_id] = d.count

    const receiverConflicts = receivingIds.filter((id) => {
      const reserved = receiverReserved[id] ?? 0
      return reserved > 0 && reserved >= (receiverDupeCount[id] ?? 0)
    })
    if (receiverConflicts.length > 0) {
      return {
        success: false,
        error: `Figurinha${receiverConflicts.length > 1 ? 's' : ''} já reservada${receiverConflicts.length > 1 ? 's' : ''} em outra troca: ${receiverConflicts.join(', ')}`,
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
      partnerName: formatName(receiver?.name ?? 'Usuário'),
      givingCount: givingIds.length,
      receivingCount: receivingIds.length,
    })
  })()

  return { success: true, tradeId: data.id }
}
