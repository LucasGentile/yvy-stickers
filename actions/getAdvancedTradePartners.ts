'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { formatName } from '@/lib/format'

export type AdvancedTradePartner = { id: string; name: string }

export async function getAdvancedTradePartners(userId: string): Promise<AdvancedTradePartner[]> {
  if (!userId) return []

  const { data } = await supabaseAdmin
    .from('users')
    .select('id, name, user_duplicates(count)')
    .eq('approved', true)
    .eq('trades_blocked', false)
    .neq('id', userId)

  type Row = { id: string; name: string; user_duplicates: { count: number }[] }
  return ((data ?? []) as Row[])
    .filter((u) => u.user_duplicates.some((d) => d.count >= 1))
    .map((u) => ({ id: u.id, name: formatName(u.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}
