'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type AuditEntry = {
  id: string
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

export async function getAuditLog(userId: string): Promise<AuditEntry[]> {
  const { data } = await supabaseAdmin
    .from('audit_log')
    .select('id, action, metadata, created_at')
    .eq('user_id', userId)
    .not(
      'action',
      'in',
      '(trade_accepted,trade_sent,trade_received,trade_rejected,trade_cancelled,trade_rolled_back,trade_rollback_requested,trade_rollback_denied,advanced_trade_proposed,advanced_trade_approved,advanced_trade_rejected,advanced_trade_executed,advanced_trade_cancelled,advanced_trade_rollback_requested,advanced_trade_rollback_denied,advanced_trade_rolled_back)'
    )
    .order('created_at', { ascending: false })
    .limit(100)

  return (data ?? []) as AuditEntry[]
}
