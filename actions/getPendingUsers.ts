'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type PendingUser = {
  id: string
  name: string
  tower: string
  apartment: string
  phone: string
  created_at: string
}

/** Returns pending users for admin, or null if caller is not an admin. */
export async function getPendingUsers(callerId: string): Promise<PendingUser[] | null> {
  const { data: caller } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', callerId)
    .maybeSingle()

  if (!caller?.is_admin) return null

  const { data } = await supabaseAdmin
    .from('users')
    .select('id, name, tower, apartment, phone, created_at')
    .eq('approved', false)
    .order('created_at', { ascending: true })

  return (data ?? []) as PendingUser[]
}
