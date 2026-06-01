'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { formatName } from '@/lib/format'

export type UnacknowledgedCancellation = {
  id: string
  otherUserName: string
  myGivingIds: string[]
  status: 'cancelled' | 'rejected'
}

export async function getUnacknowledgedCancellations(
  userId: string
): Promise<UnacknowledgedCancellation[]> {
  if (!userId) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: trades } = await (supabaseAdmin as any)
      .from('pending_trades')
      .select('id, initiator_id, receiver_id, giving_ids, receiving_ids, status')
      .or(
        `and(status.eq.cancelled,receiver_id.eq.${userId}),and(status.eq.rejected,initiator_id.eq.${userId})`
      )
      .is('cancellation_acked_at', null)
      .limit(20)

    if (!trades || trades.length === 0) return []

    type RawTrade = {
      id: string
      initiator_id: string
      receiver_id: string
      giving_ids: string[]
      receiving_ids: string[]
      status: string
    }
    const typed = trades as RawTrade[]

    const otherIds = typed.map((t) => (t.initiator_id === userId ? t.receiver_id : t.initiator_id))
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', [...new Set(otherIds)])

    const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

    return typed.flatMap((trade) => {
      const isInitiator = trade.initiator_id === userId
      const otherId = isInitiator ? trade.receiver_id : trade.initiator_id
      const other = userMap[otherId]
      if (!other) return []
      const myGivingIds: string[] = isInitiator ? trade.giving_ids : trade.receiving_ids
      if (myGivingIds.length === 0) return []
      return [
        {
          id: trade.id,
          otherUserName: formatName(other.name),
          myGivingIds,
          status: trade.status as 'cancelled' | 'rejected',
        },
      ]
    })
  } catch {
    return []
  }
}
