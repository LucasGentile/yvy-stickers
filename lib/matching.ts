import { supabase } from '@/lib/supabase'

export type MatchResult = {
  userId: string
  displayKey: string
  phone: string
  matchScore: number
  reciprocalScore: number
}

export async function getMatches(currentUserId: string): Promise<MatchResult[]> {
  // Fetch current user's stickers
  const { data: myStickers } = await supabase
    .from('user_stickers')
    .select('sticker_id')
    .eq('user_id', currentUserId)

  const myOwned = new Set((myStickers ?? []).map((r) => r.sticker_id))
  const myMissing = new Set(
    Array.from({ length: 980 }, (_, i) => i + 1).filter((n) => !myOwned.has(n))
  )

  type OtherUser = {
    id: string
    display_key: string
    phone: string
    user_stickers: { sticker_id: number }[]
  }

  // Fetch all other users and their stickers
  const { data: others } = (await supabase
    .from('users')
    .select('id, display_key, phone, user_stickers(sticker_id)')
    .neq('id', currentUserId)) as { data: OtherUser[] | null; error: unknown }

  if (!others) return []

  const results: MatchResult[] = others.map((user) => {
    const theirOwned = new Set(user.user_stickers.map((r) => r.sticker_id))
    const theirMissing = new Set(
      Array.from({ length: 980 }, (_, i) => i + 1).filter((n) => !theirOwned.has(n))
    )

    let matchScore = 0
    for (const id of theirOwned) {
      if (myMissing.has(id)) matchScore++
    }

    let reciprocalScore = 0
    for (const id of myOwned) {
      if (theirMissing.has(id)) reciprocalScore++
    }

    return {
      userId: user.id,
      displayKey: user.display_key,
      phone: user.phone,
      matchScore,
      reciprocalScore,
    }
  })

  return results
    .filter((r) => r.matchScore > 0 || r.reciprocalScore > 0)
    .sort((a, b) =>
      b.matchScore !== a.matchScore
        ? b.matchScore - a.matchScore
        : b.reciprocalScore - a.reciprocalScore
    )
}
