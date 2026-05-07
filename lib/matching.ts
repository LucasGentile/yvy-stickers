import { supabase } from '@/lib/supabase'
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
  return mode === 'have'
    ? new Set(ALL_STICKER_IDS.filter((id) => !marked.has(id)))
    : marked
}

export async function getMatches(currentUserId: string): Promise<MatchResult[]> {
  // Fetch current user's mode, stickers, and duplicates in parallel
  const { data: myUser } = await supabase
    .from('users')
    .select('input_mode')
    .eq('id', currentUserId)
    .maybeSingle()

  if (!myUser) return []

  const [{ data: myStickers }, { data: myDupes }] = await Promise.all([
    supabase.from('user_stickers').select('sticker_id').eq('user_id', currentUserId),
    supabase.from('user_duplicates').select('sticker_id, count').eq('user_id', currentUserId),
  ])

  const myMarked = new Set((myStickers ?? []).map((r) => r.sticker_id))
  const myNeeded = computeNeeded(myUser.input_mode, myMarked)
  const myDupeSet = new Set((myDupes ?? []).map((r) => r.sticker_id))

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

  const { data: others } = (await supabase
    .from('users')
    .select('id, display_key, name, apartment, tower, phone, input_mode, user_stickers(sticker_id), user_duplicates(sticker_id, count)')
    .neq('id', currentUserId)
    .eq('approved', true)) as { data: OtherUser[] | null; error: unknown }

  if (!others) return []

  const results: MatchResult[] = others
    .map((user) => {
      const theirMarked = new Set(user.user_stickers.map((r) => r.sticker_id))
      const theirNeeded = computeNeeded(user.input_mode, theirMarked)
      const theirDupeSet = new Set(user.user_duplicates.map((r) => r.sticker_id))

      // Stickers they have duplicates of that I need
      const matchStickers = [...theirDupeSet].filter((id) => myNeeded.has(id)).sort()
      const matchScore = matchStickers.length

      // Stickers I have duplicates of that they need
      const reciprocalStickers = [...myDupeSet].filter((id) => theirNeeded.has(id)).sort()
      const reciprocalScore = reciprocalStickers.length

      const mutualScore = Math.min(matchScore, reciprocalScore)
      return { userId: user.id, displayKey: user.display_key, name: user.name, apartment: user.apartment, tower: user.tower, phone: user.phone, matchScore, reciprocalScore, mutualScore, matchStickers, reciprocalStickers }
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
