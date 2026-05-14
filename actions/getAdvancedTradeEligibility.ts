'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkAdvancedTradeEligibility } from '@/lib/advancedMatching'

export async function getAdvancedTradeEligibility(
  userId: string
): Promise<{ eligible: boolean; canSearch: boolean }> {
  if (!userId) return { eligible: false, canSearch: false }

  // Check if user has any active advanced trades (pending or recently accepted)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activeTrades } = await (supabaseAdmin as any)
    .from('advanced_trades')
    .select('id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId},user_c_id.eq.${userId}`)
    .in('status', ['pending', 'accepted'])
    .limit(1)

  const hasActiveTrades = (activeTrades?.length ?? 0) > 0
  const canSearch = await checkAdvancedTradeEligibility(userId)

  return { eligible: hasActiveTrades || canSearch, canSearch }
}
