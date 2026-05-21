'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function checkAlreadyOwnedIncoming(
  userId: string,
  receivingIds: string[]
) {
  if (!userId || receivingIds.length === 0) return []

  const { data } = await supabaseAdmin
    .from('user_stickers')
    .select('sticker_id')
    .eq('user_id', userId)
    .in('sticker_id', receivingIds)

  return (data ?? []).map((r) => r.sticker_id)
}
