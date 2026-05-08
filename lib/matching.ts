'use server'

import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ALL_STICKER_IDS } from '@/lib/stickers'

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
}

function computeNeeded(mode: string, marked: Set<string>): Set<string> {
  return mode === 'have' ? new Set(ALL_STICKER_IDS.filter((id) => !marked.has(id))) : marked
}

export async function getMatches(currentUserId: string): Promise<MatchResult[]> {
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
        .select('initiator_id, receiver_id, giving_ids, receiving_ids')
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

  // Build per-user reserved sticker sets from pending trades
  const reservedByUser = new Map<string, Set<string>>()
  for (const trade of pendingTrades ?? []) {
    if (!reservedByUser.has(trade.initiator_id)) reservedByUser.set(trade.initiator_id, new Set())
    for (const id of trade.giving_ids ?? []) reservedByUser.get(trade.initiator_id)!.add(id)
    if (!reservedByUser.has(trade.receiver_id)) reservedByUser.set(trade.receiver_id, new Set())
    for (const id of trade.receiving_ids ?? []) reservedByUser.get(trade.receiver_id)!.add(id)
  }

  const myMarked = new Set((myStickers ?? []).map((r) => r.sticker_id))
  const myNeeded = computeNeeded(myUser.input_mode, myMarked)
  const myAllDupes = new Set((myDupes ?? []).map((r) => r.sticker_id))
  const myReserved = reservedByUser.get(currentUserId) ?? new Set<string>()
  // Only available (unreserved) duplicates count for matching
  const myDupeSet = new Set([...myAllDupes].filter((id) => !myReserved.has(id)))

  const results: MatchResult[] = others
    .map((user) => {
      const theirMarked = new Set(user.user_stickers.map((r) => r.sticker_id))
      const theirNeeded = computeNeeded(user.input_mode, theirMarked)
      const theirAllDupes = new Set(user.user_duplicates.map((r) => r.sticker_id))
      const theirReserved = reservedByUser.get(user.id) ?? new Set<string>()
      const theirDupeSet = new Set([...theirAllDupes].filter((id) => !theirReserved.has(id)))

      // Stickers they have available duplicates of that I need
      const matchStickers = [...theirDupeSet].filter((id) => myNeeded.has(id)).sort()
      const matchScore = matchStickers.length

      // Stickers I have available duplicates of that they need
      const reciprocalStickers = [...myDupeSet].filter((id) => theirNeeded.has(id)).sort()
      const reciprocalScore = reciprocalStickers.length

      const mutualScore = Math.min(matchScore, reciprocalScore)
      return {
        userId: user.id,
        displayKey: user.display_key,
        name: user.name,
        apartment: user.apartment,
        tower: user.tower,
        phone: user.phone,
        matchScore,
        reciprocalScore,
        mutualScore,
        matchStickers,
        reciprocalStickers,
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
