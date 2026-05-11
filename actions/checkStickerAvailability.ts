'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { STICKER_SET } from '@/lib/stickers'
import { logAction } from './logAction'

export type StickerAvailabilityResult =
  | { status: 'invalid' }
  | { status: 'not_owned' }
  | { status: 'no_dupes' }
  | {
      status: 'available' | 'partial' | 'fully_reserved'
      dupeCount: number
      reservedCount: number
      availableCount: number
      pendingTrades: Array<{ tradeId: string; partnerName: string }>
    }

export async function checkStickerAvailability(
  userId: string,
  rawId: string
): Promise<StickerAvailabilityResult> {
  if (!userId) return { status: 'invalid' }

  const normalized = rawId.trim().toUpperCase()
  const stickerId = normalized === '00' ? 'FWC00' : normalized

  if (!STICKER_SET.has(stickerId)) return { status: 'invalid' }

  const [{ data: owned }, { data: dupe }, { data: trades }] = await Promise.all([
    supabaseAdmin
      .from('user_stickers')
      .select('id')
      .eq('user_id', userId)
      .eq('sticker_id', stickerId)
      .maybeSingle(),
    supabaseAdmin
      .from('user_duplicates')
      .select('count')
      .eq('user_id', userId)
      .eq('sticker_id', stickerId)
      .maybeSingle(),
    supabaseAdmin
      .from('pending_trades')
      .select('id, initiator_id, receiver_id, giving_ids, receiving_ids')
      .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'pending'),
  ])

  if (!owned) return { status: 'not_owned' }

  const dupeCount = dupe?.count ?? 0
  if (dupeCount === 0) return { status: 'no_dupes' }

  const matchingTrades = (trades ?? []).filter((t) => {
    const giving = t.initiator_id === userId ? t.giving_ids : t.receiving_ids
    return (giving ?? []).includes(stickerId)
  })

  const partnerIds = matchingTrades.map((t) =>
    t.initiator_id === userId ? t.receiver_id : t.initiator_id
  )

  const { data: partners } = partnerIds.length
    ? await supabaseAdmin.from('users').select('id, name').in('id', partnerIds)
    : { data: [] }

  const partnerMap = Object.fromEntries((partners ?? []).map((u) => [u.id, u.name]))

  const pendingTrades = matchingTrades.map((t) => {
    const partnerId = t.initiator_id === userId ? t.receiver_id : t.initiator_id
    return { tradeId: t.id, partnerName: partnerMap[partnerId] ?? 'Usuário' }
  })

  const reservedCount = matchingTrades.length
  const availableCount = dupeCount - reservedCount

  const status =
    reservedCount === 0 ? 'available' : availableCount > 0 ? 'partial' : 'fully_reserved'

  logAction(userId, 'sticker_lookup', { stickerId })

  return { status, dupeCount, reservedCount, availableCount, pendingTrades }
}
