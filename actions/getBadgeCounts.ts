'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkAdvancedTradeEligibility } from '@/lib/advancedMatching'

export type BadgeCounts = {
  pendingTrades: number
  pendingApproval: number | null
  purchaseRequests: number
  advancedTradePending: number
  advancedTradeEligible: boolean
}

export async function getBadgeCounts(userId: string): Promise<BadgeCounts> {
  const [{ data: user }, { data: trades }, { data: advancedTrades }, purchaseReqResult, canSearch] =
    await Promise.all([
      supabaseAdmin.from('users').select('is_admin').eq('id', userId).maybeSingle(),
      supabaseAdmin
        .from('pending_trades')
        .select('receiver_id, status, rollback_requested_by')
        .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
        .in('status', ['pending', 'accepted']),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseAdmin as any)
        .from('advanced_trades')
        .select('user_a_id, user_b_id, user_c_id, user_a_status, user_b_status, user_c_status')
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId},user_c_id.eq.${userId}`)
        .eq('status', 'pending'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseAdmin as any)
        .from('purchase_requests')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', userId)
        .eq('status', 'pending'),
      checkAdvancedTradeEligibility(userId),
    ])

  const received = (trades ?? []).filter(
    (t) => t.status === 'pending' && t.receiver_id === userId
  ).length
  const rollbackFromOthers = (trades ?? []).filter(
    (t) =>
      t.status === 'accepted' &&
      t.rollback_requested_by !== null &&
      t.rollback_requested_by !== userId
  ).length

  const pendingAdvanced = (
    advancedTrades as Array<{
      user_a_id: string
      user_b_id: string
      user_c_id: string
      user_a_status: string
      user_b_status: string
      user_c_status: string
    }>
  ).filter((t) => {
    if (t.user_a_id === userId) return t.user_a_status === 'pending'
    if (t.user_b_id === userId) return t.user_b_status === 'pending'
    if (t.user_c_id === userId) return t.user_c_status === 'pending'
    return false
  })

  let pendingApproval: number | null = null
  if (user?.is_admin) {
    const { data: unapproved } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('approved', false)
    pendingApproval = unapproved?.length ?? 0
  }

  return {
    pendingTrades: received + rollbackFromOthers,
    pendingApproval,
    purchaseRequests: purchaseReqResult.count ?? 0,
    advancedTradePending: pendingAdvanced.length,
    advancedTradeEligible: pendingAdvanced.length > 0 || canSearch,
  }
}
