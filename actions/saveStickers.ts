'use server'

import { supabase } from '@/lib/supabase'
import { logAction } from './logAction'

export type SaveStickersResult =
  | { success: true; count: number }
  | { success: false; error: string }

export async function saveStickers(
  userId: string,
  stickerIds: string[]
): Promise<SaveStickersResult> {
  if (!userId) {
    return { success: false, error: 'Usuário não identificado.' }
  }

  // Fetch existing before deleting so we can compute the delta for the audit log
  const { data: existing } = await supabase
    .from('user_stickers')
    .select('sticker_id')
    .eq('user_id', userId)
  const existingSet = new Set((existing ?? []).map((r) => r.sticker_id))
  const newSet = new Set(stickerIds)

  // Delete existing stickers for this user (idempotent replace)
  const { error: deleteError } = await supabase.from('user_stickers').delete().eq('user_id', userId)

  if (deleteError) {
    return { success: false, error: 'Erro ao atualizar figurinhas. Tente novamente.' }
  }

  const added = stickerIds.filter((id) => !existingSet.has(id)).length
  const removed = [...existingSet].filter((id) => !newSet.has(id)).length

  if (stickerIds.length === 0) {
    logAction(userId, 'stickers_saved', { added: 0, removed, total: 0 })
    return { success: true, count: 0 }
  }

  const rows = stickerIds.map((sticker_id) => ({ user_id: userId, sticker_id }))

  const { error: insertError } = await supabase.from('user_stickers').insert(rows)

  if (insertError) {
    return { success: false, error: 'Erro ao salvar figurinhas. Tente novamente.' }
  }

  logAction(userId, 'stickers_saved', { added, removed, total: stickerIds.length })
  return { success: true, count: stickerIds.length }
}
