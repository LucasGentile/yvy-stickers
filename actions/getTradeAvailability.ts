'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type TradeAvailability = {
  myGivingAvailable: string[] // stickers I give that I still have a free copy of
  myGivingUnavailable: string[] // stickers I give that I no longer have
  theirGivingAvailable: string[] // stickers they give that they still have
  theirGivingUnavailable: string[] // stickers they give that they no longer have
}

/**
 * From the caller's perspective (userId), returns which stickers in the trade
 * are still available (not reserved by other pending trades) for each party.
 * Excludes the trade itself when counting reservations.
 *
 * Returns null if the trade is not found or not pending.
 */
export async function getTradeAvailability(
  tradeId: string,
  userId: string
): Promise<TradeAvailability | null> {
  if (!tradeId || !userId) return null

  // Fetch the trade record
  const { data: trade } = await supabaseAdmin
    .from('pending_trades')
    .select('id, initiator_id, receiver_id, giving_ids, receiving_ids, status')
    .eq('id', tradeId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!trade) return null

  const isInitiator = trade.initiator_id === userId

  // From the caller's perspective:
  // myGivingIds = what caller gives (initiator→giving_ids, receiver→receiving_ids)
  // theirGivingIds = what other party gives
  const myGivingIds: string[] = isInitiator ? trade.giving_ids : trade.receiving_ids
  const theirGivingIds: string[] = isInitiator ? trade.receiving_ids : trade.giving_ids

  const myId = userId
  const theirId = isInitiator ? trade.receiver_id : trade.initiator_id

  // Fetch all OTHER pending trades for both parties (excluding this trade)
  const { data: otherTrades } = await supabaseAdmin
    .from('pending_trades')
    .select('initiator_id, receiver_id, giving_ids, receiving_ids')
    .or(
      `initiator_id.eq.${myId},receiver_id.eq.${myId},initiator_id.eq.${theirId},receiver_id.eq.${theirId}`
    )
    .eq('status', 'pending')
    .neq('id', tradeId)

  // Build reservation counts per user, from their perspective
  const myReserved: Record<string, number> = {}
  const theirReserved: Record<string, number> = {}

  for (const t of otherTrades ?? []) {
    // Reservation for myId
    if (t.initiator_id === myId || t.receiver_id === myId) {
      const giving: string[] = t.initiator_id === myId ? t.giving_ids : t.receiving_ids
      for (const id of giving ?? []) {
        myReserved[id] = (myReserved[id] ?? 0) + 1
      }
    }
    // Reservation for theirId
    if (t.initiator_id === theirId || t.receiver_id === theirId) {
      const giving: string[] = t.initiator_id === theirId ? t.giving_ids : t.receiving_ids
      for (const id of giving ?? []) {
        theirReserved[id] = (theirReserved[id] ?? 0) + 1
      }
    }
  }

  // Fetch duplicate counts for all stickers involved
  const allMyStickers = [...new Set(myGivingIds)]
  const allTheirStickers = [...new Set(theirGivingIds)]

  const [{ data: myDupes }, { data: theirDupes }] = await Promise.all([
    allMyStickers.length > 0
      ? supabaseAdmin
          .from('user_duplicates')
          .select('sticker_id, count')
          .eq('user_id', myId)
          .in('sticker_id', allMyStickers)
      : Promise.resolve({ data: [] }),
    allTheirStickers.length > 0
      ? supabaseAdmin
          .from('user_duplicates')
          .select('sticker_id, count')
          .eq('user_id', theirId)
          .in('sticker_id', allTheirStickers)
      : Promise.resolve({ data: [] }),
  ])

  const myDupeMap: Record<string, number> = Object.fromEntries(
    (myDupes ?? []).map((d) => [d.sticker_id, d.count])
  )
  const theirDupeMap: Record<string, number> = Object.fromEntries(
    (theirDupes ?? []).map((d) => [d.sticker_id, d.count])
  )

  // For each sticker: free copies = total duplicates - reserved in other trades
  // Available if free copies > 0
  const myGivingAvailable: string[] = []
  const myGivingUnavailable: string[] = []

  for (const id of myGivingIds) {
    const total = myDupeMap[id] ?? 0
    const reserved = myReserved[id] ?? 0
    const free = total - reserved
    if (free > 0) {
      myGivingAvailable.push(id)
    } else {
      myGivingUnavailable.push(id)
    }
  }

  const theirGivingAvailable: string[] = []
  const theirGivingUnavailable: string[] = []

  for (const id of theirGivingIds) {
    const total = theirDupeMap[id] ?? 0
    const reserved = theirReserved[id] ?? 0
    const free = total - reserved
    if (free > 0) {
      theirGivingAvailable.push(id)
    } else {
      theirGivingUnavailable.push(id)
    }
  }

  return {
    myGivingAvailable,
    myGivingUnavailable,
    theirGivingAvailable,
    theirGivingUnavailable,
  }
}
