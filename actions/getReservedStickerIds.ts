'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Returns the sticker IDs the user has committed to giving in pending trades.
 * These are considered "reserved" and should not appear as freely available.
 */
export async function getReservedStickerIds(userId: string): Promise<string[]> {
  if (!userId) return []

  const { data } = await supabaseAdmin
    .from('pending_trades')
    .select('initiator_id, receiver_id, giving_ids, receiving_ids')
    .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('status', 'pending')

  if (!data) return []

  const ids = new Set<string>()
  for (const trade of data) {
    // From this user's perspective: what they give is what's reserved
    const giving =
      trade.initiator_id === userId ? trade.giving_ids : trade.receiving_ids
    for (const id of giving ?? []) ids.add(id)
  }
  return [...ids]
}
