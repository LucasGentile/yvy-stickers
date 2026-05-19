'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { logAction } from './logAction'
import { formatName } from '@/lib/format'

export type RollbackAdvancedResult = { success: true } | { success: false; error: string }

const FORCE_UNDO_DELAY_MS = 7 * 24 * 60 * 60 * 1000

async function restoreDupe(userId: string, ids: string[]) {
  for (const sid of ids) {
    const { data } = await supabaseAdmin
      .from('user_duplicates')
      .select('count')
      .eq('user_id', userId)
      .eq('sticker_id', sid)
      .maybeSingle()
    if (data) {
      await supabaseAdmin
        .from('user_duplicates')
        .update({ count: data.count + 1 })
        .eq('user_id', userId)
        .eq('sticker_id', sid)
    } else {
      await supabaseAdmin
        .from('user_duplicates')
        .insert({ user_id: userId, sticker_id: sid, count: 1 })
    }
  }
}

async function removeFromCollection(userId: string, ids: string[]) {
  if (ids.length === 0) return
  await supabaseAdmin.from('user_stickers').delete().eq('user_id', userId).in('sticker_id', ids)
}

export async function rollbackAdvancedTrade(
  tradeId: string,
  userId: string,
  action: 'request' | 'confirm' | 'deny' | 'force'
): Promise<RollbackAdvancedResult> {
  if (!tradeId || !userId) return { success: false, error: 'Parâmetros inválidos.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: trade } = await (supabaseAdmin as any)
    .from('advanced_trades')
    .select(
      'id, status, user_a_id, user_b_id, user_c_id, a_gives_ids, b_gives_ids, c_gives_ids, rollback_requested_by, rollback_requested_at'
    )
    .eq('id', tradeId)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!trade) return { success: false, error: 'Troca não encontrada ou já processada.' }

  const participants = [trade.user_a_id, trade.user_b_id, trade.user_c_id]
  if (!participants.includes(userId)) {
    return { success: false, error: 'Você não faz parte desta troca.' }
  }

  if (action === 'request') {
    if (trade.rollback_requested_by) {
      return { success: false, error: 'Desfazimento já solicitado.' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from('advanced_trades')
      .update({
        rollback_requested_by: userId,
        rollback_requested_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .eq('status', 'accepted')
    if (error) return { success: false, error: 'Erro ao solicitar desfazimento.' }
    ;(async () => {
      try {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, name')
          .in('id', participants)
        const nameMap = Object.fromEntries((users ?? []).map((u) => [u.id, formatName(u.name)]))
        for (const pid of participants) {
          const others = participants
            .filter((id) => id !== pid)
            .map((id) => nameMap[id] ?? 'Usuário')
          logAction(pid, 'advanced_trade_rollback_requested', {
            tradeId: trade.id,
            requestedBy: nameMap[userId] ?? 'Usuário',
            partners: others,
          })
        }
      } catch {
        /* best-effort */
      }
    })()

    return { success: true }
  }

  if (action === 'deny') {
    if (trade.rollback_requested_by === userId) {
      return { success: false, error: 'Você não pode negar sua própria solicitação.' }
    }
    if (!trade.rollback_requested_by) {
      return { success: false, error: 'Nenhuma solicitação pendente.' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from('advanced_trades')
      .update({ rollback_requested_by: null, rollback_requested_at: null })
      .eq('id', tradeId)
    if (error) return { success: false, error: 'Erro ao recusar desfazimento.' }
    ;(async () => {
      try {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, name')
          .in('id', participants)
        const nameMap = Object.fromEntries((users ?? []).map((u) => [u.id, formatName(u.name)]))
        for (const pid of participants) {
          const others = participants
            .filter((id) => id !== pid)
            .map((id) => nameMap[id] ?? 'Usuário')
          logAction(pid, 'advanced_trade_rollback_denied', {
            tradeId: trade.id,
            deniedBy: nameMap[userId] ?? 'Usuário',
            partners: others,
          })
        }
      } catch {
        /* best-effort */
      }
    })()

    return { success: true }
  }

  if (action === 'force') {
    if (!trade.rollback_requested_by) {
      return { success: false, error: 'Nenhuma solicitação de desfazimento pendente.' }
    }
    if (trade.rollback_requested_by !== userId) {
      return { success: false, error: 'Apenas quem solicitou o desfazimento pode forçá-lo.' }
    }
    const requestedAt = trade.rollback_requested_at
      ? new Date(trade.rollback_requested_at).getTime()
      : 0
    if (Date.now() - requestedAt < FORCE_UNDO_DELAY_MS) {
      return {
        success: false,
        error: 'Aguarde 7 dias após a solicitação para forçar o desfazimento.',
      }
    }
  }

  // action === 'confirm' or 'force' (after 7 days)
  if (!trade.rollback_requested_by) {
    return { success: false, error: 'Nenhuma solicitação de desfazimento pendente.' }
  }
  if (action === 'confirm' && trade.rollback_requested_by === userId) {
    return { success: false, error: 'Aguardando confirmação dos outros participantes.' }
  }

  // Atomic transition to rolled_back
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated } = await (supabaseAdmin as any)
    .from('advanced_trades')
    .update({ status: 'rolled_back' })
    .eq('id', tradeId)
    .eq('status', 'accepted')
    .select('id')
    .maybeSingle()

  if (!updated) return { success: false, error: 'Troca já foi processada em outro dispositivo.' }

  // Revert: A gave to B, B gave to C, C gave to A
  // Restore givers' dupes, remove from receivers' collections
  await Promise.all([
    restoreDupe(trade.user_a_id, trade.a_gives_ids),
    removeFromCollection(trade.user_b_id, trade.a_gives_ids),
    restoreDupe(trade.user_b_id, trade.b_gives_ids),
    removeFromCollection(trade.user_c_id, trade.b_gives_ids),
    restoreDupe(trade.user_c_id, trade.c_gives_ids),
    removeFromCollection(trade.user_a_id, trade.c_gives_ids),
  ])
  ;(async () => {
    try {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, name')
        .in('id', participants)
      const nameMap = Object.fromEntries((users ?? []).map((u) => [u.id, formatName(u.name)]))
      for (const pid of participants) {
        const others = participants.filter((id) => id !== pid).map((id) => nameMap[id] ?? 'Usuário')
        logAction(pid, 'advanced_trade_rolled_back', {
          tradeId: trade.id,
          partners: others,
          forced: action === 'force',
        })
      }
    } catch {
      /* best-effort */
    }
  })()

  return { success: true }
}
