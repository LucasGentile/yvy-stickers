'use server'

import { supabase } from '@/lib/supabase'

export type UserData = {
  inputMode: 'have' | 'need'
  stickerIds: number[]
}

export async function getUserData(userId: string): Promise<UserData | null> {
  const { data: user } = await supabase
    .from('users')
    .select('input_mode')
    .eq('id', userId)
    .maybeSingle()

  if (!user) return null

  const { data: stickers } = await supabase
    .from('user_stickers')
    .select('sticker_id')
    .eq('user_id', userId)

  return {
    inputMode: user.input_mode as 'have' | 'need',
    stickerIds: (stickers ?? []).map((r) => r.sticker_id),
  }
}
