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
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []) as AuditEntry[]
}
