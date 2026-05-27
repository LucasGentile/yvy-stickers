'use server'

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { STICKER_SET } from '@/lib/stickers'
import { logAction } from './logAction'

export type UpsertDuplicateResult = { success: true } | { success: false; error: string }

export async function upsertDuplicate(
  userId: string,
  stickerId: string,
  count: number
): Promise<UpsertDuplicateResult> {
  if (count < 1 || count > 100) {
    return { success: false, error: 'Quantidade inválida (1–100).' }
  }

  if (!STICKER_SET.has(stickerId)) {
    return { success: false, error: `Código de figurinha inválido: "${stickerId}".` }
  }

  // Validate ownership based on the user's input_mode
  const { data: user } = await supabase
    .from('users')
    .select('input_mode')
    .eq('id', userId)
    .maybeSingle()

  if (!user) return { success: false, error: 'Usuário não encontrado.' }

  const { data: stickerRow } = await supabase
    .from('user_stickers')
    .select('id')
    .eq('user_id', userId)
    .eq('sticker_id', stickerId)
    .maybeSingle()

  // 'have' mode: sticker must be in user_stickers (they own it)
  // 'need' mode: sticker must NOT be in user_stickers (they own everything else)
  const isOwned = user.input_mode === 'have' ? !!stickerRow : !stickerRow

  if (!isOwned) {
    return { success: false, error: 'Figurinha não encontrada na sua coleção.' }
  }

  const { error } = await supabase
    .from('user_duplicates')
    .upsert({ user_id: userId, sticker_id: stickerId, count }, { onConflict: 'user_id,sticker_id' })

  if (error) return { success: false, error: error.message }
  logAction(userId, 'duplicate_updated', { stickerId, count })
  return { success: true }
}
