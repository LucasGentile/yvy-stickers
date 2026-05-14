'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkAdvancedTradeEligibility } from '@/lib/advancedMatching'

export async function getAdvancedTradeEligibility(
  userId: string
): Promise<{ eligible: boolean; canSearch: boolean }> {
  if (!userId) return { eligible: false, canSearch: false }

  // Check if user has any pending advanced trades (needing action)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pendingTrades } = await (supabaseAdmin as any)
    .from('advanced_trades')
    .select('id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId},user_c_id.eq.${userId}`)
    .eq('status', 'pending')
    .limit(1)

  const hasPendingTrades = (pendingTrades?.length ?? 0) > 0
  const canSearch = await checkAdvancedTradeEligibility(userId)

  return { eligible: hasPendingTrades || canSearch, canSearch }
}
