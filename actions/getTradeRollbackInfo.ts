'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type TradeRollbackInfo =
  | { found: false }
  | {
      found: true
      isInitiator: boolean
      rollbackRequestedBy: string | null
      rollbackMyGivingIds: string[] | null
      rollbackMyReceivingIds: string[] | null
    }

export async function getTradeRollbackInfo(
  tradeId: string,
  userId: string
): Promise<TradeRollbackInfo> {
  if (!tradeId || !userId) return { found: false }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: trade } = await (supabaseAdmin as any)
    .from('pending_trades')
    .select(
      'initiator_id, receiver_id, rollback_requested_by, rollback_giving_ids, rollback_receiving_ids'
    )
    .eq('id', tradeId)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!trade) return { found: false }

  const isInitiator = trade.initiator_id === userId

  // Translate partial IDs from initiator perspective to caller's perspective
  const rollbackMyGivingIds: string[] | null = isInitiator
    ? (trade.rollback_giving_ids ?? null)
    : (trade.rollback_receiving_ids ?? null)
  const rollbackMyReceivingIds: string[] | null = isInitiator
    ? (trade.rollback_receiving_ids ?? null)
    : (trade.rollback_giving_ids ?? null)

  return {
    found: true,
    isInitiator,
    rollbackRequestedBy: trade.rollback_requested_by ?? null,
    rollbackMyGivingIds,
    rollbackMyReceivingIds,
  }
}
