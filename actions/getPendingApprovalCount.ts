'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

/** Returns the number of pending approvals for admin users, or null if the caller is not an admin. */
export async function getPendingApprovalCount(callerId: string): Promise<number | null> {
  const { data: caller } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', callerId)
    .maybeSingle()

  if (!caller?.is_admin) return null

  const { data } = await supabaseAdmin.from('users').select('id').eq('approved', false)

  return data?.length ?? 0
}
