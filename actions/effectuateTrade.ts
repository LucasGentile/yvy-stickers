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

  async function incrementDuplicate(userId: string, sid: string) {
    const { data } = await supabaseAdmin
      .from('user_duplicates')
      .select('count')
      .eq('user_id', userId)
      .eq('sticker_id', sid)
      .maybeSingle()
    if (data) {
      await supabaseAdmin
        .from('user_duplicates')
        .update({ count: data.count + 1 })
        .eq('user_id', userId)
        .eq('sticker_id', sid)
    } else {
      await supabaseAdmin
        .from('user_duplicates')
        .insert({ user_id: userId, sticker_id: sid, count: 1 })
    }
  }

  async function addToCollection(userId: string, mode: string, ids: string[]) {
    if (ids.length === 0) return

    // Check which received stickers the user already owns so we can route
    // them to user_duplicates instead of silently no-op-ing the upsert.
    const { data: existing } = await supabaseAdmin
      .from('user_stickers')
      .select('sticker_id')
      .eq('user_id', userId)
      .in('sticker_id', ids)
    const existingSet = new Set((existing ?? []).map((r) => r.sticker_id))

    if (mode === 'have') {
      const newIds = ids.filter((id) => !existingSet.has(id))
      const alreadyOwnedIds = ids.filter((id) => existingSet.has(id))

      if (newIds.length > 0) {
        await supabaseAdmin.from('user_stickers').upsert(
          newIds.map((sid) => ({ user_id: userId, sticker_id: sid })),
          { onConflict: 'user_id,sticker_id' }
        )
      }
      for (const sid of alreadyOwnedIds) {
        await incrementDuplicate(userId, sid)
      }
    } else {
      // "need" mode: user_stickers contains stickers they still need (don't have)
      // Received stickers that are still in the need list → remove (now obtained)
      // Received stickers already absent from need list → already owned → duplicate
      const stillNeededIds = ids.filter((id) => existingSet.has(id))
      const alreadyOwnedIds = ids.filter((id) => !existingSet.has(id))

      if (stillNeededIds.length > 0) {
        await supabaseAdmin
          .from('user_stickers')
          .delete()
          .eq('user_id', userId)
          .in('sticker_id', stillNeededIds)
      }
      for (const sid of alreadyOwnedIds) {
        await incrementDuplicate(userId, sid)
      }
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
