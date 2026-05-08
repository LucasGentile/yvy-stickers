'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type TradeResult = { success: true } | { success: false; error: string }

export async function effectuateTrade(
  currentUserId: string,
  otherUserId: string,
  givingIds: string[], // stickers current user gives
  receivingIds: string[] // stickers current user receives
): Promise<TradeResult> {
  if (givingIds.length === 0 && receivingIds.length === 0) {
    return { success: false, error: 'Nenhuma figurinha selecionada.' }
  }

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, input_mode')
    .in('id', [currentUserId, otherUserId])

  if (!users || users.length < 2) {
    return { success: false, error: 'Usuários não encontrados.' }
  }

  const currentMode = users.find((u) => u.id === currentUserId)!.input_mode
  const otherMode = users.find((u) => u.id === otherUserId)!.input_mode

  async function decrementDupes(userId: string, ids: string[]) {
    for (const sid of ids) {
      const { data } = await supabaseAdmin
        .from('user_duplicates')
        .select('count')
        .eq('user_id', userId)
        .eq('sticker_id', sid)
        .maybeSingle()
      if (!data) continue
      if (data.count > 1) {
        await supabaseAdmin
          .from('user_duplicates')
          .update({ count: data.count - 1 })
          .eq('user_id', userId)
          .eq('sticker_id', sid)
      } else {
        await supabaseAdmin
          .from('user_duplicates')
          .delete()
          .eq('user_id', userId)
          .eq('sticker_id', sid)
      }
    }
  }

  async function addToCollection(userId: string, mode: string, ids: string[]) {
    if (ids.length === 0) return
    if (mode === 'have') {
      await supabaseAdmin.from('user_stickers').upsert(
        ids.map((sid) => ({ user_id: userId, sticker_id: sid })),
        {
          onConflict: 'user_id,sticker_id',
        }
      )
    } else {
      // "need" mode: user marks what they need → remove received stickers (no longer needed)
      await supabaseAdmin.from('user_stickers').delete().eq('user_id', userId).in('sticker_id', ids)
    }
  }

  // Current user: gives givingIds, receives receivingIds
  await decrementDupes(currentUserId, givingIds)
  await addToCollection(currentUserId, currentMode, receivingIds)

  // Other user: gives receivingIds, receives givingIds
  await decrementDupes(otherUserId, receivingIds)
  await addToCollection(otherUserId, otherMode, givingIds)

  return { success: true }
}
