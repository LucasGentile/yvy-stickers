'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { formatName } from '@/lib/format'

export type CommunitySearchResult = {
  userId: string
  displayName: string
  apartment: string
  tower: string
  availableStickers: string[]
}

export async function searchCommunityDuplicates(
  currentUserId: string,
  codes: string[]
): Promise<CommunitySearchResult[]> {
  if (!currentUserId || codes.length === 0) return []

  // 1. Find users who have duplicates for any of these sticker codes
  const { data: dupes } = await supabaseAdmin
    .from('user_duplicates')
    .select('user_id, sticker_id, count')
    .in('sticker_id', codes)
    .neq('user_id', currentUserId)

  if (!dupes || dupes.length === 0) return []

  const userIds = [...new Set(dupes.map((d) => d.user_id))]

  // 2. Fetch user info and reservations in parallel
  const [
    { data: users },
    { data: tradesAsInitiator },
    { data: tradesAsReceiver },
    { data: purchaseReqs },
  ] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, name, apartment, tower')
      .in('id', userIds)
      .eq('is_active', true),
    supabaseAdmin
      .from('pending_trades')
      .select('initiator_id, giving_ids')
      .in('initiator_id', userIds)
      .eq('status', 'pending'),
    supabaseAdmin
      .from('pending_trades')
      .select('receiver_id, receiving_ids')
      .in('receiver_id', userIds)
      .eq('status', 'pending'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin as any)
      .from('purchase_requests')
      .select('seller_id, sticker_ids')
      .in('seller_id', userIds)
      .eq('status', 'pending'),
  ])

  // 3. Build per-user reserved counts
  const reserved: Record<string, Record<string, number>> = {}

  for (const t of tradesAsInitiator ?? []) {
    const uid = t.initiator_id
    if (!reserved[uid]) reserved[uid] = {}
    for (const sid of t.giving_ids ?? []) {
      reserved[uid][sid] = (reserved[uid][sid] ?? 0) + 1
    }
  }
  for (const t of tradesAsReceiver ?? []) {
    const uid = t.receiver_id
    if (!reserved[uid]) reserved[uid] = {}
    for (const sid of t.receiving_ids ?? []) {
      reserved[uid][sid] = (reserved[uid][sid] ?? 0) + 1
    }
  }
  for (const pr of purchaseReqs ?? []) {
    const uid = pr.seller_id
    if (!reserved[uid]) reserved[uid] = {}
    for (const sid of pr.sticker_ids ?? []) {
      reserved[uid][sid] = (reserved[uid][sid] ?? 0) + 1
    }
  }

  // 4. Build per-user dupe map and compute available stickers
  const dupeMap: Record<string, Record<string, number>> = {}
  for (const d of dupes) {
    if (!dupeMap[d.user_id]) dupeMap[d.user_id] = {}
    dupeMap[d.user_id][d.sticker_id] = d.count as number
  }

  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

  const results: CommunitySearchResult[] = []

  for (const uid of userIds) {
    const user = userMap[uid]
    if (!user) continue

    const availableStickers: string[] = []
    const userDupes = dupeMap[uid] ?? {}
    const userReserved = reserved[uid] ?? {}

    for (const stickerId of codes) {
      const count = userDupes[stickerId] ?? 0
      const res = userReserved[stickerId] ?? 0
      if (count - res > 0) {
        availableStickers.push(stickerId)
      }
    }

    if (availableStickers.length > 0) {
      results.push({
        userId: uid,
        displayName: formatName(user.name),
        apartment: user.apartment,
        tower: user.tower,
        availableStickers,
      })
    }
  }

  // Sort by most stickers available first
  results.sort((a, b) => b.availableStickers.length - a.availableStickers.length)

  return results
}
