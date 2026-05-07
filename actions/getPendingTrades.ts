'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type PendingTrade = {
  id: string
  otherUserId: string
  otherUserName: string
  otherUserPhone: string
  myGivingIds: string[]    // stickers the current user gives
  myReceivingIds: string[] // stickers the current user receives
  status: string
  createdAt: string
  isSender: boolean
}

export async function getPendingTrades(
  userId: string,
): Promise<{ received: PendingTrade[]; sent: PendingTrade[] }> {
  const empty = { received: [], sent: [] }
  if (!userId) return empty

  const { data: trades, error } = await supabaseAdmin
    .from('pending_trades')
    .select('id, initiator_id, receiver_id, giving_ids, receiving_ids, status, created_at')
    .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error || !trades || trades.length === 0) return empty

  const otherIds = [...new Set(
    trades.map((t) => (t.initiator_id === userId ? t.receiver_id : t.initiator_id))
  )]

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name, phone')
    .in('id', otherIds)

  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

  const received: PendingTrade[] = []
  const sent: PendingTrade[] = []

  for (const trade of trades) {
    const isInitiator = trade.initiator_id === userId
    const otherId = isInitiator ? trade.receiver_id : trade.initiator_id
    const other = userMap[otherId]
    if (!other) continue

    const normalized: PendingTrade = {
      id: trade.id,
      otherUserId: otherId,
      otherUserName: other.name,
      otherUserPhone: other.phone,
      myGivingIds: isInitiator ? trade.giving_ids : trade.receiving_ids,
      myReceivingIds: isInitiator ? trade.receiving_ids : trade.giving_ids,
      status: trade.status,
      createdAt: trade.created_at,
      isSender: isInitiator,
    }

    if (isInitiator) {
      sent.push(normalized)
    } else {
      received.push(normalized)
    }
  }

  return { received, sent }
}
