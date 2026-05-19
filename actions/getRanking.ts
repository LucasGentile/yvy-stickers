'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ALL_STICKER_IDS } from '@/lib/stickers'
import { formatName } from '@/lib/format'

export type RankedUser = {
  id: string
  name: string
  apartment: string
  tower: string
  ownedCount: number
  totalCount: number
  completionPct: number
  albumCompletedAt: string | null
}

export async function getRanking(): Promise<RankedUser[]> {
  const total = ALL_STICKER_IDS.length

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: users } = await (supabaseAdmin as any)
    .from('users')
    .select('id, name, apartment, tower, album_completed_at')
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

  type UserRow = {
    id: string
    name: string
    apartment: string
    tower: string
    album_completed_at: string | null
  }
  const ranked: RankedUser[] = (users as UserRow[])
    .filter((u) => (countByUser[u.id] ?? 0) > 0)
    .map((u) => {
      const ownedCount = countByUser[u.id]!
      const completionPct = Math.round((ownedCount / total) * 100)
      return {
        id: u.id,
        name: formatName(u.name),
        apartment: u.apartment,
        tower: u.tower,
        ownedCount,
        totalCount: total,
        completionPct,
        albumCompletedAt: u.album_completed_at ?? null,
      }
    })

  return ranked.sort((a, b) => {
    const aComplete = a.completionPct === 100
    const bComplete = b.completionPct === 100
    if (aComplete && bComplete) {
      const aTime = a.albumCompletedAt ? new Date(a.albumCompletedAt).getTime() : Infinity
      const bTime = b.albumCompletedAt ? new Date(b.albumCompletedAt).getTime() : Infinity
      return aTime - bTime
    }
    if (aComplete) return -1
    if (bComplete) return 1
    return b.ownedCount - a.ownedCount || a.name.localeCompare(b.name)
  })
}
