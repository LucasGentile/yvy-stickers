'use server'

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { logAction } from './logAction'

export async function removeDuplicate(userId: string, stickerId: string): Promise<void> {
  await supabase.from('user_duplicates').delete().eq('user_id', userId).eq('sticker_id', stickerId)
  logAction(userId, 'duplicate_removed', { stickerId })
}
