'use server'

import { getMatches } from '@/lib/matching'

export type BetterMatchResult = { name: string; mutualScore: number }

export async function getBetterMatchExcludingTrade(
  userId: string,
  excludeTradeId: string,
  tradePartnerId: string,
  tradeMutual: number
): Promise<BetterMatchResult | null> {
  const matches = await getMatches(userId, [excludeTradeId])
  const better = matches.find((m) => m.userId !== tradePartnerId && m.mutualScore > tradeMutual)
  return better ? { name: better.name, mutualScore: better.mutualScore } : null
}
