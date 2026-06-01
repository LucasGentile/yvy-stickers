'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function ackTradeCancellation(tradeId: string, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin as any)
    .from('pending_trades')
    .update({ cancellation_acked_at: new Date().toISOString() })
    .eq('id', tradeId)
    .or(`receiver_id.eq.${userId},initiator_id.eq.${userId}`)
}
