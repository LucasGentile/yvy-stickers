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
    const [{ data: existingTrades }, { data: dupes }, { data: advancedTrades }] = await Promise.all([
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseAdmin as any)
        .from('advanced_trades')
        .select('user_a_id, user_b_id, user_c_id, a_gives_ids, b_gives_ids, c_gives_ids')
        .or(`user_a_id.eq.${initiatorId},user_b_id.eq.${initiatorId},user_c_id.eq.${initiatorId}`)
        .eq('status', 'pending'),
    ])

    // Count how many copies of each sticker are already committed to pending trades
    const reservedCounts: Record<string, number> = {}
    for (const trade of existingTrades ?? []) {
      const myGiving = trade.initiator_id === initiatorId ? trade.giving_ids : trade.receiving_ids
      for (const id of myGiving ?? []) reservedCounts[id] = (reservedCounts[id] ?? 0) + 1
    }
    // Include advanced trade reservations
    for (const at of (advancedTrades ?? []) as Array<{
      user_a_id: string; user_b_id: string; user_c_id: string
      a_gives_ids: string[]; b_gives_ids: string[]; c_gives_ids: string[]
    }>) {
      let myGiving: string[] = []
      if (at.user_a_id === initiatorId) myGiving = at.a_gives_ids
      else if (at.user_b_id === initiatorId) myGiving = at.b_gives_ids
      else if (at.user_c_id === initiatorId) myGiving = at.c_gives_ids
      for (const id of myGiving) reservedCounts[id] = (reservedCounts[id] ?? 0) + 1
    }

    const dupeCount: Record<string, number> = {}
    for (const d of dupes ?? []) dupeCount[d.sticker_id] = d.count

    // Block if no free copies left (either fully reserved or already traded away)
    const conflicts = givingIds.filter((id) => {
      const available = (dupeCount[id] ?? 0) - (reservedCounts[id] ?? 0)
      return available <= 0
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
    const [{ data: receiverTrades }, { data: receiverDupes }, { data: receiverAdvanced }] = await Promise.all([
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseAdmin as any)
        .from('advanced_trades')
        .select('user_a_id, user_b_id, user_c_id, a_gives_ids, b_gives_ids, c_gives_ids')
        .or(`user_a_id.eq.${receiverId},user_b_id.eq.${receiverId},user_c_id.eq.${receiverId}`)
        .eq('status', 'pending'),
    ])

    const receiverReserved: Record<string, number> = {}
    for (const trade of receiverTrades ?? []) {
      const theirGiving = trade.initiator_id === receiverId ? trade.giving_ids : trade.receiving_ids
      for (const id of theirGiving ?? []) receiverReserved[id] = (receiverReserved[id] ?? 0) + 1
    }
    // Include advanced trade reservations for receiver
    for (const at of (receiverAdvanced ?? []) as Array<{
      user_a_id: string; user_b_id: string; user_c_id: string
      a_gives_ids: string[]; b_gives_ids: string[]; c_gives_ids: string[]
    }>) {
      let theirGiving: string[] = []
      if (at.user_a_id === receiverId) theirGiving = at.a_gives_ids
      else if (at.user_b_id === receiverId) theirGiving = at.b_gives_ids
      else if (at.user_c_id === receiverId) theirGiving = at.c_gives_ids
      for (const id of theirGiving) receiverReserved[id] = (receiverReserved[id] ?? 0) + 1
    }

    const receiverDupeCount: Record<string, number> = {}
    for (const d of receiverDupes ?? []) receiverDupeCount[d.sticker_id] = d.count

    const receiverConflicts = receivingIds.filter((id) => {
      const available = (receiverDupeCount[id] ?? 0) - (receiverReserved[id] ?? 0)
      return available <= 0
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

  // Fire-and-forget: log for both parties
  ;(async () => {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', [initiatorId, receiverId])
    const initiatorName = formatName(users?.find((u) => u.id === initiatorId)?.name ?? 'Usuário')
    const receiverName = formatName(users?.find((u) => u.id === receiverId)?.name ?? 'Usuário')
    logAction(initiatorId, 'trade_sent', {
      partnerName: receiverName,
      givingIds,
      receivingIds,
      givingCount: givingIds.length,
      receivingCount: receivingIds.length,
    })
    logAction(receiverId, 'trade_received', {
      partnerName: initiatorName,
      givingIds: receivingIds,
      receivingIds: givingIds,
      givingCount: receivingIds.length,
      receivingCount: givingIds.length,
    })
  })()

  return { success: true, tradeId: data.id }
}
