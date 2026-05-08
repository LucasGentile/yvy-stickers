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

  // Delete existing stickers for this user (idempotent replace)
  const { error: deleteError } = await supabase.from('user_stickers').delete().eq('user_id', userId)

  if (deleteError) {
    return { success: false, error: 'Erro ao atualizar figurinhas. Tente novamente.' }
  }

  if (stickerIds.length === 0) {
    return { success: true, count: 0 }
  }

  const rows = stickerIds.map((sticker_id) => ({ user_id: userId, sticker_id }))

  const { error: insertError } = await supabase.from('user_stickers').insert(rows)

  if (insertError) {
    return { success: false, error: 'Erro ao salvar figurinhas. Tente novamente.' }
  }

  logAction(userId, 'stickers_saved', { total: stickerIds.length })
  return { success: true, count: stickerIds.length }
}
