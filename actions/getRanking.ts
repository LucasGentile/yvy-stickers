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
    .select('id, name, apartment, tower, input_mode')
    .eq('approved', true)

  if (!users || users.length === 0) return []

  const { data: stickerRows } = await supabaseAdmin.from('user_stickers').select('user_id')

  const countByUser: Record<string, number> = {}
  for (const row of stickerRows ?? []) {
    countByUser[row.user_id] = (countByUser[row.user_id] ?? 0) + 1
  }

  const ranked: RankedUser[] = users.map((u) => {
    const count = countByUser[u.id] ?? 0
    const ownedCount = u.input_mode === 'need' ? total - count : count
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
