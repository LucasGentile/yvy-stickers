'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type ApproveResult = { success: true } | { success: false; error: string }

export async function approveUser(callerId: string, targetUserId: string): Promise<ApproveResult> {
  const { data: caller } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', callerId)
    .maybeSingle()

  if (!caller?.is_admin) return { success: false, error: 'Não autorizado.' }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ approved: true })
    .eq('id', targetUserId)

  if (error) return { success: false, error: 'Erro ao aprovar usuário.' }
  return { success: true }
}
