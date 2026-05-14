'use server'

import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ALL_STICKER_IDS } from '@/lib/stickers'
import { formatName } from '@/lib/format'

export type MatchResult = {
  userId: string
  displayKey: string
  name: string
  apartment: string
  tower: string
  phone: string
  matchScore: number
  reciprocalScore: number
  mutualScore: number
  matchStickers: string[]
  reciprocalStickers: string[]
  completionPct: number
  missingCount: number
}

function computeNeeded(mode: string, marked: Set<string>): Set<string> {
  return mode === 'have' ? new Set(ALL_STICKER_IDS.filter((id) => !marked.has(id))) : marked
}

export async function getMatches(
  currentUserId: string,
  excludeTradeIds?: string[]
): Promise<MatchResult[]> {
  // Fetch current user's mode, stickers, duplicates, and all pending trades in parallel
  const { data: myUser } = await supabase
    .from('users')
    .select('input_mode')
    .eq('id', currentUserId)
    .maybeSingle()

  if (!myUser) return []

  const [{ data: myStickers }, { data: myDupes }, { data: pendingTrades }, othersResult] =
    await Promise.all([
      supabase.from('user_stickers').select('sticker_id').eq('user_id', currentUserId),
      supabase.from('user_duplicates').select('sticker_id, count').eq('user_id', currentUserId),
      supabaseAdmin
        .from('pending_trades')
        .select('id, initiator_id, receiver_id, giving_ids, receiving_ids')
        .eq('status', 'pending'),
      supabase
        .from('users')
        .select(
          'id, display_key, name, apartment, tower, phone, input_mode, user_stickers(sticker_id), user_duplicates(sticker_id, count)'
        )
        .neq('id', currentUserId)
        .eq('approved', true),
    ])

  type OtherUser = {
    id: string
    display_key: string
    name: string
    apartment: string
    tower: string
    phone: string
    input_mode: string
    user_stickers: { sticker_id: string }[]
    user_duplicates: { sticker_id: string; count: number }[]
  }

  const others = (othersResult as { data: OtherUser[] | null }).data
  if (!others) return []

  // Build per-user reserved sticker counts from pending trades.
  // A sticker can be reserved multiple times if the user has enough copies.
  const reservedByUser = new Map<string, Map<string, number>>()
  // Build per-user incoming sticker sets (stickers they will receive from pending trades).
  const incomingByUser = new Map<string, Set<string>>()
  const excludeSet = new Set(excludeTradeIds ?? [])
  for (const trade of (pendingTrades ?? []).filter((t) => !excludeSet.has(t.id))) {
    if (!reservedByUser.has(trade.initiator_id)) reservedByUser.set(trade.initiator_id, new Map())
    if (!incomingByUser.has(trade.initiator_id)) incomingByUser.set(trade.initiator_id, new Set())
    for (const id of trade.giving_ids ?? []) {
      const m = reservedByUser.get(trade.initiator_id)!
      m.set(id, (m.get(id) ?? 0) + 1)
    }
    for (const id of trade.receiving_ids ?? []) {
      incomingByUser.get(trade.initiator_id)!.add(id)
    }
    if (!reservedByUser.has(trade.receiver_id)) reservedByUser.set(trade.receiver_id, new Map())
    if (!incomingByUser.has(trade.receiver_id)) incomingByUser.set(trade.receiver_id, new Set())
    for (const id of trade.receiving_ids ?? []) {
      const m = reservedByUser.get(trade.receiver_id)!
      m.set(id, (m.get(id) ?? 0) + 1)
    }
    for (const id of trade.giving_ids ?? []) {
      incomingByUser.get(trade.receiver_id)!.add(id)
    }
  }

  const myMarked = new Set((myStickers ?? []).map((r) => r.sticker_id))
  const myIncoming = incomingByUser.get(currentUserId) ?? new Set<string>()
  // Exclude stickers already incoming from pending trades — treat them as virtually owned
  const myNeeded = new Set(
    [...computeNeeded(myUser.input_mode, myMarked)].filter((id) => !myIncoming.has(id))
  )
  const myReserved = reservedByUser.get(currentUserId) ?? new Map<string, number>()
  // Only stickers with more copies than reserved count are available for trading
  const myDupeSet = new Set(
    (myDupes ?? [])
      .filter((r) => r.count > (myReserved.get(r.sticker_id) ?? 0))
      .map((r) => r.sticker_id)
  )

  const results: MatchResult[] = others
    .map((user) => {
      const theirMarked = new Set(user.user_stickers.map((r) => r.sticker_id))
      const theirIncoming = incomingByUser.get(user.id) ?? new Set<string>()
      // Exclude stickers already incoming from pending trades — treat them as virtually owned
      const theirNeeded = new Set(
        [...computeNeeded(user.input_mode, theirMarked)].filter((id) => !theirIncoming.has(id))
      )
      const theirReserved = reservedByUser.get(user.id) ?? new Map<string, number>()
      const theirDupeSet = new Set(
        user.user_duplicates
          .filter((r) => r.count > (theirReserved.get(r.sticker_id) ?? 0))
          .map((r) => r.sticker_id)
      )

      // Stickers they have available duplicates of that I need
      const matchStickers = [...theirDupeSet].filter((id) => myNeeded.has(id)).sort()
      const matchScore = matchStickers.length

      // Stickers I have available duplicates of that they need
      const reciprocalStickers = [...myDupeSet].filter((id) => theirNeeded.has(id)).sort()
      const reciprocalScore = reciprocalStickers.length

      const mutualScore = Math.min(matchScore, reciprocalScore)

      const theirOwnedCount =
        user.input_mode === 'have' ? theirMarked.size : ALL_STICKER_IDS.length - theirMarked.size
      const completionPct = Math.round((theirOwnedCount / ALL_STICKER_IDS.length) * 100)
      const missingCount = theirNeeded.size

      return {
        userId: user.id,
        displayKey: user.display_key,
        name: formatName(user.name),
        apartment: user.apartment,
        tower: user.tower,
        phone: user.phone,
        matchScore,
        reciprocalScore,
        mutualScore,
        matchStickers,
        reciprocalStickers,
        completionPct,
        missingCount,
      }
    })
    .sort((a, b) => {
      if (b.mutualScore !== a.mutualScore) return b.mutualScore - a.mutualScore
      const totalA = a.matchScore + a.reciprocalScore
      const totalB = b.matchScore + b.reciprocalScore
      if (totalB !== totalA) return totalB - totalA
      return b.matchScore - a.matchScore
    })

  return results
}
