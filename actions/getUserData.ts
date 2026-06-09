'use server'

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { deactivateStaleUsers } from './deactivateStaleUsers'

export type UserData = {
  inputMode: 'have' | 'need'
  stickerIds: string[]
  approved: boolean
  tradesBlocked: boolean
}

export async function getUserData(userId: string): Promise<UserData | null> {
  deactivateStaleUsers().catch(() => {})
  const { data: user } = await supabase
    .from('users')
    .select('input_mode, approved, trades_blocked')
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
    approved: user.approved as boolean,
    tradesBlocked: (user.trades_blocked as boolean) ?? false,
  }
}
