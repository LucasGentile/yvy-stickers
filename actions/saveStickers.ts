'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ALL_STICKER_IDS } from '@/lib/stickers'
import { logAction } from './logAction'

export type SaveStickersResult =
  | { success: true; count: number; removedWithDupes: string[] }
  | { success: false; error: string }

export async function saveStickers(
  userId: string,
  stickerIds: string[]
): Promise<SaveStickersResult> {
  if (!userId) {
    return { success: false, error: 'Usuário não identificado.' }
  }

  // Fetch existing before deleting so we can compute the delta for the audit log
  const { data: existing } = await supabaseAdmin
    .from('user_stickers')
    .select('sticker_id')
    .eq('user_id', userId)
  const existingSet = new Set((existing ?? []).map((r) => r.sticker_id))
  const newSet = new Set(stickerIds)

  // Delete existing stickers for this user (idempotent replace)
  const { error: deleteError } = await supabaseAdmin
    .from('user_stickers')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    return { success: false, error: 'Erro ao atualizar figurinhas. Tente novamente.' }
  }

  const addedIds = stickerIds.filter((id) => !existingSet.has(id))
  const removed = [...existingSet].filter((id) => !newSet.has(id)).length

  if (stickerIds.length === 0) {
    logAction(userId, 'stickers_saved', { added: 0, addedIds: [], removed, total: 0 })
    return { success: true, count: 0, removedWithDupes: [] }
  }

  const rows = stickerIds.map((sticker_id) => ({ user_id: userId, sticker_id }))

  const { error: insertError } = await supabaseAdmin.from('user_stickers').insert(rows)

  if (insertError) {
    return { success: false, error: 'Erro ao salvar figurinhas. Tente novamente.' }
  }

  // Check if any removed stickers still have duplicates registered
  const removedIds = [...existingSet].filter((id) => !newSet.has(id))
  let removedWithDupes: string[] = []
  if (removedIds.length > 0) {
    const { data: dupes } = await supabaseAdmin
      .from('user_duplicates')
      .select('sticker_id')
      .eq('user_id', userId)
      .in('sticker_id', removedIds)
    removedWithDupes = (dupes ?? []).map((d) => d.sticker_id)
  }

  logAction(userId, 'stickers_saved', {
    added: addedIds.length,
    addedIds,
    removed,
    total: stickerIds.length,
  })

  if (stickerIds.length >= ALL_STICKER_IDS.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabaseAdmin as any)
      .from('users')
      .update({ album_completed_at: new Date().toISOString() })
      .eq('id', userId)
      .is('album_completed_at', null)
      .then(
        () => {},
        () => {}
      )
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabaseAdmin as any)
      .from('users')
      .update({ album_completed_at: null })
      .eq('id', userId)
      .not('album_completed_at', 'is', null)
      .then(
        () => {},
        () => {}
      )
  }

  return { success: true, count: stickerIds.length, removedWithDupes }
}
