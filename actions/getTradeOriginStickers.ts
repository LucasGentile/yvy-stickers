'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type TradeOriginResult = {
  fromTradeIds: string[] // all stickers ever received from accepted trades
  newestIds: string[] // stickers received in the last 12 hours
}

const NEWEST_WINDOW_MS = 12 * 60 * 60 * 1000

export async function getTradeOriginStickers(userId: string): Promise<TradeOriginResult> {
  if (!userId) return { fromTradeIds: [], newestIds: [] }

  const [{ data: trades }, { data: advancedTrades }] = await Promise.all([
    supabaseAdmin
      .from('pending_trades')
      .select('initiator_id, giving_ids, receiving_ids, accepted_at')
      .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin as any)
      .from('advanced_trades')
      .select('user_a_id, user_b_id, user_c_id, a_gives_ids, b_gives_ids, c_gives_ids, accepted_at')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId},user_c_id.eq.${userId}`)
      .eq('status', 'accepted'),
  ])

  const fromTrade = new Set<string>()
  const newest = new Set<string>()
  const cutoff = Date.now() - NEWEST_WINDOW_MS

  for (const trade of trades ?? []) {
    const received = trade.initiator_id === userId ? trade.receiving_ids : trade.giving_ids
    for (const id of received ?? []) {
      fromTrade.add(id)
      if (trade.accepted_at && new Date(trade.accepted_at).getTime() > cutoff) {
        newest.add(id)
      }
    }
  }

  // Advanced trades: cycle is A→B→C→A, so each user receives from the previous in cycle
  // A receives c_gives_ids, B receives a_gives_ids, C receives b_gives_ids
  for (const trade of (advancedTrades ?? []) as Array<{
    user_a_id: string; user_b_id: string; user_c_id: string
    a_gives_ids: string[]; b_gives_ids: string[]; c_gives_ids: string[]
    accepted_at: string | null
  }>) {
    let received: string[] = []
    if (trade.user_a_id === userId) received = trade.c_gives_ids
    else if (trade.user_b_id === userId) received = trade.a_gives_ids
    else if (trade.user_c_id === userId) received = trade.b_gives_ids
    for (const id of received) {
      fromTrade.add(id)
      if (trade.accepted_at && new Date(trade.accepted_at).getTime() > cutoff) {
        newest.add(id)
      }
    }
  }

  return { fromTradeIds: [...fromTrade], newestIds: [...newest] }
}
