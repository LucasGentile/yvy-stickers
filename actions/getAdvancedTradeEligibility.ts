'use server'

import { checkAdvancedTradeEligibility } from '@/lib/advancedMatching'

export async function getAdvancedTradeEligibility(
  userId: string
): Promise<{ eligible: boolean }> {
  if (!userId) return { eligible: false }
  const eligible = await checkAdvancedTradeEligibility(userId)
  return { eligible }
}
