'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { effectuateAdvancedTrade } from './effectuateAdvancedTrade'
import { logAction } from './logAction'
import { formatName } from '@/lib/format'

export type RespondAdvancedResult = { success: true } | { success: false; error: string }

export async function respondToAdvancedTrade(
  tradeId: string,
  userId: string,
  action: 'approve' | 'reject' | 'cancel'
): Promise<RespondAdvancedResult> {
  if (!tradeId || !userId) {
    return { success: false, error: 'Parâmetros inválidos.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: trade } = await (supabaseAdmin as any)
    .from('advanced_trades')
    .select(
      'id, status, user_a_id, user_b_id, user_c_id, a_gives_ids, b_gives_ids, c_gives_ids, user_a_status, user_b_status, user_c_status, requested_by'
    )
    .eq('id', tradeId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!trade) {
    return { success: false, error: 'Troca não encontrada ou já processada.' }
  }

  // Determine which slot the user occupies
  let statusColumn: string
  if (trade.user_a_id === userId) statusColumn = 'user_a_status'
  else if (trade.user_b_id === userId) statusColumn = 'user_b_status'
  else if (trade.user_c_id === userId) statusColumn = 'user_c_status'
  else return { success: false, error: 'Você não faz parte desta troca.' }

  if (action === 'cancel') {
    if (trade.requested_by !== userId) {
      return { success: false, error: 'Apenas quem propôs a troca pode cancelá-la.' }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from('advanced_trades')
      .update({ status: 'cancelled' })
      .eq('id', tradeId)
      .eq('status', 'pending')
    ;(async () => {
      try {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, name')
          .in('id', [trade.user_a_id, trade.user_b_id, trade.user_c_id])
        const nameMap = Object.fromEntries((users ?? []).map((u) => [u.id, formatName(u.name)]))
        const participants = [trade.user_a_id, trade.user_b_id, trade.user_c_id]
        for (const pid of participants) {
          const others = participants
            .filter((id) => id !== pid)
            .map((id) => nameMap[id] ?? 'Usuário')
          logAction(pid, 'advanced_trade_cancelled', {
            tradeId: trade.id,
            cancelledBy: nameMap[userId] ?? 'Usuário',
            partners: others,
          })
        }
      } catch {
        /* logging is best-effort */
      }
    })()

    return { success: true }
  }

  const currentStatus = trade[statusColumn]
  if (currentStatus !== 'pending') {
    return { success: false, error: 'Você já respondeu a esta troca.' }
  }

  if (action === 'reject') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from('advanced_trades')
      .update({ [statusColumn]: 'rejected', status: 'rejected' })
      .eq('id', tradeId)
      .eq('status', 'pending')

    // Fire-and-forget logging
    ;(async () => {
      try {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, name')
          .in('id', [trade.user_a_id, trade.user_b_id, trade.user_c_id])
        const nameMap = Object.fromEntries((users ?? []).map((u) => [u.id, formatName(u.name)]))
        const participants = [trade.user_a_id, trade.user_b_id, trade.user_c_id]
        for (const pid of participants) {
          const others = participants
            .filter((id) => id !== pid)
            .map((id) => nameMap[id] ?? 'Usuário')
          logAction(pid, 'advanced_trade_rejected', {
            tradeId: trade.id,
            rejectedBy: nameMap[userId] ?? 'Usuário',
            partners: others,
          })
        }
      } catch {
        /* logging is best-effort */
      }
    })()

    return { success: true }
  }

  // action === 'approve'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated } = await (supabaseAdmin as any)
    .from('advanced_trades')
    .update({ [statusColumn]: 'approved' })
    .eq('id', tradeId)
    .eq('status', 'pending')
    .eq(statusColumn, 'pending')
    .select('id, user_a_status, user_b_status, user_c_status')
    .maybeSingle()

  if (!updated) {
    return { success: false, error: 'Troca já foi processada em outro dispositivo.' }
  }

  // Check if all 3 are now approved
  const statuses = [updated.user_a_status, updated.user_b_status, updated.user_c_status]
  const allApproved = statuses.every((s: string) => s === 'approved')

  // Always log the approval for all participants
  ;(async () => {
    try {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, name')
        .in('id', [trade.user_a_id, trade.user_b_id, trade.user_c_id])
      const nameMap = Object.fromEntries((users ?? []).map((u) => [u.id, formatName(u.name)]))
      const approverName = nameMap[userId] ?? 'Usuário'
      const participants = [trade.user_a_id, trade.user_b_id, trade.user_c_id]
      for (const pid of participants) {
        const others = participants.filter((id) => id !== pid).map((id) => nameMap[id] ?? 'Usuário')
        logAction(pid, 'advanced_trade_approved', {
          tradeId: trade.id,
          partners: others,
          approvedBy: approverName,
          isSelf: pid === userId,
        })
      }
    } catch {
      /* logging is best-effort */
    }
  })()

  if (allApproved) {
    const result = await effectuateAdvancedTrade(
      trade.user_a_id,
      trade.user_b_id,
      trade.user_c_id,
      trade.a_gives_ids,
      trade.b_gives_ids,
      trade.c_gives_ids
    )

    if (!result.success) {
      // Revert: cancel the trade since stickers are no longer available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from('advanced_trades')
        .update({ status: 'cancelled' })
        .eq('id', tradeId)
      return { success: false, error: result.error }
    }

    // Mark as accepted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from('advanced_trades')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', tradeId)

    // Fire-and-forget logging with sticker details per participant
    ;(async () => {
      try {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, name')
          .in('id', [trade.user_a_id, trade.user_b_id, trade.user_c_id])
        const nameMap = Object.fromEntries((users ?? []).map((u) => [u.id, formatName(u.name)]))
        // Cycle: A→B→C→A. Each gives to the next, receives from the previous.
        const legs: Array<{
          userId: string
          givingIds: string[]
          receivingIds: string[]
          giveToId: string
          receiveFromId: string
          thirdPartyIds: string[]
          thirdPartyFromName: string
          thirdPartyToName: string
        }> = [
          {
            userId: trade.user_a_id,
            givingIds: trade.a_gives_ids,
            receivingIds: trade.c_gives_ids,
            giveToId: trade.user_b_id,
            receiveFromId: trade.user_c_id,
            thirdPartyIds: trade.b_gives_ids,
            thirdPartyFromName: nameMap[trade.user_b_id] ?? 'Usuário',
            thirdPartyToName: nameMap[trade.user_c_id] ?? 'Usuário',
          },
          {
            userId: trade.user_b_id,
            givingIds: trade.b_gives_ids,
            receivingIds: trade.a_gives_ids,
            giveToId: trade.user_c_id,
            receiveFromId: trade.user_a_id,
            thirdPartyIds: trade.c_gives_ids,
            thirdPartyFromName: nameMap[trade.user_c_id] ?? 'Usuário',
            thirdPartyToName: nameMap[trade.user_a_id] ?? 'Usuário',
          },
          {
            userId: trade.user_c_id,
            givingIds: trade.c_gives_ids,
            receivingIds: trade.b_gives_ids,
            giveToId: trade.user_a_id,
            receiveFromId: trade.user_b_id,
            thirdPartyIds: trade.a_gives_ids,
            thirdPartyFromName: nameMap[trade.user_a_id] ?? 'Usuário',
            thirdPartyToName: nameMap[trade.user_b_id] ?? 'Usuário',
          },
        ]
        for (const leg of legs) {
          const partners = [trade.user_a_id, trade.user_b_id, trade.user_c_id]
            .filter((id) => id !== leg.userId)
            .map((id) => nameMap[id] ?? 'Usuário')
          logAction(leg.userId, 'advanced_trade_executed', {
            tradeId: trade.id,
            partners,
            givingIds: leg.givingIds,
            receivingIds: leg.receivingIds,
            giveToName: nameMap[leg.giveToId] ?? 'Usuário',
            receiveFromName: nameMap[leg.receiveFromId] ?? 'Usuário',
            thirdPartyIds: leg.thirdPartyIds,
            thirdPartyFromName: leg.thirdPartyFromName,
            thirdPartyToName: leg.thirdPartyToName,
          })
        }
      } catch {
        /* logging is best-effort */
      }
    })()
  }

  return { success: true }
}
