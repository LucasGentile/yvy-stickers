'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Returns sticker IDs that other users are giving to this user
 * across all pending (unconfirmed) trades.
 */
export async function getIncomingTradeStickers(userId: string): Promise<string[]> {
  if (!userId) return []

  const [{ data }, { data: advancedData }] = await Promise.all([
    supabaseAdmin
      .from('pending_trades')
      .select('initiator_id, giving_ids, receiving_ids')
      .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'pending'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin as any)
      .from('advanced_trades')
      .select('user_a_id, user_b_id, user_c_id, a_gives_ids, b_gives_ids, c_gives_ids')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId},user_c_id.eq.${userId}`)
      .eq('status', 'pending'),
  ])

  const incoming = new Set<string>()

  for (const trade of data ?? []) {
    // Initiator gives giving_ids → initiator receives receiving_ids
    // Receiver gives receiving_ids → receiver receives giving_ids
    const received = trade.initiator_id === userId ? trade.receiving_ids : trade.giving_ids
    for (const id of received ?? []) incoming.add(id)
  }

  for (const trade of (advancedData ?? []) as Array<{
    user_a_id: string
    user_b_id: string
    user_c_id: string
    a_gives_ids: string[]
    b_gives_ids: string[]
    c_gives_ids: string[]
  }>) {
    // Cycle: A gives to B, B gives to C, C gives to A
    let received: string[] = []
    if (trade.user_a_id === userId) received = trade.c_gives_ids
    else if (trade.user_b_id === userId) received = trade.a_gives_ids
    else if (trade.user_c_id === userId) received = trade.b_gives_ids
    for (const id of received) incoming.add(id)
  }

  return [...incoming]
}
