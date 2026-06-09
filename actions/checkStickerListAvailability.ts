'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { STICKER_SET } from '@/lib/stickers'

export type BulkStickerResult = {
  stickerId: string
  status: 'invalid' | 'not_owned' | 'no_dupes' | 'available' | 'partial' | 'fully_reserved'
  dupeCount?: number
  reservedCount?: number
  availableCount?: number
}

export async function checkStickerListAvailability(
  userId: string,
  rawIds: string[]
): Promise<BulkStickerResult[]> {
  if (!userId) return rawIds.map((id) => ({ stickerId: id, status: 'invalid' as const }))

  // Normalize, deduplicate, preserve order
  const seen = new Set<string>()
  const ids: string[] = []
  for (const raw of rawIds) {
    const n = raw.trim().toUpperCase()
    const id = n === '00' ? 'FWC00' : n
    if (id && !seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }

  const validIds = ids.filter((id) => STICKER_SET.has(id))

  if (validIds.length === 0) {
    return ids.map((stickerId) => ({ stickerId, status: 'invalid' as const }))
  }

  const [{ data: owned }, { data: dupes }, { data: trades }, { data: purchaseReqs }] =
    await Promise.all([
      supabaseAdmin
        .from('user_stickers')
        .select('sticker_id')
        .eq('user_id', userId)
        .in('sticker_id', validIds),
      supabaseAdmin
        .from('user_duplicates')
        .select('sticker_id, count')
        .eq('user_id', userId)
        .in('sticker_id', validIds),
      supabaseAdmin
        .from('pending_trades')
        .select('initiator_id, receiver_id, giving_ids, receiving_ids')
        .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'pending'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseAdmin as any)
        .from('purchase_requests')
        .select('sticker_ids')
        .eq('seller_id', userId)
        .eq('status', 'pending'),
    ])

  const ownedSet = new Set((owned ?? []).map((r) => r.sticker_id))
  const dupeMap = Object.fromEntries((dupes ?? []).map((r) => [r.sticker_id, r.count as number]))

  const validSet = new Set(validIds)
  const reservedMap: Record<string, number> = {}
  for (const trade of trades ?? []) {
    const giving = trade.initiator_id === userId ? trade.giving_ids : trade.receiving_ids
    for (const id of (giving ?? []) as string[]) {
      if (validSet.has(id)) {
        reservedMap[id] = (reservedMap[id] ?? 0) + 1
      }
    }
  }
  for (const pr of (purchaseReqs ?? []) as Array<{ sticker_ids: string[] }>) {
    for (const id of pr.sticker_ids ?? []) {
      if (validSet.has(id)) {
        reservedMap[id] = (reservedMap[id] ?? 0) + 1
      }
    }
  }

  return ids.map((stickerId) => {
    if (!STICKER_SET.has(stickerId)) return { stickerId, status: 'invalid' as const }
    if (!ownedSet.has(stickerId)) return { stickerId, status: 'not_owned' as const }
    const dupeCount = dupeMap[stickerId] ?? 0
    if (dupeCount === 0) return { stickerId, status: 'no_dupes' as const }
    const reservedCount = reservedMap[stickerId] ?? 0
    const availableCount = dupeCount - reservedCount
    const status =
      reservedCount === 0 ? 'available' : availableCount > 0 ? 'partial' : 'fully_reserved'
    return { stickerId, status, dupeCount, reservedCount, availableCount }
  })
}
