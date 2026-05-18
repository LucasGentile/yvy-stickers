'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Returns how many copies of each sticker the user has committed to giving
 * across all pending trades. A sticker can appear in multiple trades if the
 * user has enough duplicate copies.
 */
export async function getReservedStickerIds(userId: string): Promise<Record<string, number>> {
  if (!userId) return {}

  const [{ data }, { data: advancedData }] = await Promise.all([
    supabaseAdmin
      .from('pending_trades')
      .select('initiator_id, receiver_id, giving_ids, receiving_ids')
      .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'pending'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin as any)
      .from('advanced_trades')
      .select('user_a_id, user_b_id, user_c_id, a_gives_ids, b_gives_ids, c_gives_ids')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId},user_c_id.eq.${userId}`)
      .eq('status', 'pending'),
  ])

  const counts: Record<string, number> = {}

  for (const trade of data ?? []) {
    const giving = trade.initiator_id === userId ? trade.giving_ids : trade.receiving_ids
    for (const id of giving ?? []) counts[id] = (counts[id] ?? 0) + 1
  }

  for (const trade of (advancedData ?? []) as Array<{
    user_a_id: string
    user_b_id: string
    user_c_id: string
    a_gives_ids: string[]
    b_gives_ids: string[]
    c_gives_ids: string[]
  }>) {
    let giving: string[] = []
    if (trade.user_a_id === userId) giving = trade.a_gives_ids
    else if (trade.user_b_id === userId) giving = trade.b_gives_ids
    else if (trade.user_c_id === userId) giving = trade.c_gives_ids
    for (const id of giving) counts[id] = (counts[id] ?? 0) + 1
  }

  return counts
}
