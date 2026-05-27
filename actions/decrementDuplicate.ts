'use server'

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

export async function decrementDuplicate(userId: string, stickerId: string): Promise<void> {
  const { data } = await supabase
    .from('user_duplicates')
    .select('count')
    .eq('user_id', userId)
    .eq('sticker_id', stickerId)
    .maybeSingle()

  if (!data) return

  if (data.count <= 1) {
    await supabase
      .from('user_duplicates')
      .delete()
      .eq('user_id', userId)
      .eq('sticker_id', stickerId)
  } else {
    await supabase
      .from('user_duplicates')
      .update({ count: data.count - 1 })
      .eq('user_id', userId)
      .eq('sticker_id', stickerId)
  }
}
