'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function setTradesBlocked(userId: string, blocked: boolean): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ trades_blocked: blocked })
    .eq('id', userId)
  return !error
}
