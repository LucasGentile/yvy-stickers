'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { logAction } from './logAction'
import { formatName } from '@/lib/format'

export type CreateTradeResult =
  | { success: true; tradeId: string }
  | { success: false; error: string }

type AdvancedTrade = {
  user_a_id: string
  user_b_id: string
  user_c_id: string
  a_gives_ids: string[]
  b_gives_ids: string[]
  c_gives_ids: string[]
}

async function getConflicts(userId: string, ids: string[]): Promise<string[]> {
  const [{ data: existingTrades }, { data: dupes }, { data: advancedTrades }] = await Promise.all([
    supabaseAdmin
      .from('pending_trades')
      .select('initiator_id, giving_ids, receiving_ids')
      .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'pending'),
    supabaseAdmin
      .from('user_duplicates')
      .select('sticker_id, count')
      .eq('user_id', userId)
      .in('sticker_id', ids),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin as any)
      .from('advanced_trades')
      .select('user_a_id, user_b_id, user_c_id, a_gives_ids, b_gives_ids, c_gives_ids')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId},user_c_id.eq.${userId}`)
      .eq('status', 'pending'),
  ])

  const reservedCounts: Record<string, number> = {}
  for (const trade of existingTrades ?? []) {
    const giving = trade.initiator_id === userId ? trade.giving_ids : trade.receiving_ids
    for (const id of giving ?? []) reservedCounts[id] = (reservedCounts[id] ?? 0) + 1
  }
  for (const at of (advancedTrades ?? []) as AdvancedTrade[]) {
    let giving: string[] = []
    if (at.user_a_id === userId) giving = at.a_gives_ids
    else if (at.user_b_id === userId) giving = at.b_gives_ids
    else if (at.user_c_id === userId) giving = at.c_gives_ids
    for (const id of giving) reservedCounts[id] = (reservedCounts[id] ?? 0) + 1
  }

  const dupeCount: Record<string, number> = {}
  for (const d of dupes ?? []) dupeCount[d.sticker_id] = d.count

  return ids.filter((id) => (dupeCount[id] ?? 0) - (reservedCounts[id] ?? 0) <= 0)
}

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

  const { data: receiverUser } = await supabaseAdmin
    .from('users')
    .select('trades_blocked')
    .eq('id', receiverId)
    .maybeSingle()
  if (receiverUser?.trades_blocked) {
    return { success: false, error: 'Este usuário não está aceitando novas trocas no momento.' }
  }

  if (givingIds.length === 0 && receivingIds.length === 0) {
    return { success: false, error: 'Nenhuma figurinha selecionada.' }
  }

  // Check both sides in parallel
  const [initiatorConflicts, receiverConflicts] = await Promise.all([
    givingIds.length > 0 ? getConflicts(initiatorId, givingIds) : Promise.resolve([]),
    receivingIds.length > 0 ? getConflicts(receiverId, receivingIds) : Promise.resolve([]),
  ])

  if (initiatorConflicts.length > 0) {
    return {
      success: false,
      error: `Figurinha${initiatorConflicts.length > 1 ? 's' : ''} já reservada${initiatorConflicts.length > 1 ? 's' : ''} em outra troca: ${initiatorConflicts.join(', ')}`,
    }
  }
  if (receiverConflicts.length > 0) {
    return {
      success: false,
      error: `Figurinha${receiverConflicts.length > 1 ? 's' : ''} já reservada${receiverConflicts.length > 1 ? 's' : ''} em outra troca: ${receiverConflicts.join(', ')}`,
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
      tradeId: data.id,
      partnerName: receiverName,
      givingIds,
      receivingIds,
      givingCount: givingIds.length,
      receivingCount: receivingIds.length,
    })
    logAction(receiverId, 'trade_received', {
      tradeId: data.id,
      partnerName: initiatorName,
      givingIds: receivingIds,
      receivingIds: givingIds,
      givingCount: receivingIds.length,
      receivingCount: givingIds.length,
    })
  })()

  return { success: true, tradeId: data.id }
}
