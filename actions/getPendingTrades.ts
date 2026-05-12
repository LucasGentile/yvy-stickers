'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { formatName } from '@/lib/format'

export type PendingTrade = {
  id: string
  otherUserId: string
  otherUserName: string
  otherUserPhone: string
  myGivingIds: string[]
  myReceivingIds: string[]
  status: string
  createdAt: string
  isSender: boolean
}

export type RecentTrade = {
  id: string
  otherUserId: string
  otherUserName: string
  myGivingIds: string[]
  myReceivingIds: string[]
  acceptedAt: string
  rollbackRequestedBy: string | null
  isSender: boolean
  // Subset of myGivingIds/myReceivingIds being reverted. null = all (full revert).
  rollbackMyGivingIds: string[] | null
  rollbackMyReceivingIds: string[] | null
}

export async function getPendingTrades(userId: string): Promise<{
  received: PendingTrade[]
  sent: PendingTrade[]
  recentlyAccepted: RecentTrade[]
}> {
  const empty = { received: [], sent: [], recentlyAccepted: [] }
  if (!userId) return empty

  try {
    const [{ data: pendingTrades, error: pendingError }, { data: acceptedTrades }] =
      await Promise.all([
        supabaseAdmin
          .from('pending_trades')
          .select('id, initiator_id, receiver_id, giving_ids, receiving_ids, status, created_at')
          .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabaseAdmin as any)
          .from('pending_trades')
          .select(
            'id, initiator_id, receiver_id, giving_ids, receiving_ids, accepted_at, rollback_requested_by, rollback_giving_ids, rollback_receiving_ids'
          )
          .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
          .eq('status', 'accepted')
          .order('accepted_at', { ascending: false }),
      ])

    if (pendingError) return empty

    const allTrades = [...(pendingTrades ?? []), ...(acceptedTrades ?? [])]
    const otherIds = [
      ...new Set(
        allTrades.map((t) => (t.initiator_id === userId ? t.receiver_id : t.initiator_id))
      ),
    ]

    const { data: users } = otherIds.length
      ? await supabaseAdmin.from('users').select('id, name, phone').in('id', otherIds)
      : { data: [] }

    const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

    const received: PendingTrade[] = []
    const sent: PendingTrade[] = []

    for (const trade of pendingTrades ?? []) {
      const isInitiator = trade.initiator_id === userId
      const otherId = isInitiator ? trade.receiver_id : trade.initiator_id
      const other = userMap[otherId]
      if (!other) continue

      const normalized: PendingTrade = {
        id: trade.id,
        otherUserId: otherId,
        otherUserName: formatName(other.name),
        otherUserPhone: other.phone,
        myGivingIds: isInitiator ? trade.giving_ids : trade.receiving_ids,
        myReceivingIds: isInitiator ? trade.receiving_ids : trade.giving_ids,
        status: trade.status,
        createdAt: trade.created_at,
        isSender: isInitiator,
      }

      if (isInitiator) sent.push(normalized)
      else received.push(normalized)
    }

    const recentlyAccepted: RecentTrade[] = []
    for (const trade of acceptedTrades ?? []) {
      const isInitiator = trade.initiator_id === userId
      const otherId = isInitiator ? trade.receiver_id : trade.initiator_id
      const other = userMap[otherId]
      if (!other) continue

      // Translate rollback partial IDs from initiator perspective to current user's perspective
      const rollbackMyGivingIds: string[] | null = isInitiator
        ? (trade.rollback_giving_ids ?? null)
        : (trade.rollback_receiving_ids ?? null)
      const rollbackMyReceivingIds: string[] | null = isInitiator
        ? (trade.rollback_receiving_ids ?? null)
        : (trade.rollback_giving_ids ?? null)

      recentlyAccepted.push({
        id: trade.id,
        otherUserId: otherId,
        otherUserName: formatName(other.name),
        myGivingIds: isInitiator ? trade.giving_ids : trade.receiving_ids,
        myReceivingIds: isInitiator ? trade.receiving_ids : trade.giving_ids,
        acceptedAt: trade.accepted_at,
        rollbackRequestedBy: trade.rollback_requested_by ?? null,
        isSender: isInitiator,
        rollbackMyGivingIds,
        rollbackMyReceivingIds,
      })
    }

    return { received, sent, recentlyAccepted }
  } catch {
    return empty
  }
}
