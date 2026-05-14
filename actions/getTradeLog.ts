'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { AuditEntry } from './getAuditLog'

export async function getTradeLog(userId: string): Promise<AuditEntry[]> {
  const { data } = await supabaseAdmin
    .from('audit_log')
    .select('id, action, metadata, created_at')
    .eq('user_id', userId)
    .in('action', [
      'trade_accepted',
      'trade_sent',
      'trade_rejected',
      'trade_cancelled',
      'trade_rolled_back',
      'advanced_trade_proposed',
      'advanced_trade_approved',
      'advanced_trade_rejected',
      'advanced_trade_executed',
      'advanced_trade_cancelled',
    ])
    .order('created_at', { ascending: false })
    .limit(500)
  return (data ?? []) as AuditEntry[]
}
