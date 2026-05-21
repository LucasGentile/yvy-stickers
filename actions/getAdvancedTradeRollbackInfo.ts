'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type AdvancedTradeRollbackInfo =
  | { found: false }
  | { found: true; alreadyRolledBack: true }
  | {
      found: true
      alreadyRolledBack: false
      rollbackRequestedBy: string | null
      rollbackRequestedAt: string | null
    }

export async function getAdvancedTradeRollbackInfo(
  tradeId: string,
  userId: string
): Promise<AdvancedTradeRollbackInfo> {
  if (!tradeId || !userId) return { found: false }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: trade } = await (supabaseAdmin as any)
    .from('advanced_trades')
    .select('status, user_a_id, user_b_id, user_c_id, rollback_requested_by, rollback_requested_at')
    .eq('id', tradeId)
    .in('status', ['accepted', 'rolled_back'])
    .maybeSingle()

  if (!trade) return { found: false }

  if (trade.status === 'rolled_back') return { found: true, alreadyRolledBack: true }

  const participants = [trade.user_a_id, trade.user_b_id, trade.user_c_id]
  if (!participants.includes(userId)) return { found: false }

  return {
    found: true,
    alreadyRolledBack: false,
    rollbackRequestedBy: trade.rollback_requested_by ?? null,
    rollbackRequestedAt: trade.rollback_requested_at ?? null,
  }
}
