'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { AuditEntry } from './getAuditLog'

export type TradeTimeline = {
  entries: AuditEntry[]
  focusedEntryId: string
  tradeId: string | null
}

export async function getTradeTimeline(
  entryId: string,
  userId: string
): Promise<TradeTimeline | null> {
  if (!entryId || !userId) return null

  const { data: entry } = await supabaseAdmin
    .from('audit_log')
    .select('id, action, metadata, created_at, user_id')
    .eq('id', entryId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!entry) return null

  const tradeId = (entry.metadata as Record<string, unknown>)?.tradeId as string | undefined

  if (!tradeId) {
    return {
      entries: [entry as AuditEntry],
      focusedEntryId: entryId,
      tradeId: null,
    }
  }

  const { data: related } = await supabaseAdmin
    .from('audit_log')
    .select('id, action, metadata, created_at')
    .eq('user_id', userId)
    .filter('metadata->>tradeId', 'eq', tradeId)
    .order('created_at', { ascending: false })

  return {
    entries: (related ?? []) as AuditEntry[],
    focusedEntryId: entryId,
    tradeId,
  }
}
