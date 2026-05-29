'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type VerifyResult = { success: true } | { success: false; error: string }

export async function verifyTrade(
  tradeId: string,
  userId: string,
  type: 'normal' | 'advanced'
): Promise<VerifyResult> {
  if (!tradeId || !userId) return { success: false, error: 'Parâmetros inválidos.' }

  const table = type === 'advanced' ? 'advanced_trades' : 'pending_trades'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from(table)
    .update({ verified_at: new Date().toISOString(), verified_by: userId })
    .eq('id', tradeId)
    .in('status', ['accepted', 'rolled_back'])
    .is('verified_at', null)
    .select('id')
    .maybeSingle()

  if (!data) {
    return { success: false, error: 'Troca não encontrada ou já verificada.' }
  }

  return { success: true }
}
