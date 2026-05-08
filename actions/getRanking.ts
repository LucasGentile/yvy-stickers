'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ALL_STICKER_IDS } from '@/lib/stickers'

export type RankedUser = {
  id: string
  name: string
  apartment: string
  tower: string
  ownedCount: number
  totalCount: number
  completionPct: number
}

export async function getRanking(): Promise<RankedUser[]> {
  const total = ALL_STICKER_IDS.length

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name, apartment, tower')
    .eq('approved', true)

  if (!users || users.length === 0) return []

  // Use an RPC aggregate instead of fetching all rows — PostgREST caps plain
  // selects at 1000 rows by default, which silently undercounts large tables.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stickerCounts } = await (supabaseAdmin as any).rpc('get_sticker_counts_by_user')

  const countByUser: Record<string, number> = {}
  for (const row of stickerCounts ?? []) {
    countByUser[row.user_id] = Number(row.sticker_count)
  }

  const ranked: RankedUser[] = users
    .filter((u) => (countByUser[u.id] ?? 0) > 0) // exclude users who haven't submitted any sticker data
    .map((u) => {
      const ownedCount = countByUser[u.id]!
      const completionPct = Math.round((ownedCount / total) * 100)
      return {
        id: u.id,
        name: u.name,
        apartment: u.apartment,
        tower: u.tower,
        ownedCount,
        totalCount: total,
        completionPct,
      }
    })

  return ranked.sort((a, b) => b.ownedCount - a.ownedCount || a.name.localeCompare(b.name))
}
