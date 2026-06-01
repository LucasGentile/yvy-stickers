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

export type CancelledTrade = {
  id: string
  otherUserName: string
  myGivingIds: string[]
  myReceivingIds: string[]
  status: 'cancelled' | 'rejected'
  createdAt: string
  auditEntryId: string | null
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
  verified: boolean
  rollbackMyGivingIds: string[] | null
  rollbackMyReceivingIds: string[] | null
  rollbackRequestedAt: string | null
  auditEntryId: string | null
  isPartiallyRolledBack: boolean
}

export async function getPendingTrades(userId: string): Promise<{
  received: PendingTrade[]
  sent: PendingTrade[]
  recentlyAccepted: RecentTrade[]
  recentlyCancelled: CancelledTrade[]
}> {
  const empty = { received: [], sent: [], recentlyAccepted: [], recentlyCancelled: [] }
  if (!userId) return empty

  try {
    const [
      { data: pendingTrades, error: pendingError },
      { data: acceptedTrades },
      { data: auditEntries },
      { data: cancelledTrades },
    ] = await Promise.all([
      supabaseAdmin
        .from('pending_trades')
        .select('id, initiator_id, receiver_id, giving_ids, receiving_ids, status, created_at')
        .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseAdmin as any)
        .from('pending_trades')
        .select(
          'id, initiator_id, receiver_id, giving_ids, receiving_ids, accepted_at, rollback_requested_by, rollback_requested_at, rollback_giving_ids, rollback_receiving_ids, verified_at, status'
        )
        .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
        .in('status', ['accepted', 'rolled_back'])
        .order('accepted_at', { ascending: false })
        .limit(100),
      supabaseAdmin
        .from('audit_log')
        .select('id, metadata')
        .eq('user_id', userId)
        .eq('action', 'trade_accepted'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseAdmin as any)
        .from('pending_trades')
        .select('id, initiator_id, receiver_id, giving_ids, receiving_ids, status, created_at')
        .or(
          `and(status.eq.cancelled,receiver_id.eq.${userId}),and(status.eq.rejected,initiator_id.eq.${userId})`
        )
        .is('cancellation_acked_at', null)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    if (pendingError) return empty

    const allTrades = [
      ...(pendingTrades ?? []),
      ...(acceptedTrades ?? []),
      ...(cancelledTrades ?? []),
    ]
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

    const auditByTradeId = new Map<string, string>()
    for (const entry of auditEntries ?? []) {
      const tradeId = (entry.metadata as Record<string, unknown>)?.tradeId as string | undefined
      if (tradeId && !auditByTradeId.has(tradeId)) {
        auditByTradeId.set(tradeId, entry.id)
      }
    }

    const recentlyAccepted: RecentTrade[] = []
    for (const trade of acceptedTrades ?? []) {
      const isPartiallyRolledBack = trade.status === 'rolled_back'

      // Full rollbacks are hidden; only partial rollbacks remain visible
      if (isPartiallyRolledBack) {
        const hasPartialData =
          trade.rollback_giving_ids !== null || trade.rollback_receiving_ids !== null
        if (!hasPartialData) continue
      }

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

      // For partial rollbacks, show only the stickers that were kept
      const rawGiving: string[] = isInitiator ? trade.giving_ids : trade.receiving_ids
      const rawReceiving: string[] = isInitiator ? trade.receiving_ids : trade.giving_ids
      const rolledBackGivingSet = new Set(rollbackMyGivingIds ?? [])
      const rolledBackReceivingSet = new Set(rollbackMyReceivingIds ?? [])
      const myGivingIds = isPartiallyRolledBack
        ? rawGiving.filter((id) => !rolledBackGivingSet.has(id))
        : rawGiving
      const myReceivingIds = isPartiallyRolledBack
        ? rawReceiving.filter((id) => !rolledBackReceivingSet.has(id))
        : rawReceiving

      recentlyAccepted.push({
        id: trade.id,
        otherUserId: otherId,
        otherUserName: formatName(other.name),
        myGivingIds,
        myReceivingIds,
        acceptedAt: trade.accepted_at,
        rollbackRequestedBy: trade.rollback_requested_by ?? null,
        rollbackRequestedAt:
          ((trade as Record<string, unknown>).rollback_requested_at as string | null) ?? null,
        isSender: isInitiator,
        verified: !!(trade as Record<string, unknown>).verified_at,
        rollbackMyGivingIds,
        rollbackMyReceivingIds,
        auditEntryId: auditByTradeId.get(trade.id) ?? null,
        isPartiallyRolledBack,
      })
    }

    const recentlyCancelled: CancelledTrade[] = []
    for (const trade of cancelledTrades ?? []) {
      // Query already guarantees current user is the counterpart (not the actor):
      //   cancelled → receiver_id = userId (initiator cancelled)
      //   rejected  → initiator_id = userId (receiver rejected)
      const isInitiator = trade.initiator_id === userId
      const otherId = isInitiator ? trade.receiver_id : trade.initiator_id
      const other = userMap[otherId]
      if (!other) continue
      const myGivingIds: string[] = isInitiator ? trade.giving_ids : trade.receiving_ids
      if (myGivingIds.length === 0) continue
      recentlyCancelled.push({
        id: trade.id,
        otherUserName: formatName(other.name),
        myGivingIds,
        myReceivingIds: isInitiator ? trade.receiving_ids : trade.giving_ids,
        status: trade.status as 'cancelled' | 'rejected',
        createdAt: trade.created_at,
        auditEntryId: auditByTradeId.get(trade.id) ?? null,
      })
    }

    return { received, sent, recentlyAccepted, recentlyCancelled }
  } catch {
    return empty
  }
}
