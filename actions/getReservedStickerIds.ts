'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Returns how many copies of each sticker the user has committed to giving
 * across all pending trades. A sticker can appear in multiple trades if the
 * user has enough duplicate copies.
 */
export async function getReservedStickerIds(
  userId: string
): Promise<Record<string, number>> {
  if (!userId) return {}

  const { data } = await supabaseAdmin
    .from('pending_trades')
    .select('initiator_id, receiver_id, giving_ids, receiving_ids')
    .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('status', 'pending')

  if (!data) return {}

  const counts: Record<string, number> = {}
  for (const trade of data) {
    // From this user's perspective: what they give is what's reserved
    const giving =
      trade.initiator_id === userId ? trade.giving_ids : trade.receiving_ids
    for (const id of giving ?? []) counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}
